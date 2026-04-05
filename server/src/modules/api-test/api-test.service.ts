import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import { executeHttpRequest, RequestConfig, ExecutionResult } from './engines/request-executor';
import { evaluateAssertions, Assertion, AssertionResult } from './engines/assertion-engine';
import { extractVariables, injectVariables, ChainVariable, ResolvedVariables } from './engines/chain-resolver';

interface ExecuteRequestDto {
  method: RequestConfig['method'];
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: RequestConfig['auth'];
  assertions?: Assertion[];
}

interface CollectionRequest {
  id?: string;
  name: string;
  method: RequestConfig['method'];
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: RequestConfig['auth'];
  assertions?: Assertion[];
  chainVariables?: ChainVariable[];
  order: number;
}

@Injectable()
export class ApiTestService {
  private readonly logger = new Logger(ApiTestService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async executeRequest(
    userId: string,
    requestConfig: ExecuteRequestDto,
  ): Promise<{ passed: boolean; response: ExecutionResult; assertions: AssertionResult[] }> {
    const config: RequestConfig = {
      method: requestConfig.method,
      url: requestConfig.url,
      headers: requestConfig.headers,
      body: requestConfig.body,
      auth: requestConfig.auth,
    };

    const response = await executeHttpRequest(config);
    const assertions = requestConfig.assertions
      ? evaluateAssertions(requestConfig.assertions, response)
      : [];
    const passed = assertions.length === 0 || assertions.every((a) => a.passed);

    return { passed, response, assertions };
  }

  async runCollection(userId: string, collectionId: string) {
    const collectionRef = this.db.doc(`users/${userId}/apiCollections/${collectionId}`);
    const collectionDoc = await collectionRef.get();

    if (!collectionDoc.exists) {
      throw new BadRequestException('Collection not found');
    }

    const requestsSnapshot = await collectionRef
      .collection('requests')
      .orderBy('order')
      .get();

    const requests: CollectionRequest[] = requestsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CollectionRequest[];

    let chainedVariables: ResolvedVariables = {};
    const results: Array<{
      requestName: string;
      passed: boolean;
      response: ExecutionResult;
      assertions: AssertionResult[];
    }> = [];

    const runRef = collectionRef.collection('runs').doc();
    const startTime = Date.now();

    for (const request of requests) {
      try {
        const resolvedUrl = injectVariables(request.url, chainedVariables) as string;
        const resolvedHeaders = injectVariables(request.headers || {}, chainedVariables) as Record<string, string>;
        const resolvedBody = injectVariables(request.body, chainedVariables);

        const config: RequestConfig = {
          method: request.method,
          url: resolvedUrl,
          headers: resolvedHeaders,
          body: resolvedBody,
          auth: request.auth,
        };

        const response = await executeHttpRequest(config);
        const assertions = request.assertions
          ? evaluateAssertions(request.assertions, response)
          : [];
        const passed = assertions.length === 0 || assertions.every((a) => a.passed);

        if (request.chainVariables && request.chainVariables.length > 0) {
          const extracted = extractVariables(request.chainVariables, response);
          chainedVariables = { ...chainedVariables, ...extracted };
        }

        results.push({ requestName: request.name, passed, response, assertions });
      } catch (error) {
        results.push({
          requestName: request.name,
          passed: false,
          response: { status: 0, body: error.message, headers: {}, responseTime: 0 },
          assertions: [
            {
              type: 'execution',
              expected: 'success',
              actual: error.message,
              passed: false,
              message: `Request failed: ${error.message}`,
            },
          ],
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const allPassed = results.every((r) => r.passed);

    const runData = {
      collectionId,
      status: allPassed ? 'passed' : 'failed',
      totalRequests: results.length,
      passedRequests: results.filter((r) => r.passed).length,
      failedRequests: results.filter((r) => !r.passed).length,
      totalTime,
      results,
      executedAt: new Date(),
    };

    await runRef.set(runData);

    return { runId: runRef.id, ...runData };
  }

  async importPostman(userId: string, postmanJson: Record<string, unknown>) {
    const info = postmanJson.info as Record<string, string> | undefined;
    const items = postmanJson.item as Array<Record<string, unknown>> | undefined;

    if (!info || !items) {
      throw new BadRequestException('Invalid Postman collection format (v2.1 expected)');
    }

    const collectionRef = this.db.collection(`users/${userId}/apiCollections`).doc();
    await collectionRef.set({
      name: info.name || 'Imported Postman Collection',
      description: info.description || '',
      source: 'postman',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const requests = this.parsePostmanItems(items);
    const batch = this.db.batch();

    requests.forEach((request, index) => {
      const reqRef = collectionRef.collection('requests').doc();
      batch.set(reqRef, { ...request, order: index });
    });

    await batch.commit();

    return {
      collectionId: collectionRef.id,
      name: info.name,
      requestCount: requests.length,
    };
  }

  private parsePostmanItems(
    items: Array<Record<string, unknown>>,
    prefix = '',
  ): Array<Omit<CollectionRequest, 'order'>> {
    const requests: Array<Omit<CollectionRequest, 'order'>> = [];

    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        const folderName = prefix ? `${prefix}/${item.name}` : String(item.name || '');
        requests.push(...this.parsePostmanItems(item.item as Array<Record<string, unknown>>, folderName));
        continue;
      }

      const request = item.request as Record<string, unknown> | undefined;
      if (!request) continue;

      const url = this.parsePostmanUrl(request.url);
      const method = (String(request.method || 'GET')).toUpperCase() as RequestConfig['method'];
      const headers = this.parsePostmanHeaders(request.header);
      const body = this.parsePostmanBody(request.body);

      requests.push({
        name: prefix ? `${prefix}/${item.name}` : String(item.name || 'Unnamed Request'),
        method,
        url,
        headers,
        body,
        assertions: [],
        chainVariables: [],
      });
    }

    return requests;
  }

  private parsePostmanUrl(url: unknown): string {
    if (typeof url === 'string') return url;
    if (url && typeof url === 'object') {
      const urlObj = url as Record<string, unknown>;
      if (urlObj.raw) return String(urlObj.raw);
      const protocol = urlObj.protocol || 'https';
      const host = Array.isArray(urlObj.host) ? (urlObj.host as string[]).join('.') : urlObj.host || '';
      const path = Array.isArray(urlObj.path) ? (urlObj.path as string[]).join('/') : urlObj.path || '';
      return `${protocol}://${host}/${path}`;
    }
    return '';
  }

  private parsePostmanHeaders(headers: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.disabled) continue;
        result[h.key] = h.value;
      }
    }
    return result;
  }

  private parsePostmanBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return undefined;
    const bodyObj = body as Record<string, unknown>;

    switch (bodyObj.mode) {
      case 'raw': {
        const raw = String(bodyObj.raw || '');
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      case 'urlencoded': {
        const params: Record<string, string> = {};
        if (Array.isArray(bodyObj.urlencoded)) {
          for (const p of bodyObj.urlencoded as Array<Record<string, string>>) {
            if (!p.disabled) params[p.key] = p.value;
          }
        }
        return params;
      }
      case 'formdata': {
        const formData: Record<string, string> = {};
        if (Array.isArray(bodyObj.formdata)) {
          for (const p of bodyObj.formdata as Array<Record<string, string>>) {
            if (!p.disabled) formData[p.key] = p.value;
          }
        }
        return formData;
      }
      default:
        return undefined;
    }
  }

  async importOpenAPI(userId: string, spec: Record<string, unknown>) {
    const info = spec.info as Record<string, string> | undefined;
    const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;

    if (!paths) {
      throw new BadRequestException('Invalid OpenAPI/Swagger specification');
    }

    const collectionRef = this.db.collection(`users/${userId}/apiCollections`).doc();
    const basePath = this.getOpenAPIBasePath(spec);

    await collectionRef.set({
      name: info?.title || 'Imported OpenAPI Collection',
      description: info?.description || '',
      source: 'openapi',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const requests: Array<Omit<CollectionRequest, 'order'>> = [];

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].indexOf(method.toLowerCase()) === -1) {
          continue;
        }

        const op = operation as Record<string, unknown>;
        const sampleBody = this.generateSamplePayload(op, spec);

        requests.push({
          name: (op.summary as string) || `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase() as RequestConfig['method'],
          url: `${basePath}${path}`,
          headers: { 'Content-Type': 'application/json' },
          body: sampleBody,
          assertions: [{ type: 'status', expected: 200, operator: 'lt' as const, target: undefined }],
          chainVariables: [],
        });
      }
    }

    const batch = this.db.batch();
    requests.forEach((request, index) => {
      const reqRef = collectionRef.collection('requests').doc();
      batch.set(reqRef, { ...request, order: index });
    });
    await batch.commit();

    return {
      collectionId: collectionRef.id,
      name: info?.title || 'Imported OpenAPI Collection',
      requestCount: requests.length,
    };
  }

  private getOpenAPIBasePath(spec: Record<string, unknown>): string {
    // OpenAPI 3.x
    if (spec.servers && Array.isArray(spec.servers) && spec.servers.length > 0) {
      return (spec.servers[0] as Record<string, string>).url || '';
    }
    // Swagger 2.x
    const host = spec.host || 'localhost';
    const basePath = spec.basePath || '';
    const schemes = spec.schemes as string[] | undefined;
    const scheme = schemes?.[0] || 'https';
    return `${scheme}://${host}${basePath}`;
  }

  private generateSamplePayload(
    operation: Record<string, unknown>,
    spec: Record<string, unknown>,
  ): unknown {
    // OpenAPI 3.x requestBody
    const requestBody = operation.requestBody as Record<string, unknown> | undefined;
    if (requestBody?.content) {
      const content = requestBody.content as Record<string, Record<string, unknown>>;
      const jsonContent = content['application/json'];
      if (jsonContent?.schema) {
        return this.generateFromSchema(jsonContent.schema as Record<string, unknown>, spec);
      }
    }

    // Swagger 2.x body parameters
    const parameters = operation.parameters as Array<Record<string, unknown>> | undefined;
    if (parameters) {
      const bodyParam = parameters.find((p) => p.in === 'body');
      if (bodyParam?.schema) {
        return this.generateFromSchema(bodyParam.schema as Record<string, unknown>, spec);
      }
    }

    return undefined;
  }

  private generateFromSchema(
    schema: Record<string, unknown>,
    spec: Record<string, unknown>,
    depth = 0,
  ): unknown {
    if (depth > 5) return {};

    // Resolve $ref
    if (schema.$ref) {
      const refPath = String(schema.$ref).replace('#/', '').split('/');
      let resolved: unknown = spec;
      for (const part of refPath) {
        resolved = (resolved as Record<string, unknown>)?.[part];
      }
      if (resolved) {
        return this.generateFromSchema(resolved as Record<string, unknown>, spec, depth + 1);
      }
      return {};
    }

    switch (schema.type) {
      case 'object': {
        const obj: Record<string, unknown> = {};
        const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
        if (properties) {
          for (const [key, propSchema] of Object.entries(properties)) {
            obj[key] = this.generateFromSchema(propSchema, spec, depth + 1);
          }
        }
        return obj;
      }
      case 'array': {
        const itemSchema = schema.items as Record<string, unknown> | undefined;
        if (itemSchema) {
          return [this.generateFromSchema(itemSchema, spec, depth + 1)];
        }
        return [];
      }
      case 'string':
        return schema.example || (schema.enum as string[])?.[0] || 'string';
      case 'integer':
      case 'number':
        return schema.example || 0;
      case 'boolean':
        return schema.example ?? true;
      default:
        return schema.example || null;
    }
  }

  async getCollections(userId: string) {
    const snapshot = await this.db
      .collection(`users/${userId}/apiCollections`)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}
