import { z } from 'zod';
import type { LocalUser, WorkLogInput } from './db';

const text = z.string().trim().max(10_000);
export const workLogSectionInputSchema = z.union([text, z.array(text.min(1)).min(1).max(100)]);

export function normalizeWorkLogSection(value: z.input<typeof workLogSectionInputSchema> | undefined): string {
  const entries = (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((entry) => entry.split(/\r?\n|；/))
    .map((entry) => entry.trim().replace(/^([-*+]|\d+[.)])\s+/, ''))
    .filter(Boolean);
  return entries.map((entry) => `- ${entry}`).join('\n');
}

const optionalWorkLogSection = workLogSectionInputSchema.optional().transform(normalizeWorkLogSection);
export const agentWorkLogSchema = z.object({
  title: text.min(1).max(140),
  completed: z.array(text.min(1)).min(1).max(100),
  inProgress: optionalWorkLogSection,
  blockers: optionalWorkLogSection,
  nextPlan: optionalWorkLogSection,
});

export function validateAgentWorkLog(input: unknown) {
  return agentWorkLogSchema.safeParse(input);
}

type DailyDatabase = {
  listUsers(): LocalUser[];
  queryWorkLogs(options: { from?: string; to?: string; limit?: number }): { items: Array<{ id: string; authorId: string }> };
};

function dayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD');
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function dailySubmissionStatus(database: DailyDatabase, date = shanghaiDate(), _now = new Date()) {
  const logs = database.queryWorkLogs({ ...dayRange(date), limit: 50 }).items;
  const byMember = new Map<string, string[]>();
  for (const log of logs) byMember.set(log.authorId, [...(byMember.get(log.authorId) ?? []), log.id]);
  return { date, timezone: 'Asia/Shanghai', members: database.listUsers().map((member) => {
    const logIds = byMember.get(member.id) ?? [];
    return { id: member.id, name: member.name, email: member.email, submitted: logIds.length > 0, count: logIds.length, logIds };
  }) };
}

export type AgentWorkLogInput = z.infer<typeof agentWorkLogSchema> & WorkLogInput;
