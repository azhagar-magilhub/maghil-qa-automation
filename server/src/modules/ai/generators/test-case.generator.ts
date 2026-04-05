export function buildTestCasePrompt(
  source: 'jira_story' | 'api_spec',
  content: string,
  detailLevel: string,
): { system: string; user: string } {
  const system = `You are a senior QA engineer specializing in test case design. You generate thorough, well-structured test cases from requirements. Output valid JSON only.`;

  const detailInstructions =
    detailLevel === 'detailed'
      ? 'Include comprehensive steps with detailed preconditions, edge cases, and negative scenarios.'
      : detailLevel === 'brief'
        ? 'Keep test cases concise with minimal steps focusing on happy paths.'
        : 'Include moderate detail with key positive and negative scenarios.';

  let user: string;

  if (source === 'jira_story') {
    user = `Analyze the following Jira story and generate test cases.

${detailInstructions}

Jira Story:
${content}

Respond with a JSON object in this exact format:
{
  "testCases": [
    {
      "title": "string",
      "preconditions": "string",
      "steps": ["step1", "step2"],
      "expectedResults": ["result1", "result2"],
      "priority": "critical" | "high" | "medium" | "low",
      "type": "functional" | "negative" | "boundary" | "integration" | "regression"
    }
  ]
}`;
  } else {
    user = `Analyze the following API specification and generate test cases covering all endpoints, status codes, and edge cases.

${detailInstructions}

API Specification:
${content}

Respond with a JSON object in this exact format:
{
  "testCases": [
    {
      "title": "string",
      "preconditions": "string",
      "steps": ["step1", "step2"],
      "expectedResults": ["result1", "result2"],
      "priority": "critical" | "high" | "medium" | "low",
      "type": "functional" | "negative" | "boundary" | "integration" | "regression"
    }
  ]
}`;
  }

  return { system, user };
}
