import Link from 'next/link';
import { updateWorkLog } from '@/app/actions/work-logs';
import { ConsolePageFrame } from '@/components/console-page-frame';
import { createDatabase } from '@/lib/db';
import { currentConsoleUser } from '@/lib/session';

export default async function EditLogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const from = (await searchParams).from === 'my' ? 'my' : (await searchParams).from === 'admin' ? 'admin' : 'all';
  const user = await currentConsoleUser();
  if (!user) return null;
  const database = createDatabase(); const log = database.getWorkLog(id); database.close();
  if (!log || (log.authorId !== user.id && user.role !== 'ADMIN')) return <ConsolePageFrame title="编辑日志" activePath="/console/logs"><p className="wt-description">您无权编辑该日志，或日志不存在。</p></ConsolePageFrame>;
  const suffix = from === 'all' ? '' : `?from=${from}`;
  return <ConsolePageFrame title="编辑日志" activePath={from === 'my' ? '/console/my-logs' : from === 'admin' ? '/console/admin/logs' : '/console/logs'}><form className="wt-panel wt-form" action={updateWorkLog}><input type="hidden" name="id" value={log.id} /><input type="hidden" name="from" value={from} /><label><span>标题</span><input name="title" required defaultValue={log.title} /></label><label className="wt-field"><span>完成事项</span><textarea name="completed" required rows={5} defaultValue={log.completed.join('\n')} /></label><label className="wt-field"><span>进行中</span><textarea name="inProgress" rows={4} defaultValue={log.inProgress} placeholder="每行一项" /></label><label className="wt-field"><span>阻塞 / 风险</span><textarea name="blockers" rows={3} defaultValue={log.blockers} placeholder="每行一项" /></label><label className="wt-field"><span>明日计划</span><textarea name="nextPlan" rows={3} defaultValue={log.nextPlan} placeholder="每行一项" /></label><div className="wt-form-actions"><Link className="wt-secondary-button" href={`/console/logs/${log.id}${suffix}`}>取消</Link><button className="wt-primary-button" type="submit">保存修改</button></div></form></ConsolePageFrame>;
}
