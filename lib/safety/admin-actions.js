import Report from '@/lib/models/Report';
import User from '@/lib/models/User';
import ModerationAction from '@/lib/models/ModerationAction';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';

export async function executeAdminModerationAction(params) {
  const { userId, reportId, actionType, reason, notes, performedBy } = params;

  const updateUser = {};
  const updateSafety = { lastActionAt: new Date() };
  const reportPatch = {};

  switch (actionType) {
    case 'warn':
      updateSafety.moderationStatus = 'flagged';
      break;
    case 'hide_profile':
      updateUser.hidden = true;
      updateSafety.moderationStatus = 'under_review';
      break;
    case 'suspend':
      updateUser.account_status = 'suspended';
      updateUser.hidden = true;
      updateSafety.moderationStatus = 'suspended';
      break;
    case 'ban':
      updateUser.account_status = 'banned';
      updateUser.hidden = true;
      updateSafety.moderationStatus = 'banned';
      break;
    case 'dismiss_report':
      reportPatch.status = 'dismissed';
      break;
    case 'mark_safe':
      updateUser.hidden = false;
      updateUser.account_status = 'active';
      updateSafety.moderationStatus = 'clear';
      updateSafety.flags = [];
      updateSafety.riskScore = 0;
      reportPatch.status = 'resolved';
      break;
    default:
      break;
  }

  if (Object.keys(updateUser).length) {
    await User.updateOne({ _id: userId }, { $set: updateUser });
  }

  await UserSafetyProfile.updateOne(
    { userId },
    {
      $setOnInsert: { userId },
      $set: updateSafety,
      $push: {
        actionHistory: {
          actionType,
          reason,
          notes: notes || null,
          performedBy,
          isAutomated: false,
          createdAt: new Date(),
        },
      },
    },
    { upsert: true }
  );

  if (reportId && Object.keys(reportPatch).length) {
    await Report.updateOne({ _id: reportId }, { $set: reportPatch });
  }

  const action = await ModerationAction.create({
    userId,
    reportId: reportId || null,
    actionType,
    reason,
    notes: notes || null,
    performedBy,
    isAutomated: false,
  });

  return action;
}
