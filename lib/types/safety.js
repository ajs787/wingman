export const REPORT_REASONS = [
  'harassment',
  'spam',
  'fake_profile',
  'inappropriate_content',
  'underage',
  'hate_speech',
  'scam',
  'other',
];

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'];
export const REPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const MODERATION_STATUSES = ['clear', 'flagged', 'under_review', 'suspended', 'banned'];

export const MODERATION_ACTION_TYPES = [
  'warn',
  'hide_profile',
  'suspend',
  'ban',
  'dismiss_report',
  'mark_safe',
  'auto_flag',
  'auto_suspend',
];
