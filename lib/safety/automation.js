import Report from '@/lib/models/Report';
import ModerationAction from '@/lib/models/ModerationAction';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';
import User from '@/lib/models/User';

export function evaluateSafetyFlags(params) {
  const { report, recentReports } = params;
  const flags = new Set();

  const now = Date.now();
  const last7d = recentReports.filter(
    (r) => now - new Date(r.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
  );
  const last24h = recentReports.filter(
    (r) => now - new Date(r.createdAt).getTime() <= 24 * 60 * 60 * 1000
  );

  if (last7d.length >= 3) flags.add('repeated_reports');
  if (last24h.length >= 5) flags.add('rapid_report_spike');

  if (report.reason === 'underage') flags.add('underage_risk');
  if (report.reason === 'scam' && recentReports.filter((r) => r.reason === 'scam').length >= 2) flags.add('scam_risk');
  if (report.reason === 'harassment') flags.add('harassment_pattern');
  if (report.reason === 'hate_speech') flags.add('hate_speech_risk');
  if (report.reason === 'spam') flags.add('spam_pattern');

  if (report.priority === 'urgent' || ['underage', 'hate_speech', 'scam'].includes(report.reason)) {
    flags.add('high_severity_report');
  }

  const details = String(report.details || '').toLowerCase();
  if (/photo|image|nude|explicit/.test(details)) flags.add('image_risk');
  if (/bio|profile|about me|prompt/.test(details)) flags.add('profile_text_risk');
  if (/message|chat|texted|said/.test(details)) flags.add('message_text_risk');

  return Array.from(flags);
}

export function calculateRiskScore(params) {
  const { report, recentReports, flags } = params;

  let score = 0;
  const reasonWeights = {
    spam: 10,
    harassment: 20,
    scam: 25,
    hate_speech: 30,
    underage: 40,
    fake_profile: 14,
    inappropriate_content: 16,
    other: 8,
  };

  score += reasonWeights[report.reason] ?? 10;

  const now = Date.now();
  const last7d = recentReports.filter(
    (r) => now - new Date(r.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
  ).length;

  if (last7d >= 2) score += 10;
  if (last7d >= 4) score += 10;
  if (last7d >= 6) score += 5;

  const sameReasonCount = recentReports.filter((r) => r.reason === report.reason).length;
  if (sameReasonCount >= 2) score += 15;

  if (report.priority === 'urgent') score += 20;

  if (flags.includes('rapid_report_spike')) score += 10;
  if (flags.includes('high_severity_report')) score += 10;

  return Math.max(0, Math.min(100, score));
}

async function pushActionHistory(userId, entry) {
  await UserSafetyProfile.updateOne(
    { userId },
    {
      $push: { actionHistory: entry },
      $set: { lastActionAt: new Date() },
    }
  );
}

async function createAutomationAction(params) {
  const action = await ModerationAction.create({
    userId: params.userId,
    reportId: params.reportId,
    actionType: params.actionType,
    reason: params.reason,
    notes: params.notes || null,
    performedBy: 'system:automation',
    isAutomated: true,
  });

  await pushActionHistory(params.userId, {
    actionType: params.actionType,
    reason: params.reason,
    notes: params.notes || null,
    performedBy: 'system:automation',
    isAutomated: true,
    createdAt: action.createdAt,
  });

  return action;
}

export async function runModerationAutomation(reportId) {
  const report = await Report.findById(reportId).lean();
  if (!report) {
    return { ok: false, error: 'Report not found' };
  }

  const reportedUserId = String(report.reportedUserId);
  const profile =
    (await UserSafetyProfile.findOne({ userId: reportedUserId })) ||
    (await UserSafetyProfile.create({ userId: reportedUserId }));

  const recentReports = await Report.find({
    reportedUserId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })
    .select('_id reason priority reportedUserId createdAt details')
    .lean();

  const flags = evaluateSafetyFlags({
    report,
    reportedUserSafetyProfile: profile,
    recentReports,
  });

  const riskScore = calculateRiskScore({ report, recentReports, flags });

  let moderationStatus = profile.moderationStatus || 'clear';
  const actionsTaken = [];

  if (riskScore >= 25) {
    moderationStatus = 'flagged';
    actionsTaken.push('flagged');
    await createAutomationAction({
      userId: reportedUserId,
      reportId,
      actionType: 'auto_flag',
      reason: 'Risk score reached flagged threshold.',
      notes: `riskScore=${riskScore}`,
    });
  }

  if (riskScore >= 50) {
    moderationStatus = 'under_review';
    actionsTaken.push('under_review');
    await Report.updateOne({ _id: reportId }, { $set: { priority: 'urgent', status: 'in_review' } });
  }

  if (riskScore >= 70 || (report.reason === 'scam' && flags.includes('repeated_reports'))) {
    actionsTaken.push('hide_profile');
    await User.updateOne({ _id: reportedUserId }, { $set: { hidden: true } });
    await createAutomationAction({
      userId: reportedUserId,
      reportId,
      actionType: 'hide_profile',
      reason: 'Automation hid profile from discovery due to elevated risk.',
    });
  }

  if (riskScore >= 85) {
    moderationStatus = 'suspended';
    actionsTaken.push('suspended');
    await User.updateOne({ _id: reportedUserId }, { $set: { account_status: 'suspended', hidden: true } });
    await createAutomationAction({
      userId: reportedUserId,
      reportId,
      actionType: 'auto_suspend',
      reason: 'Automation suspended account pending admin review.',
      notes: `riskScore=${riskScore}`,
    });
  }

  if (report.reason === 'underage') {
    moderationStatus = riskScore >= 85 ? 'suspended' : 'under_review';
    actionsTaken.push('underage_escalation');
    await Report.updateOne({ _id: reportId }, { $set: { priority: 'urgent', status: 'in_review' } });

    if (moderationStatus === 'suspended') {
      await User.updateOne({ _id: reportedUserId }, { $set: { account_status: 'suspended', hidden: true } });
      await createAutomationAction({
        userId: reportedUserId,
        reportId,
        actionType: 'auto_suspend',
        reason: 'Underage report triggered immediate suspension.',
      });
    }
  }

  await UserSafetyProfile.updateOne(
    { userId: reportedUserId },
    {
      $set: {
        riskScore,
        flags,
        moderationStatus,
        lastActionAt: new Date(),
      },
    }
  );

  return {
    ok: true,
    summary: {
      reportId,
      reportedUserId,
      riskScore,
      flags,
      moderationStatus,
      actionsTaken,
    },
  };
}
