import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as crypto from 'crypto';

interface FieldSchema {
  name: string;
  type:
    | 'name'
    | 'email'
    | 'phone'
    | 'address'
    | 'date'
    | 'uuid'
    | 'number'
    | 'boolean'
    | 'text'
    | 'custom_regex';
  options?: {
    min?: number;
    max?: number;
    pattern?: string;
    prefix?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

interface GenerateSchema {
  fields: FieldSchema[];
  count: number;
}

interface SeedConfig {
  targetUrl: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  data: Record<string, unknown>[];
}

interface PresetSchema {
  name: string;
  description: string;
  schema: GenerateSchema;
}

@Injectable()
export class TestDataService {
  private readonly logger = new Logger(TestDataService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  // ---------- Inline data generators ----------

  private readonly firstNames = [
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael',
    'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan',
    'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel',
    'Lisa', 'Matthew', 'Nancy', 'Anthony', 'Betty', 'Mark', 'Margaret',
    'Steven', 'Sandra', 'Andrew', 'Ashley', 'Joshua', 'Dorothy', 'Kenneth',
    'Kimberly', 'Kevin', 'Emily', 'Brian', 'Donna',
  ];

  private readonly lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson',
  ];

  private readonly streetNames = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Pine Rd',
    'Washington Blvd', 'Park Ave', 'Lake Dr', 'Hill St', 'River Rd',
    'Sunset Blvd', 'Broadway', 'Highland Ave', 'Forest Dr',
  ];

  private readonly cities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'Austin', 'Jacksonville', 'Columbus',
    'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Boston',
  ];

  private readonly states = [
    'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA',
    'WA', 'AZ', 'MA', 'CO', 'TN', 'IN', 'MD', 'MN',
  ];

