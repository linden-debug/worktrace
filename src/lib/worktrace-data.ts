import type { createDatabase } from './db';

type WorkTraceDatabase = ReturnType<typeof createDatabase>;

export type WorkTraceLog = {
  id: string;
  title: string;
  completed: string[];
  inProgress: string;
  blockers: string;
  nextPlan: string;
  createdAt: string;
  updatedAt?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
};

export type OverviewPeriod = 'today' | 'week' | 'month';
export type LogDateRange = 'all' | OverviewPeriod;
export type WorkLogMarkdownBlock = { type: 'paragraph'; text: string } | { type: 'unordered-list' | 'ordered-list'; items: string[] };

export function parseWorkLogMarkdown(value: string): WorkLogMarkdownBlock[] {
  const blocks: WorkLogMarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: Extract<WorkLogMarkdownBlock, { items: string[] }> | undefined;
  const flushParagraph = () => { if (paragraph.length) { blocks.push({ type: 'paragraph', text: paragraph.join('\n') }); paragraph = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = undefined; } };

  for (const line of value.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) { flushParagraph(); flushList(); continue; }
    const unordered = text.match(/^[-*+]\s+(.+)$/);
    const ordered = text.match(/^\d+[.)]\s+(.+)$/);
    const type = unordered ? 'unordered-list' : ordered ? 'ordered-list' : undefined;
    const item = unordered?.[1] ?? ordered?.[1];
    if (type && item) {
      flushParagraph();
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(text);
  }
  flushParagraph(); flushList();
  return blocks;
}

export function filterLogs(logs: WorkTraceLog[], options: { query?: string; memberId?: string; dateRange?: LogDateRange; now?: Date }) {
  const byMember = options.memberId && options.memberId !== 'all'
    ? logs.filter((log) => log.authorId === options.memberId)
    : logs;
  const byDate = options.dateRange && options.dateRange !== 'all'
    ? filterLogsByPeriod(byMember, options.dateRange, options.now)
    : byMember;
  return filterLogsByQuery(byDate, options.query ?? '');
}

export function filterLogsByQuery(logs: WorkTraceLog[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return logs;

  return logs.filter((log) =>
    [
      log.title,
      log.completed.join(' '),
      log.inProgress,
      log.blockers,
      log.nextPlan,
      log.authorName,
      log.authorEmail,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export function filterLogsByPeriod(logs: WorkTraceLog[], period: OverviewPeriod, now = new Date()): WorkTraceLog[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  }
  if (period === 'month') start.setDate(1);

  return logs.filter((log) => new Date(log.createdAt) >= start);
}

function toLogViews(database: WorkTraceDatabase) {
  const users = new Map(database.listUsers().map((user) => [user.id, user]));
  return database.listWorkLogs().map<WorkTraceLog>((log) => {
    const author = users.get(log.authorId);
    return {
      ...log,
      authorName: author?.name ?? '未知成员',
      authorEmail: author?.email ?? 'unknown@example.com',
    };
  });
}

export function loadConsoleData(database: WorkTraceDatabase, currentUserId: string, period?: OverviewPeriod) {
  const logs = toLogViews(database);
  const users = database.listUsers();
  const overviewLogs = period ? filterLogsByPeriod(logs, period) : logs;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const submittedToday = overviewLogs.filter((log) => log.createdAt.slice(0, 10) === today);
  const activeSubmitters = new Set(overviewLogs.map((log) => log.authorId)).size;
  const rankings = [...overviewLogs.reduce((totals, log) => {
    totals.set(log.authorId, (totals.get(log.authorId) ?? 0) + 1);
    return totals;
  }, new Map<string, number>())].map(([authorId, total]) => {
    const log = overviewLogs.find((entry) => entry.authorId === authorId)!;
    return { authorId, name: log.authorName, email: log.authorEmail, total };
  }).sort((a, b) => b.total - a.total || a.email.localeCompare(b.email));

  return {
    logs,
    myLogs: logs.filter((log) => log.authorId === currentUserId),
    overview: {
      totalLogs: overviewLogs.length,
      activeSubmitters,
      submittedToday: submittedToday.length,
      lastSubmittedAt: overviewLogs[0]?.updatedAt ?? overviewLogs[0]?.createdAt ?? null,
      recentLogs: logs.filter((log) => new Date(log.createdAt) >= twoDaysAgo),
      rankings,
      memberSubmissionStatus: users.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        submittedToday: logs.some((log) => log.authorId === member.id && log.createdAt.slice(0, 10) === today),
      })),
    },
  };
}
