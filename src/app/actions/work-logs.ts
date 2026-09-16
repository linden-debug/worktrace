'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createDatabase } from '@/lib/db';
import { normalizeWorkLogSection } from '@/lib/agent-work-logs';
import { resolveReportDate } from '@/lib/report-date';

export async function createWorkLog(formData: FormData) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect('/');

  const title = String(formData.get('title') ?? '').trim();
  const completed = String(formData.get('completed') ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
  if (!title || !completed.length) redirect('/console/logs/new?error=required');
  let reportDate: string;
  try { reportDate = resolveReportDate(String(formData.get('reportDate') ?? '')); }
  catch { redirect('/console/logs/new?error=date'); }

  const database = createDatabase();
  try {
    database.upsertDailyWorkLog(user.id, { reportDate, title, completed, inProgress: normalizeWorkLogSection(String(formData.get('inProgress') ?? '')), blockers: normalizeWorkLogSection(String(formData.get('blockers') ?? '')), nextPlan: normalizeWorkLogSection(String(formData.get('nextPlan') ?? '')) });
  } finally { database.close(); }
  redirect('/console/my-logs?created=1');
}

function logInput(formData: FormData) {
  return { title: String(formData.get('title') ?? '').trim(), completed: String(formData.get('completed') ?? '').split('\n').map((item) => item.trim()).filter(Boolean), inProgress: normalizeWorkLogSection(String(formData.get('inProgress') ?? '')), blockers: normalizeWorkLogSection(String(formData.get('blockers') ?? '')), nextPlan: normalizeWorkLogSection(String(formData.get('nextPlan') ?? '')) };
}

export async function updateWorkLog(formData: FormData) {
  const user = (await auth())?.user; const id = String(formData.get('id') ?? ''); const input = logInput(formData);
  if (!user?.id || !user.role || !id || !input.title || !input.completed.length) redirect('/console');
  const database = createDatabase();
  try { database.updateWorkLog(id, user.id, user.role, input); } finally { database.close(); }
  const from = formData.get('from') === 'my' ? '?from=my' : formData.get('from') === 'admin' ? '?from=admin' : '';
  redirect(`/console/logs/${id}${from}`);
}

export async function deleteWorkLog(formData: FormData) {
  const user = (await auth())?.user; const id = String(formData.get('id') ?? '');
  if (!user?.id || !user.role || !id) redirect('/console');
  const database = createDatabase();
  try { database.deleteWorkLog(id, user.id, user.role); } finally { database.close(); }
  redirect(formData.get('returnTo') === 'admin' ? '/console/admin/logs' : '/console/my-logs');
}
