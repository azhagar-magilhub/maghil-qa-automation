import { JSONPath } from 'jsonpath-plus';
import { ExecutionResult } from './request-executor';

export interface Assertion {
  type: 'status' | 'jsonpath' | 'header' | 'response_time';
  target?: string;
  expected: unknown;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists';
}

export interface AssertionResult {
  type: string;
  target?: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  message: string;
}

export function evaluateAssertions(
  assertions: Assertion[],
  result: ExecutionResult,
): AssertionResult[] {
  return assertions.map((assertion) => evaluate(assertion, result));
}

function evaluate(assertion: Assertion, result: ExecutionResult): AssertionResult {
  switch (assertion.type) {
    case 'status':
      return evaluateStatus(assertion, result);
    case 'jsonpath':
      return evaluateJsonPath(assertion, result);
    case 'header':
      return evaluateHeader(assertion, result);
    case 'response_time':
      return evaluateResponseTime(assertion, result);
    default:
      return {
        type: assertion.type,
        target: assertion.target,
        expected: assertion.expected,
        actual: null,
        passed: false,
        message: `Unknown assertion type: ${assertion.type}`,
      };
  }
}

function evaluateStatus(assertion: Assertion, result: ExecutionResult): AssertionResult {
  const expected = Number(assertion.expected);
  const actual = result.status;
  const passed = compare(actual, expected, assertion.operator || 'eq');
  return {
    type: 'status',
    expected,
    actual,
    passed,
    message: passed
      ? `Status code ${actual} matches expected ${expected}`
      : `Expected status ${expected}, got ${actual}`,
  };
}

function evaluateJsonPath(assertion: Assertion, result: ExecutionResult): AssertionResult {
  const path = assertion.target || '$';
  let actual: unknown;

  try {
    const matches = JSONPath({ path, json: result.body as object });
    actual = matches.length === 1 ? matches[0] : matches;
  } catch {
    return {
      type: 'jsonpath',
      target: path,
      expected: assertion.expected,
      actual: null,
      passed: false,
      message: `Invalid JSONPath expression: ${path}`,
    };
  }

  const passed = compare(actual, assertion.expected, assertion.operator || 'eq');
  return {
    type: 'jsonpath',
    target: path,
    expected: assertion.expected,
    actual,
    passed,
    message: passed
      ? `JSONPath ${path} matches expected value`
      : `JSONPath ${path}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`,
  };
}

function evaluateHeader(assertion: Assertion, result: ExecutionResult): AssertionResult {
  const headerName = (assertion.target || '').toLowerCase();
  const actual = result.headers[headerName];
  const operator = assertion.operator || 'eq';

  if (operator === 'exists') {
    const passed = actual !== undefined;
    return {
      type: 'header',
      target: assertion.target,
      expected: 'exists',
      actual: actual ?? null,
      passed,
      message: passed
        ? `Header "${assertion.target}" exists`
        : `Header "${assertion.target}" not found`,
    };
  }

  const passed = compare(actual, assertion.expected, operator);
  return {
    type: 'header',
    target: assertion.target,
    expected: assertion.expected,
    actual: actual ?? null,
    passed,
    message: passed
      ? `Header "${assertion.target}" matches expected value`
      : `Header "${assertion.target}": expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`,
  };
}

function evaluateResponseTime(assertion: Assertion, result: ExecutionResult): AssertionResult {
  const threshold = Number(assertion.expected);
  const actual = result.responseTime;
  const operator = assertion.operator || 'lt';
  const passed = compare(actual, threshold, operator);
  return {
    type: 'response_time',
    expected: `${operator} ${threshold}ms`,
    actual: `${actual}ms`,
    passed,
    message: passed
      ? `Response time ${actual}ms within threshold ${threshold}ms`
      : `Response time ${actual}ms exceeded threshold ${threshold}ms`,
  };
}

function compare(actual: unknown, expected: unknown, operator: string): boolean {
  switch (operator) {
    case 'eq':
      return JSON.stringify(actual) === JSON.stringify(expected);
    case 'neq':
      return JSON.stringify(actual) !== JSON.stringify(expected);
    case 'gt':
      return Number(actual) > Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'contains':
      return String(actual).includes(String(expected));
    case 'exists':
      return actual !== undefined && actual !== null;
    default:
      return actual === expected;
  }
}
