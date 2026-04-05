import { JSONPath } from 'jsonpath-plus';
import { ExecutionResult } from './request-executor';

export interface ChainVariable {
  name: string;
  source: 'body' | 'header' | 'status';
  path?: string;
}

export interface ResolvedVariables {
  [key: string]: string;
}

export function extractVariables(
  variables: ChainVariable[],
  result: ExecutionResult,
): ResolvedVariables {
  const resolved: ResolvedVariables = {};

  for (const variable of variables) {
    let value: unknown;

    switch (variable.source) {
      case 'body':
        if (variable.path) {
          try {
            const matches = JSONPath({ path: variable.path, json: result.body as object });
            value = matches.length === 1 ? matches[0] : matches;
          } catch {
            value = undefined;
          }
        } else {
          value = result.body;
        }
        break;
      case 'header':
        value = result.headers[(variable.path || '').toLowerCase()];
        break;
      case 'status':
        value = result.status;
        break;
    }

    if (value !== undefined && value !== null) {
      resolved[variable.name] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }

  return resolved;
}

export function injectVariables(
  template: unknown,
  variables: ResolvedVariables,
): unknown {
  if (typeof template === 'string') {
    return replaceVariablesInString(template, variables);
  }

  if (Array.isArray(template)) {
    return template.map((item) => injectVariables(item, variables));
  }

  if (template && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      const resolvedKey = replaceVariablesInString(key, variables);
      result[resolvedKey] = injectVariables(value, variables);
    }
    return result;
  }

  return template;
}

function replaceVariablesInString(str: string, variables: ResolvedVariables): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    return variables[name] !== undefined ? variables[name] : match;
  });
}
