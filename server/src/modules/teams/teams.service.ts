import { Injectable, BadRequestException } from '@nestjs/common';
import { IntegrationService } from '../integration/integration.service';
import { IntegrationType } from '../integration/dto/save-integration.dto';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class TeamsService {
  constructor(private readonly integrationService: IntegrationService) {}

  private async getClient(userId: string): Promise<AxiosInstance> {
    const config = await this.integrationService.getDecryptedConfig(
      userId,
      IntegrationType.TEAMS,
    );

    // Obtain access token via OAuth2 client credentials flow
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = tokenResponse.data.access_token;

    return axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getJoinedTeams(userId: string) {
    try {
      const client = await this.getClient(userId);
      const { data } = await client.get('/teams');
      return (data.value || []).map((team: Record<string, unknown>) => ({
        id: team.id,
        displayName: team.displayName,
        description: team.description,
      }));
    } catch (error) {
      throw new BadRequestException(`Failed to fetch Teams: ${error.message}`);
    }
  }

  async getChannels(userId: string, teamId: string) {
    try {
      const client = await this.getClient(userId);
      const { data } = await client.get(`/teams/${teamId}/channels`);
      return (data.value || []).map((channel: Record<string, unknown>) => ({
        id: channel.id,
        displayName: channel.displayName,
        description: channel.description,
      }));
    } catch (error) {
      throw new BadRequestException(`Failed to fetch channels: ${error.message}`);
    }
  }

  async getMessages(
    userId: string,
    teamId: string,
    channelId: string,
    filters?: { from?: string; to?: string; keyword?: string },
  ) {
    try {
      const client = await this.getClient(userId);
      let url = `/teams/${teamId}/channels/${channelId}/messages`;
      const params: Record<string, string> = { $top: '50' };

      // Apply date filters via OData $filter if provided
      const filterParts: string[] = [];
      if (filters?.from) {
        filterParts.push(`createdDateTime ge ${filters.from}T00:00:00Z`);
      }
      if (filters?.to) {
        filterParts.push(`createdDateTime le ${filters.to}T23:59:59Z`);
      }
      if (filterParts.length > 0) {
        params.$filter = filterParts.join(' and ');
      }

      const { data } = await client.get(url, { params });
      let messages = (data.value || []).map((msg: Record<string, unknown>) => ({
        id: msg.id,
        createdDateTime: msg.createdDateTime,
        from: (msg.from as any)?.user?.displayName || 'Unknown',
        body: (msg.body as any)?.content || '',
        contentType: (msg.body as any)?.contentType || 'text',
      }));

      // Client-side keyword filtering
      if (filters?.keyword) {
        const keyword = filters.keyword.toLowerCase();
        messages = messages.filter((m: { body: string }) =>
          m.body.toLowerCase().includes(keyword),
        );
      }

      return messages;
    } catch (error) {
      throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
    }
  }

  async createTicketsFromMessages(
    userId: string,
    messages: { id: string; from: string; body: string; createdDateTime: string }[],
    projectKey: string,
    issueType: string,
  ) {
    // This returns structured ticket data for the caller to pass to TicketsService or JiraService
    return messages.map((msg) => ({
      summary: `[Teams] ${msg.from}: ${this.stripHtml(msg.body).substring(0, 100)}`,
      description: `From: ${msg.from}\nDate: ${msg.createdDateTime}\n\n${this.stripHtml(msg.body)}`,
      projectKey,
      issueType,
      source: 'TEAMS',
      sourceMessageId: msg.id,
    }));
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
