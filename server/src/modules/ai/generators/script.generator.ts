export function buildPlaywrightPrompt(input: {
  testCase?: string;
  url?: string;
  description?: string;
  language?: string;
}): { system: string; user: string } {
  const lang = input.language || 'typescript';
  const system = `You are an expert test automation engineer. Generate production-ready Playwright test scripts in ${lang}. Use best practices including proper selectors, waits, and assertions. Output only the script code.`;

  const context = input.testCase
    ? `Test Case:\n${input.testCase}`
    : `URL: ${input.url}\nDescription: ${input.description}`;

  const user = `Generate a Playwright test script for the following:

${context}

Requirements:
- Use ${lang} syntax
- Include proper imports
- Use page object model pattern where appropriate
- Add meaningful assertions
- Handle dynamic content with proper waits
- Include comments explaining key steps

Output only the script code, no markdown fences.`;

  return { system, user };
}

export function buildAppiumPrompt(input: {
  testCase: string;
  platform: string;
  language?: string;
}): { system: string; user: string } {
  const lang = input.language || 'javascript';
  const system = `You are an expert mobile test automation engineer. Generate production-ready Appium/WebDriverIO test scripts for ${input.platform} in ${lang}. Output only the script code.`;

  const user = `Generate an Appium/WebDriverIO test script for the following:

Platform: ${input.platform}
Test Case:
${input.testCase}

Requirements:
- Use ${lang} syntax
- Include proper capability configuration for ${input.platform}
- Use reliable mobile selectors (accessibility id, xpath as fallback)
- Handle mobile-specific gestures where needed
- Add meaningful assertions
- Include proper waits for element visibility

Output only the script code, no markdown fences.`;

  return { system, user };
}

export function buildApiTestPrompt(input: {
  spec?: string;
  description?: string;
  language?: string;
}): { system: string; user: string } {
  const lang = input.language || 'typescript';
  const system = `You are an expert API test automation engineer. Generate production-ready API test scripts in ${lang}. Output only the script code.`;

  const context = input.spec
    ? `API Specification:\n${input.spec}`
    : `Description:\n${input.description}`;

  const user = `Generate an API test script for the following:

${context}

Requirements:
- Use ${lang} syntax
- Include proper imports (axios or fetch based)
- Test all relevant HTTP methods and status codes
- Validate response schemas
- Include error handling tests
- Add authentication headers where appropriate
- Include comments explaining key assertions

Output only the script code, no markdown fences.`;

  return { system, user };
}
