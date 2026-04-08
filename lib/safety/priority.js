const HIGH_SEVERITY = new Set(['hate_speech', 'scam', 'harassment']);

export function getInitialPriority(params) {
  const { reason, priorRecentCount, repeatedReasonCount, details } = params;
  const text = details.toLowerCase();

  const hasThreatLanguage = /kill|murder|hurt|rape|assault|bomb|shoot/.test(text);

  if (reason === 'underage' || hasThreatLanguage || priorRecentCount >= 6) {
    return 'urgent';
  }

  if (HIGH_SEVERITY.has(reason) || repeatedReasonCount >= 2 || priorRecentCount >= 4) {
    return 'high';
  }

  if (reason === 'inappropriate_content' || reason === 'fake_profile') {
    return 'medium';
  }

  return 'low';
}
