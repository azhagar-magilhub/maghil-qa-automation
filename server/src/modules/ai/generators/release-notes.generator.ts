export function buildReleaseNotesPrompt(input: {
  tickets: Array<{ key: string; summary: string; type: string; labels?: string[] }>;
  template?: string;
  format?: string;
}): { system: string; user: string } {
  const format = input.format || 'markdown';
  const system = `You are a technical writer who creates clear, user-friendly release notes. Categorize changes and write concise summaries that non-technical stakeholders can understand. Output valid JSON only.`;

  const ticketList = input.tickets
    .map((t) => `- [${t.key}] (${t.type}) ${t.summary}${t.labels?.length ? ` [${t.labels.join(', ')}]` : ''}`)
    .join('\n');

  const templateInstructions = input.template
    ? `Follow this template style:\n${input.template}\n\n`
    : '';

  const user = `${templateInstructions}Analyze the following tickets and generate release notes in ${format} format.

Tickets:
${ticketList}

Categorize each ticket into one of these categories:
- features: New functionality
- improvements: Enhancements to existing features
- bugFixes: Bug fixes
- breaking: Breaking changes
- known: Known issues

Respond with a JSON object in this exact format:
{
  "version": "auto-detected or placeholder",
  "date": "${new Date().toISOString().split('T')[0]}",
  "summary": "Brief overall summary",
  "categories": {
    "features": [{ "key": "TICKET-1", "summary": "User-friendly description" }],
    "improvements": [{ "key": "TICKET-2", "summary": "User-friendly description" }],
    "bugFixes": [{ "key": "TICKET-3", "summary": "User-friendly description" }],
    "breaking": [{ "key": "TICKET-4", "summary": "User-friendly description" }],
    "known": [{ "key": "TICKET-5", "summary": "User-friendly description" }]
  },
  "formattedOutput": "The full release notes in ${format} format"
}`;

  return { system, user };
}

export function buildGherkinPrompt(requirement: string): {
  system: string;
  user: string;
} {
  const system = `You are a BDD expert. Generate well-structured Gherkin feature files from requirements. Use clear Given/When/Then syntax with comprehensive scenarios including edge cases. Output only the .feature file content.`;

  const user = `Convert the following requirement into a Gherkin feature file:

Requirement:
${requirement}

Requirements for the output:
- Include Feature description
- Include Background if common preconditions exist
- Cover happy path scenarios
- Cover negative/edge case scenarios
- Use Scenario Outline with Examples for parameterized tests where appropriate
- Use proper Given/When/Then/And/But keywords
- Include meaningful tags (@smoke, @regression, etc.)

Output only the .feature file content, no markdown fences.`;

  return { system, user };
}
