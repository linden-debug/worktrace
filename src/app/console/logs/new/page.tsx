import Link from 'next/link';
import { createWorkLog } from '@/app/actions/work-logs';
import { ConsolePageFrame } from '@/components/console-page-frame';

export default function NewLogPage() {
  return <ConsolePageFrame title="新建日志" activePath="/console/logs/new"><p className="wt-description">提交后将立即对团队成员可见。</p><form className="wt-panel wt-form" action={createWorkLog}><div className="wt-form-grid"><label><span>日报日期</span><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} readOnly /></label><label><span>标题</span><input name="title" required placeholder="例如：WorkTrace API 接入进展" /></label></div><label className="wt-field"><span>完成事项</span><textarea name="completed" required rows={5} placeholder="每行填写一项已完成的工作、产出或结果。" /></label><label className="wt-field"><span>进行中</span><textarea name="inProgress" rows={4} placeholder="每行一项，例如：跟进接口联调" /></label><label className="wt-field"><span>阻塞 / 风险</span><textarea name="blockers" rows={3} placeholder="每行一项，例如：等待权限开通" /></label><label className="wt-field"><span>明日计划</span><textarea name="nextPlan" rows={3} placeholder="每行一项，例如：完成回归测试" /></label><div className="wt-form-actions"><Link className="wt-secondary-button" href="/console/logs">取消</Link><button className="wt-primary-button" type="submit">发布工作日志</button></div></form></ConsolePageFrame>;
}
