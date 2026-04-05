import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JiraService } from '../jira/jira.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

export interface TicketInput {
  summary: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  [key: string]: unknown;
}

export interface BatchTicket {
  index: number;
  input: TicketInput;
  jiraKey?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error?: string;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly jiraService: JiraService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createBatch(
    userId: string,
    source: string,
    tickets: TicketInput[],
    projectKey: string,
    issueType: string,
  ) {
    const batchId = `batch_${Date.now()}`;
    const batchRef = this.db.doc(`users/${userId}/ticketBatches/${batchId}`);

    const batchTickets: BatchTicket[] = tickets.map((input, index) => ({
      index,
      input,
      status: 'PENDING' as const,
    }));

    await batchRef.set({
      source,
      projectKey,
      issueType,
      totalTickets: tickets.length,
      status: 'IN_PROGRESS',
      tickets: batchTickets,
      createdAt: new Date(),
    });

    const results: BatchTicket[] = [];

    for (let i = 0; i < batchTickets.length; i++) {
      const ticket = batchTickets[i];
      try {
        const fields: Record<string, unknown> = {
          project: { key: projectKey },
          issuetype: { name: issueType },
          summary: ticket.input.summary,
        };

        if (ticket.input.description) {
          fields.description = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: ticket.input.description }],
              },
            ],
          };
        }

        if (ticket.input.priority) {
          fields.priority = { name: ticket.input.priority };
        }

        if (ticket.input.assignee) {
          fields.assignee = { accountId: ticket.input.assignee };
        }

        if (ticket.input.labels) {
          fields.labels = ticket.input.labels;
        }

        const result = await this.jiraService.createIssue(userId, fields);
        results.push({
          ...ticket,
          jiraKey: result.key,
          status: 'SUCCESS',
        });
      } catch (error) {
        results.push({
          ...ticket,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    await batchRef.update({
      status: failedCount === 0 ? 'COMPLETED' : 'PARTIAL',
      successCount,
      failedCount,
      tickets: results,
      completedAt: new Date(),
    });

    return { batchId, successCount, failedCount, tickets: results };
  }

  async retryFailed(userId: string, batchId: string) {
    const batchRef = this.db.doc(`users/${userId}/ticketBatches/${batchId}`);
    const batchDoc = await batchRef.get();

    if (!batchDoc.exists) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const batchData = batchDoc.data()!;
    const tickets: BatchTicket[] = batchData.tickets || [];
    const failedTickets = tickets.filter((t) => t.status === 'FAILED');

    if (failedTickets.length === 0) {
      throw new BadRequestException('No failed tickets to retry');
    }

    const retryResults: BatchTicket[] = [];

    for (const ticket of failedTickets) {
      try {
        const fields: Record<string, unknown> = {
          project: { key: batchData.projectKey },
          issuetype: { name: batchData.issueType },
          summary: ticket.input.summary,
        };

        if (ticket.input.description) {
          fields.description = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: ticket.input.description }],
              },
            ],
          };
        }

        if (ticket.input.priority) {
          fields.priority = { name: ticket.input.priority };
        }

        if (ticket.input.assignee) {
          fields.assignee = { accountId: ticket.input.assignee };
        }

        if (ticket.input.labels) {
          fields.labels = ticket.input.labels;
        }

        const result = await this.jiraService.createIssue(userId, fields);
        retryResults.push({
          ...ticket,
          jiraKey: result.key,
          status: 'SUCCESS',
          error: undefined,
        });
      } catch (error) {
        retryResults.push({
          ...ticket,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    // Merge retry results back into the full ticket list
    const updatedTickets = tickets.map((t) => {
      const retried = retryResults.find((r) => r.index === t.index);
      return retried || t;
    });

    const successCount = updatedTickets.filter((t) => t.status === 'SUCCESS').length;
    const failedCount = updatedTickets.filter((t) => t.status === 'FAILED').length;

    await batchRef.update({
      status: failedCount === 0 ? 'COMPLETED' : 'PARTIAL',
      successCount,
      failedCount,
      tickets: updatedTickets,
      retriedAt: new Date(),
    });

    return {
      batchId,
      retriedCount: failedTickets.length,
      successCount: retryResults.filter((r) => r.status === 'SUCCESS').length,
      stillFailed: retryResults.filter((r) => r.status === 'FAILED').length,
      tickets: updatedTickets,
    };
  }
}
