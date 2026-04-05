import { Injectable, Logger } from '@nestjs/common';
import { JiraService } from '../jira/jira.service';
import { IntegrationService } from '../integration/integration.service';
import { IntegrationType } from '../integration/dto/save-integration.dto';
import { buildDuplicateJql, calculateSimilarity } from './duplicate-detector';
import axios from 'axios';

export interface FailureData {
  testName: string;
  testType: string;
  errorMessage: string;
  stackTrace?: string;
  screenshotUrl?: string;
  requestData?: unknown;
  responseData?: unknown;
  environment: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  projectKey: string;
  module?: string;
}

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  CRITICAL: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

@Injectable()
export class BugFilingService {
  private readonly logger = new Logger(BugFilingService.name);

  constructor(
    private readonly jiraService: JiraService,
    private readonly integrationService: IntegrationService,
  ) {}

  async autoFileBug(
    userId: string,
    failureData: FailureData,
  ): Promise<{ jiraKey: string; jiraUrl: string }> {
    const config = await this.integrationService.getDecryptedConfig(userId, IntegrationType.JIRA);

    const summary = `[Auto] ${failureData.testType}: ${failureData.testName} - ${failureData.errorMessage.substring(0, 100)}`;
    const description = this.buildDescription(failureData);
    const labels = this.buildLabels(failureData);

    // Get the priority ID matching the severity
    const priorities = await this.jiraService.getPriorities(userId);
    const targetPriority = SEVERITY_TO_PRIORITY[failureData.severity] || 'Medium';
    const priority = priorities.find(
      (p: { id: string; name: string }) => p.name === targetPriority,
    );

    const issueData: Record<string, unknown> = {
      project: { key: failureData.projectKey },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: description }],
          },
        ],
      },
      issuetype: { name: 'Bug' },
      labels,
    };

    if (priority) {
      issueData.priority = { id: priority.id };
    }

    const result = await this.jiraService.createIssue(userId, issueData);

    this.logger.log(`Auto-filed bug ${result.key} for test: ${failureData.testName}`);

    return {
      jiraKey: result.key,
      jiraUrl: `${config.baseUrl}/browse/${result.key}`,
    };
  }

  async checkDuplicate(
    userId: string,
    summary: string,
    projectKey?: string,
  ): Promise<{ isDuplicate: boolean; existingKey?: string; existingUrl?: string; similarity?: number }> {
    const config = await this.integrationService.getDecryptedConfig(userId, IntegrationType.JIRA);

    const jql = buildDuplicateJql({ summary, projectKey });

    const client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: { username: config.email, password: config.apiToken },
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      const { data } = await client.get('/search', {
        params: { jql, maxResults: 10, fields: 'summary,key' },
      });

      if (!data.issues || data.issues.length === 0) {
        return { isDuplicate: false };
      }

      // Check similarity scores
      for (const issue of data.issues) {
        const similarity = calculateSimilarity(summary, issue.fields.summary);
        if (similarity >= 0.6) {
          return {
            isDuplicate: true,
            existingKey: issue.key,
            existingUrl: `${config.baseUrl}/browse/${issue.key}`,
            similarity,
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      this.logger.warn(`Duplicate check failed: ${error.message}`);
      return { isDuplicate: false };
    }
  }

  async fileBugIfNew(
    userId: string,
    failureData: FailureData,
  ): Promise<{ filed: boolean; jiraKey?: string; isDuplicate: boolean; existingKey?: string }> {
    const summary = `[Auto] ${failureData.testType}: ${failureData.testName} - ${failureData.errorMessage.substring(0, 100)}`;

    const duplicateCheck = await this.checkDuplicate(userId, summary, failureData.projectKey);

    if (duplicateCheck.isDuplicate) {
      this.logger.log(
        `Duplicate detected for "${failureData.testName}" - existing: ${duplicateCheck.existingKey}`,
      );
      return {
        filed: false,
        isDuplicate: true,
        existingKey: duplicateCheck.existingKey,
      };
    }

    const result = await this.autoFileBug(userId, failureData);

    return {
      filed: true,
      jiraKey: result.jiraKey,
      isDuplicate: false,
    };
  }

  private buildDescription(failureData: FailureData): string {
    const sections: string[] = [];

    sections.push(`Test Name: ${failureData.testName}`);
    sections.push(`Test Type: ${failureData.testType}`);
    sections.push(`Environment: ${failureData.environment}`);
    sections.push(`Severity: ${failureData.severity}`);
    sections.push('');
    sections.push(`Error Message:\n${failureData.errorMessage}`);

    if (failureData.stackTrace) {
      sections.push('');
      sections.push(`Stack Trace:\n${failureData.stackTrace}`);
    }

    if (failureData.requestData) {
      sections.push('');
      sections.push(`Request Data:\n${JSON.stringify(failureData.requestData, null, 2)}`);
    }

    if (failureData.responseData) {
      sections.push('');
      sections.push(`Response Data:\n${JSON.stringify(failureData.responseData, null, 2)}`);
    }

    if (failureData.screenshotUrl) {
      sections.push('');
      sections.push(`Screenshot: ${failureData.screenshotUrl}`);
    }

    sections.push('');
    sections.push('---');
    sections.push('This bug was automatically filed by QA Automation Platform.');

    return sections.join('\n');
  }

  private buildLabels(failureData: FailureData): string[] {
    const labels: string[] = ['auto-filed', failureData.testType];

    if (failureData.module) {
      labels.push(failureData.module);
    }

    // Sanitize labels (Jira labels cannot contain spaces)
    return labels.map((l) => l.replace(/\s+/g, '-').toLowerCase());
  }
}
