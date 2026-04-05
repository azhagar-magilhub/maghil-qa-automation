import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import { buildTestCasePrompt } from './generators/test-case.generator';
import {
  buildPlaywrightPrompt,
  buildAppiumPrompt,
  buildApiTestPrompt,
} from './generators/script.generator';
import {
  buildReleaseNotesPrompt,
  buildGherkinPrompt,
} from './generators/release-notes.generator';
import axios from 'axios';

interface TestCaseInput {
  source: 'jira_story' | 'api_spec';
  content: string;
  detailLevel: string;
}

interface PlaywrightInput {
  testCase?: string;
  url?: string;
  description?: string;
  language?: string;
}

interface AppiumInput {
  testCase: string;
  platform: string;
  language?: string;
}

interface ApiScriptInput {
  spec?: string;
  description?: string;
  language?: string;
}

interface ReleaseNotesInput {
  tickets: Array<{ key: string; summary: string; type: string; labels?: string[] }>;
  template?: string;
  format?: string;
}

interface GherkinInput {
  requirement: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  private get provider(): string {
    return process.env.AI_PROVIDER || 'claude';
  }

  private get model(): string {
    return (
      process.env.AI_MODEL ||
      (this.provider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o')
    );
  }

  async generateTestCases(
    userId: string,
    input: TestCaseInput,
  ): Promise<{ testCases: Array<Record<string, unknown>> }> {
    const { system, user } = buildTestCasePrompt(
      input.source,
      input.content,
      input.detailLevel,
    );

    const response = await this.callAI(user, system);

    let parsed: { testCases: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = { testCases: [] };
      this.logger.warn('Failed to parse AI test case response as JSON');
    }

    // Store generation record
    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'test-cases',
      input: { source: input.source, detailLevel: input.detailLevel },
      output: parsed,
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return parsed;
  }

  async generatePlaywrightScript(
    userId: string,
    input: PlaywrightInput,
  ): Promise<{ script: string }> {
    const { system, user } = buildPlaywrightPrompt(input);
    const script = await this.callAI(user, system);

    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'playwright-script',
      input,
      output: { script },
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return { script };
  }

  async generateAppiumScript(
    userId: string,
    input: AppiumInput,
  ): Promise<{ script: string }> {
    const { system, user } = buildAppiumPrompt(input);
    const script = await this.callAI(user, system);

    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'appium-script',
      input,
      output: { script },
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return { script };
  }

  async generateApiScript(
    userId: string,
    input: ApiScriptInput,
  ): Promise<{ script: string }> {
    const { system, user } = buildApiTestPrompt(input);
    const script = await this.callAI(user, system);

    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'api-script',
      input,
      output: { script },
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return { script };
  }

  async generateReleaseNotes(
    userId: string,
    input: ReleaseNotesInput,
  ): Promise<Record<string, unknown>> {
    const { system, user } = buildReleaseNotesPrompt(input);
    const response = await this.callAI(user, system);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = { formattedOutput: response };
      this.logger.warn('Failed to parse AI release notes response as JSON');
    }

    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'release-notes',
      input: { ticketCount: input.tickets.length, format: input.format },
      output: parsed,
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return parsed;
  }

  async generateGherkin(
    userId: string,
    input: GherkinInput,
  ): Promise<{ feature: string }> {
    const { system, user } = buildGherkinPrompt(input.requirement);
    const feature = await this.callAI(user, system);

    const genRef = this.db.collection(`users/${userId}/aiGenerations`).doc();
    await genRef.set({
      type: 'gherkin',
      input,
      output: { feature },
      model: this.model,
      provider: this.provider,
      createdAt: new Date(),
    });

    return { feature };
  }

  async callAI(prompt: string, systemPrompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt, systemPrompt);
    }
    return this.callClaude(prompt, systemPrompt);
  }

  private async callClaude(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      },
    );

    const content = response.data?.content;
    if (Array.isArray(content) && content.length > 0) {
      return content[0].text;
    }
    return '';
  }

  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }
}
