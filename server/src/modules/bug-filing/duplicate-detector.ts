export interface DuplicateSearchOptions {
  summary: string;
  projectKey?: string;
  testType?: string;
  maxResults?: number;
}

export function buildDuplicateJql(options: DuplicateSearchOptions): string {
  const conditions: string[] = [];

  // Search for open bugs only
  conditions.push('issuetype = Bug');
  conditions.push('status not in (Done, Closed, Resolved)');

  // Project filter
  if (options.projectKey) {
    conditions.push(`project = "${options.projectKey}"`);
  }

  // Summary similarity search using Jira text search
  const sanitizedSummary = sanitizeForJql(options.summary);
  conditions.push(`summary ~ "${sanitizedSummary}"`);

  // Label filter for auto-filed bugs
  conditions.push('labels = "auto-filed"');

  // Test type label filter
  if (options.testType) {
    conditions.push(`labels = "${options.testType}"`);
  }

  const jql = conditions.join(' AND ');
  return jql;
}

export function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;

  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));

  let intersection = 0;
  for (const word of aWords) {
    if (bWords.has(word)) intersection++;
  }

  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

function sanitizeForJql(text: string): string {
  // Remove special JQL characters and keep meaningful words
  return text
    .replace(/[\\\"\']/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10) // Limit to first 10 words for JQL search
    .join(' ');
}
