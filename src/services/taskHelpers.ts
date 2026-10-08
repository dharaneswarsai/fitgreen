// ===========================================================
// Task status helpers
//
// OVERDUE is never stored on the record. It is derived from
// PENDING + a past due date at read time, so a task can never
// be left stranded in an "overdue" state after its due date
// moves, and completing a task cannot disagree with its label.
//
// Lives apart from metrics.ts so the data rules can be imported
// by services without pulling in the aggregation layer.
// ===========================================================

import type { FollowUpTask, TaskEffectiveStatus } from '@/types';

export function effectiveTaskStatus(
  task: FollowUpTask,
  now: Date = new Date(),
): TaskEffectiveStatus {
  if (task.status === 'COMPLETED') return 'COMPLETED';
  return new Date(task.dueAt).getTime() < now.getTime() ? 'OVERDUE' : 'PENDING';
}

export function isEffectiveOverdue(task: FollowUpTask, now: Date = new Date()): boolean {
  return effectiveTaskStatus(task, now) === 'OVERDUE';
}

export function isEffectivePending(task: FollowUpTask, now: Date = new Date()): boolean {
  return effectiveTaskStatus(task, now) === 'PENDING';
}
