import { Injectable, BadRequestException } from '@nestjs/common';
import { IntegrationService } from '../integration/integration.service';
import { IntegrationType } from '../integration/dto/save-integration.dto';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class JiraService {
  constructor(private readonly integrationService: IntegrationService) {}

  private async getClient(userId: string): Promise<AxiosInstance> {
    const config = await this.integrationService.getDecryptedConfig(userId, IntegrationType.JIRA);
    return axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection(userId: string) {
    try {
      const client = await this.getClient(userId);
      const { data } = await client.get('/myself');
      await this.integrationService.updateTestStatus(userId, IntegrationType.JIRA, true);
      return { success: true, user: data.displayName, email: data.emailAddress };
    } catch (error) {
      await this.integrationService.updateTestStatus(userId, IntegrationType.JIRA, false);
      throw new BadRequestException(`Jira connection failed: ${error.message}`);
    }
  }

  async getProjects(userId: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get('/project');
    return data.map((p: Record<string, string>) => ({
      id: p.id,
      key: p.key,
      name: p.name,
    }));
  }

  async getIssueTypes(userId: string, projectKey: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get(`/project/${projectKey}/statuses`);
    return data;
  }

  async getPriorities(userId: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get('/priority');
    return data.map((p: Record<string, string>) => ({
      id: p.id,
      name: p.name,
    }));
  }

  async searchUsers(userId: string, query: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get('/user/search', { params: { query } });
    return data.map((u: Record<string, string>) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress,
    }));
  }

  async createIssue(userId: string, issueData: Record<string, unknown>) {
    const client = await this.getClient(userId);
    const { data } = await client.post('/issue', { fields: issueData });
    return { id: data.id, key: data.key, self: data.self };
  }

  async bulkCreateIssues(userId: string, issues: Record<string, unknown>[]) {
    const client = await this.getClient(userId);
    const { data } = await client.post('/issue/bulk', {
      issueUpdates: issues.map((fields) => ({ fields })),
    });
    return data;
  }
}
