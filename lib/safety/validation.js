import { z } from 'zod';
import { MODERATION_ACTION_TYPES, REPORT_PRIORITIES, REPORT_REASONS, REPORT_STATUSES } from '@/lib/types/safety';

export const blockSchema = z.object({
  blockedUserId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().min(5).max(5000),
  matchId: z.string().optional(),
  conversationId: z.string().optional(),
  autoBlock: z.boolean().optional().default(false),
});

export const adminReportQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  priority: z.enum(REPORT_PRIORITIES).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const adminPatchReportSchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  adminNotes: z.string().trim().max(5000).optional(),
});

export const adminModerationActionSchema = z.object({
  userId: z.string().min(1),
  reportId: z.string().optional(),
  actionType: z.enum(MODERATION_ACTION_TYPES),
  reason: z.string().trim().min(3).max(1000),
  notes: z.string().trim().max(5000).optional(),
});
