import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: {
    type: 'basic' | 'bearer' | 'apikey';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
    addTo?: 'header' | 'query';
  };
  timeout?: number;
}

export interface ExecutionResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  responseTime: number;
}

export async function executeHttpRequest(config: RequestConfig): Promise<ExecutionResult> {
  const axiosConfig: AxiosRequestConfig = {
    method: config.method,
    url: config.url,
    headers: { ...config.headers },
    data: config.body,
    timeout: config.timeout || 30000,
    validateStatus: () => true,
  };

  if (config.auth) {
    switch (config.auth.type) {
      case 'basic':
        axiosConfig.auth = {
          username: config.auth.username || '',
          password: config.auth.password || '',
        };
        break;
      case 'bearer':
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: `Bearer ${config.auth.token}`,
        };
        break;
      case 'apikey':
        if (config.auth.addTo === 'query') {
          axiosConfig.params = {
            ...axiosConfig.params,
            [config.auth.key || 'api_key']: config.auth.value,
          };
        } else {
          axiosConfig.headers = {
            ...axiosConfig.headers,
            [config.auth.key || 'X-API-Key']: config.auth.value,
          };
        }
        break;
    }
  }

  const start = Date.now();
  const response: AxiosResponse = await axios(axiosConfig);
  const responseTime = Date.now() - start;

  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(response.headers)) {
    responseHeaders[key] = String(value);
  }

  return {
    status: response.status,
    body: response.data,
    headers: responseHeaders,
    responseTime,
  };
}
