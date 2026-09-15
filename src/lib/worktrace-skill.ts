export function workTraceSkillMarkdown(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  return `# WorkTrace Skill

Use WorkTrace to record, search, and review team work logs.

## Configuration

Configure the WorkTrace MCP server at \`${normalized}/mcp\`. Store the user's API key only in \`WORKTRACE_API_KEY\`; never place it in a chat message or a work-log field.

## Create a log

When the user provides raw work notes, summarize them into \`title\`, \`completed\`, \`inProgress\`, \`blockers\`, and \`nextPlan\`. \`title\` and a non-empty \`completed\` list are required. When present, \`inProgress\`, \`blockers\`, and \`nextPlan\` must each be arrays of concise items, never a semicolon-separated paragraph. Do not invent optional fields. Show the draft and ask the user to confirm before calling \`create_work_log\`.

## Read logs

Use \`list_work_logs\` for filtered team summaries, \`get_work_log\` for details, and \`get_daily_submission_status\` to report submitted and missing members using Asia/Shanghai dates.
`;
}
