import { Injectable, BadRequestException } from '@nestjs/common';
import { JiraService } from '../jira/jira.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import axios from 'axios';
import * as XLSX from 'xlsx';

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, string>[];
}

export interface FieldMapping {
  excelColumn: string;
  jiraField: string;
}

export interface ValidationResult {
  valid: Record<string, string>[];
  invalid: { row: Record<string, string>; errors: string[] }[];
}

@Injectable()
export class ExcelService {
  constructor(
    private readonly jiraService: JiraService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async parseExcel(fileUrl: string): Promise<ParsedExcel> {
    try {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const workbook = XLSX.read(response.data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException('Excel file has no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
        defval: '',
        raw: false,
      });

      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

      return { headers, rows: jsonData };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async validateMappedData(
    rows: Record<string, string>[],
    mappings: FieldMapping[],
    userId: string,
  ): Promise<ValidationResult> {
    const valid: Record<string, string>[] = [];
    const invalid: { row: Record<string, string>; errors: string[] }[] = [];

    const requiredJiraFields = ['summary'];

    for (const row of rows) {
      const errors: string[] = [];

      // Check required fields are mapped and have values
      for (const requiredField of requiredJiraFields) {
        const mapping = mappings.find((m) => m.jiraField === requiredField);
        if (!mapping) {
          errors.push(`Required Jira field "${requiredField}" is not mapped`);
        } else if (!row[mapping.excelColumn]?.trim()) {
          errors.push(`Required field "${requiredField}" is empty (column: ${mapping.excelColumn})`);
        }
      }

      // Check mapped columns exist in the row
      for (const mapping of mappings) {
        if (!(mapping.excelColumn in row)) {
          errors.push(`Mapped column "${mapping.excelColumn}" not found in row`);
        }
      }

      if (errors.length === 0) {
        valid.push(row);
      } else {
        invalid.push({ row, errors });
      }
    }

    return { valid, invalid };
  }

  async createTicketsFromExcel(
    userId: string,
    rows: Record<string, string>[],
    mappings: FieldMapping[],
    projectKey: string,
    issueType: string,
  ) {
    const batchId = `excel_${Date.now()}`;
    const results: { row: number; jiraKey?: string; status: string; error?: string }[] = [];

    // Store batch metadata in Firestore
    const batchRef = this.db.doc(`users/${userId}/ticketBatches/${batchId}`);
    await batchRef.set({
      source: 'EXCEL',
      totalRows: rows.length,
      status: 'IN_PROGRESS',
      createdAt: new Date(),
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Build Jira fields from mappings
        const fields: Record<string, unknown> = {
          project: { key: projectKey },
          issuetype: { name: issueType },
        };

        for (const mapping of mappings) {
          const value = row[mapping.excelColumn];
          if (value) {
            if (mapping.jiraField === 'summary') {
              fields.summary = value;
            } else if (mapping.jiraField === 'description') {
              fields.description = {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: value }],
                  },
                ],
              };
            } else if (mapping.jiraField === 'priority') {
              fields.priority = { name: value };
            } else if (mapping.jiraField === 'assignee') {
              fields.assignee = { accountId: value };
            } else if (mapping.jiraField === 'labels') {
              fields.labels = value.split(',').map((l: string) => l.trim());
            } else {
              fields[mapping.jiraField] = value;
            }
          }
        }

        const result = await this.jiraService.createIssue(userId, fields);
        results.push({ row: i, jiraKey: result.key, status: 'SUCCESS' });
      } catch (error) {
        results.push({ row: i, status: 'FAILED', error: error.message });
      }
    }

    // Update batch in Firestore with results
    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    await batchRef.update({
      status: failedCount === 0 ? 'COMPLETED' : 'PARTIAL',
      successCount,
      failedCount,
      results,
      completedAt: new Date(),
    });

    return { batchId, successCount, failedCount, results };
  }
}