  private readonly loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
    'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
    'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
    'aliquip', 'ex', 'ea', 'commodo', 'consequat',
  ];

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateName(): string {
    return `${this.pick(this.firstNames)} ${this.pick(this.lastNames)}`;
  }

  private generateEmail(): string {
    const first = this.pick(this.firstNames).toLowerCase();
    const last = this.pick(this.lastNames).toLowerCase();
    const domains = ['example.com', 'test.org', 'sample.net', 'demo.io'];
    const num = this.randInt(1, 999);
    return `${first}.${last}${num}@${this.pick(domains)}`;
  }

  private generatePhone(): string {
    const area = this.randInt(200, 999);
    const mid = this.randInt(200, 999);
    const last = this.randInt(1000, 9999);
    return `+1-${area}-${mid}-${last}`;
  }

  private generateAddress(): string {
    const num = this.randInt(100, 9999);
    const street = this.pick(this.streetNames);
    const city = this.pick(this.cities);
    const state = this.pick(this.states);
    const zip = this.randInt(10000, 99999);
    return `${num} ${street}, ${city}, ${state} ${zip}`;
  }

  private generateDate(from?: string, to?: string): string {
    const start = from ? new Date(from).getTime() : new Date('2020-01-01').getTime();
    const end = to ? new Date(to).getTime() : Date.now();
    const ts = start + Math.random() * (end - start);
    return new Date(ts).toISOString().split('T')[0];
  }

  private generateUuid(): string {
    return crypto.randomUUID();
  }

  private generateNumber(min = 0, max = 10000): number {
    return this.randInt(min, max);
  }

  private generateBoolean(): boolean {
    return Math.random() > 0.5;
  }

  private generateText(wordCount = 10): string {
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(this.pick(this.loremWords));
    }
    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
  }

  private generateFromRegex(pattern: string): string {
    // Simple regex-like generator supporting: [a-z], [0-9], {n}, literals
    let result = '';
    let i = 0;
    while (i < pattern.length) {
      if (pattern[i] === '[') {
        const end = pattern.indexOf(']', i);
        if (end === -1) { result += pattern[i]; i++; continue; }
        const charClass = pattern.slice(i + 1, end);
        const chars = this.expandCharClass(charClass);
        // check for quantifier
        let repeat = 1;
        if (pattern[end + 1] === '{') {
          const qEnd = pattern.indexOf('}', end + 1);
          if (qEnd !== -1) {
            repeat = parseInt(pattern.slice(end + 2, qEnd), 10) || 1;
            i = qEnd + 1;
          } else {
            i = end + 1;
          }
        } else {
          i = end + 1;
        }
        for (let r = 0; r < repeat; r++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      } else {
        result += pattern[i];
        i++;
      }
    }
    return result;
  }

  private expandCharClass(cls: string): string[] {
    const chars: string[] = [];
    let i = 0;
    while (i < cls.length) {
      if (i + 2 < cls.length && cls[i + 1] === '-') {
        const start = cls.charCodeAt(i);
        const end = cls.charCodeAt(i + 2);
        for (let c = start; c <= end; c++) {
          chars.push(String.fromCharCode(c));
        }
        i += 3;
      } else {
        chars.push(cls[i]);
        i++;
      }
    }
    return chars;
  }

  private generateFieldValue(field: FieldSchema): unknown {
    const opts = field.options || {};
    switch (field.type) {
      case 'name':
        return this.generateName();
      case 'email':
        return this.generateEmail();
      case 'phone':
        return this.generatePhone();
      case 'address':
        return this.generateAddress();
      case 'date':
        return this.generateDate(opts.dateFrom, opts.dateTo);
      case 'uuid':
        return this.generateUuid();
      case 'number':
        return this.generateNumber(opts.min ?? 0, opts.max ?? 10000);
      case 'boolean':
        return this.generateBoolean();
      case 'text':
        return this.generateText(opts.max ?? 10);
      case 'custom_regex':
        return this.generateFromRegex(opts.pattern || '[a-z]{8}');
      default:
        return null;
    }
  }

  // ---------- Public API ----------

  async generate(schema: GenerateSchema): Promise<{ data: Record<string, unknown>[] }> {
    const count = Math.min(schema.count || 10, 10000);
    const data: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      const row: Record<string, unknown> = {};
      for (const field of schema.fields) {
        row[field.name] = this.generateFieldValue(field);
      }
      data.push(row);
    }

    this.logger.log(`Generated ${count} test data records with ${schema.fields.length} fields`);
    return { data };
  }

  async seed(config: SeedConfig): Promise<{
    totalSent: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const { targetUrl, method, headers = {}, data } = config;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    this.logger.log(`Seeding ${data.length} records to ${targetUrl}`);

    for (const record of data) {
      try {
        await this.httpRequest(targetUrl, method, headers, record);
        successful++;
      } catch (err) {
        failed++;
        errors.push(err.message);
        if (errors.length >= 50) {
          errors.push(`... and ${data.length - successful - failed} more skipped`);
          break;
        }
      }
    }

    return {
      totalSent: data.length,
      successful,
      failed,
      errors: errors.slice(0, 50),
    };
  }

  getPresets(): PresetSchema[] {
    return [
      {
        name: 'userProfile',
        description: 'User profile with name, email, phone, and address',
        schema: {
          fields: [
            { name: 'id', type: 'uuid' },
            { name: 'name', type: 'name' },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'phone' },
            { name: 'address', type: 'address' },
            { name: 'isActive', type: 'boolean' },
            { name: 'joinDate', type: 'date' },
          ],
          count: 10,
        },
      },
      {
        name: 'order',
        description: 'E-commerce order with items and totals',
        schema: {
          fields: [
            { name: 'orderId', type: 'uuid' },
            { name: 'customerName', type: 'name' },
            { name: 'customerEmail', type: 'email' },
            { name: 'amount', type: 'number', options: { min: 10, max: 5000 } },
            { name: 'quantity', type: 'number', options: { min: 1, max: 20 } },
            { name: 'orderDate', type: 'date' },
            { name: 'shipped', type: 'boolean' },
          ],
          count: 10,
        },
      },
      {
        name: 'product',
        description: 'Product catalog entry',
        schema: {
          fields: [
            { name: 'sku', type: 'custom_regex', options: { pattern: 'SKU-[A-Z]{3}-[0-9]{5}' } },
            { name: 'name', type: 'text', options: { max: 4 } },
            { name: 'description', type: 'text', options: { max: 20 } },
            { name: 'price', type: 'number', options: { min: 1, max: 999 } },
            { name: 'inStock', type: 'boolean' },
            { name: 'category', type: 'custom_regex', options: { pattern: 'CAT-[0-9]{3}' } },
          ],
          count: 10,
        },
      },
      {
        name: 'transaction',
        description: 'Financial transaction record',
        schema: {
          fields: [
            { name: 'transactionId', type: 'uuid' },
            { name: 'fromAccount', type: 'custom_regex', options: { pattern: 'ACC-[0-9]{8}' } },
            { name: 'toAccount', type: 'custom_regex', options: { pattern: 'ACC-[0-9]{8}' } },
            { name: 'amount', type: 'number', options: { min: 1, max: 50000 } },
            { name: 'currency', type: 'custom_regex', options: { pattern: 'USD' } },
            { name: 'date', type: 'date' },
            { name: 'memo', type: 'text', options: { max: 6 } },
          ],
          count: 10,
        },
      },
    ];
  }

  // ---------- HTTP helper ----------

  private httpRequest(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const payload = JSON.stringify(body);

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload).toString(),
        ...headers,
      };

      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers: reqHeaders,
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ statusCode: res.statusCode, body: data });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            }
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.write(payload);
      req.end();
    });
  }
}
