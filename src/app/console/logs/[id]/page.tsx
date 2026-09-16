import Link from 'next/link';
import { deleteWorkLog } from '@/app/actions/work-logs';
import { ConsolePageFrame } from '@/components/console-page-frame';
import { WorkLogMarkdown } from '@/components/work-log-markdown';
import { createDatabase } from '@/lib/db';
import { currentConsoleUser } from '@/lib/session';
import { formatWorkTraceDateTime } from '@/lib/time';
import { loadConsoleData } from '@/lib/worktrace-data';

export default async function LogDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const from = (await searchParams).from === 'my' ? 'my' : (await searchParams).from === 'admin' ? 'admin' : 'all';
  const user = await currentConsoleUser(); if (!user) return null;
  const database = createDatabase(); const { logs } = loadConsoleData(database, user.id);
  const log = logs.find((item) => item.id === id);
  const attachments = log ? database.listWorkLogAttachments(log.id) : [];
  database.close();
  const canModify = log && (log.authorId === user.id || user.role === 'ADMIN');
  if (!log) return <ConsolePageFrame title="工作日志详情" activePath={from === 'my' ? '/console/my-logs' : from === 'admin' ? '/console/admin/logs' : '/console/logs'}><p className="wt-description">未找到该工作日志。</p></ConsolePageFrame>;
  const backHref = from === 'my' ? '/console/my-logs' : from === 'admin' ? '/console/admin/logs' : '/console/logs';
  const backLabel = from === 'my' ? '返回我的日志' : from === 'admin' ? '返回日志管理' : '返回全部日志';
  const suffix = from === 'all' ? '' : `?from=${from}`;
  return <ConsolePageFrame title="工作日志详情" activePath={from === 'my' ? '/console/my-logs' : from === 'admin' ? '/console/admin/logs' : '/console/logs'}>
    <div className="wt-detail-actions"><Link href={backHref}>← {backLabel}</Link>{canModify && <div className="wt-detail-owner-actions"><Link className="wt-secondary-button" href={`/console/logs/${log.id}/edit${suffix}`}>编辑日志</Link><form action={deleteWorkLog}><input type="hidden" name="id" value={log.id} /><input type="hidden" name="returnTo" value={from === 'admin' ? 'admin' : 'my'} /><button className="wt-danger-button" type="submit">删除日志</button></form></div>}</div><article className="wt-panel wt-log-detail"><header><span className="wt-source">Web</span><h2>{log.title}</h2><p>{log.authorName} · {log.authorEmail} · 日报日期：{log.reportDate?.replaceAll('-', '/') ?? formatWorkTraceDateTime(log.createdAt, 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })} · 最后提交：{formatWorkTraceDateTime(log.updatedAt ?? log.createdAt, 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</p></header><section><h3>完成事项</h3><ul>{log.completed.map((item) => <li key={item}>{item}</li>)}</ul></section>{log.inProgress && <section><h3>进行中</h3><WorkLogMarkdown value={log.inProgress} /></section>}{log.blockers && <section><h3>阻塞 / 风险</h3><WorkLogMarkdown value={log.blockers} /></section>}{log.nextPlan && <section><h3>明日计划</h3><WorkLogMarkdown value={log.nextPlan} /></section>}{attachments.length > 0 && <section><h3>图片附件</h3><div className="wt-attachment-grid">{attachments.map((attachment) => <a key={attachment.id} href={`/api/v1/work-logs/${log.id}/attachments/${attachment.id}`} target="_blank" rel="noreferrer"><img src={`/api/v1/work-logs/${log.id}/attachments/${attachment.id}`} alt={attachment.filename} /><span>{attachment.filename}</span></a>)}</div></section>}</article>
  </ConsolePageFrame>;
}
