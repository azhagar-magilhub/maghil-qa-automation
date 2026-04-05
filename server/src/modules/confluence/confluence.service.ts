import { Injectable, BadRequestException } from '@nestjs/common';
import { IntegrationService } from '../integration/integration.service';
import { IntegrationType } from '../integration/dto/save-integration.dto';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ConfluenceService {
  constructor(private readonly integrationService: IntegrationService) {}

  private async getClient(userId: string): Promise<AxiosInstance> {
    const config = await this.integrationService.getDecryptedConfig(
      userId,
      IntegrationType.CONFLUENCE,
    );
    return axios.create({
      baseURL: `${config.baseUrl}/wiki/rest/api`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getSpaces(userId: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get('/space', {
      params: { limit: 100, type: 'global' },
    });
    return data.results.map((space: Record<string, unknown>) => ({
      id: space.id,
      key: space.key,
      name: space.name,
      type: space.type,
    }));
  }

  async getPages(userId: string, spaceKey: string) {
    const client = await this.getClient(userId);
    const { data } = await client.get('/content', {
      params: {
        spaceKey,
        type: 'page',
        limit: 100,
        expand: 'version',
      },
    });
    return data.results.map((page: Record<string, unknown>) => ({
      id: page.id,
      title: page.title,
      version: (page as any).version?.number,
    }));
  }

  async createPage(userId: string, spaceKey: string, title: string, body: string) {
    const client = await this.getClient(userId);
    try {
      const { data } = await client.post('/content', {
        type: 'page',
        title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: body,
            representation: 'storage',
          },
        },
      });
      return { id: data.id, title: data.title, self: data._links?.webui };
    } catch (error) {
      throw new BadRequestException(`Failed to create Confluence page: ${error.message}`);
    }
  }

  async updatePage(
    userId: string,
    pageId: string,
    title: string,
    body: string,
    version: number,
  ) {
    const client = await this.getClient(userId);
    try {
      const { data } = await client.put(`/content/${pageId}`, {
        type: 'page',
        title,
        body: {
          storage: {
            value: body,
            representation: 'storage',
          },
        },
        version: { number: version + 1 },
      });
      return { id: data.id, title: data.title, version: data.version?.number };
    } catch (error) {
      throw new BadRequestException(`Failed to update Confluence page: ${error.message}`);
    }
  }

  async publishReport(
    userId: string,
    spaceKey: string,
    title: string,
    tickets: { key: string; summary: string; status: string; assignee?: string }[],
    pageId?: string,
  ) {
    const htmlBody = this.generateReportHtml(title, tickets);

    if (pageId) {
      // Get current version to increment
      const client = await this.getClient(userId);
      const { data: existing } = await client.get(`/content/${pageId}`, {
        params: { expand: 'version' },
      });
      return this.updatePage(userId, pageId, title, htmlBody, existing.version.number);
    }

    return this.createPage(userId, spaceKey, title, htmlBody);
  }

  private generateReportHtml(
    title: string,
    tickets: { key: string; summary: string; status: string; assignee?: string }[],
  ): string {
    const now = new Date().toISOString().split('T')[0];
    const rows = tickets
      .map(
        (t) =>
          `<tr><td>${t.key}</td><td>${t.summary}</td><td>${t.status}</td><td>${t.assignee || 'Unassigned'}</td></tr>`,
      )
      .join('\n');

    return `
      <h1>${title}</h1>
      <p><strong>Generated:</strong> ${now}</p>
      <p><strong>Total Tickets:</strong> ${tickets.length}</p>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Summary</th>
            <th>Status</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `.trim();
  }
}
