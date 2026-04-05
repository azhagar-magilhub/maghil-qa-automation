import * as https from 'https';
import * as http from 'http';

export interface SecurityFinding {
  header: string;
  status: 'present' | 'missing' | 'misconfigured';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  value: string | null;
  recommendation: string;
}

const SECURITY_HEADERS: Array<{
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}> = [
  {
    name: 'strict-transport-security',
    severity: 'high',
    recommendation:
      'Add Strict-Transport-Security header with max-age of at least 31536000 (1 year). Example: "max-age=31536000; includeSubDomains; preload"',
  },
  {
    name: 'content-security-policy',
    severity: 'high',
    recommendation:
      'Implement a Content-Security-Policy header to prevent XSS and data injection attacks. Start with a restrictive policy and loosen as needed.',
  },
  {
    name: 'x-frame-options',
    severity: 'medium',
    recommendation:
      'Set X-Frame-Options to "DENY" or "SAMEORIGIN" to prevent clickjacking attacks.',
  },
  {
    name: 'x-content-type-options',
    severity: 'medium',
    recommendation:
      'Set X-Content-Type-Options to "nosniff" to prevent MIME-type sniffing.',
  },
  {
    name: 'referrer-policy',
    severity: 'low',
    recommendation:
      'Set Referrer-Policy to "strict-origin-when-cross-origin" or "no-referrer" to control information leakage.',
  },
  {
    name: 'permissions-policy',
    severity: 'low',
    recommendation:
      'Add Permissions-Policy header to control browser features. Example: "camera=(), microphone=(), geolocation=()"',
  },
];

export async function analyzeHeaders(
  targetUrl: string,
): Promise<{
  url: string;
  findings: SecurityFinding[];
  score: number;
  responseHeaders: Record<string, string>;
}> {
  const responseHeaders = await fetchHeaders(targetUrl);

  const findings: SecurityFinding[] = [];

  for (const header of SECURITY_HEADERS) {
    const value = responseHeaders[header.name] || null;

    if (!value) {
      findings.push({
        header: header.name,
        status: 'missing',
        severity: header.severity,
        value: null,
        recommendation: header.recommendation,
      });
    } else {
      const misconfiguration = checkMisconfiguration(header.name, value);
      if (misconfiguration) {
        findings.push({
          header: header.name,
          status: 'misconfigured',
          severity: header.severity,
          value,
          recommendation: misconfiguration,
        });
      } else {
        findings.push({
          header: header.name,
          status: 'present',
          severity: 'info',
          value,
          recommendation: 'Header is properly configured.',
        });
      }
    }
  }

  // Check for information disclosure headers
  const serverHeader = responseHeaders['server'];
  if (serverHeader) {
    findings.push({
      header: 'server',
      status: 'misconfigured',
      severity: 'low',
      value: serverHeader,
      recommendation:
        'Remove or obfuscate the Server header to avoid revealing server software details.',
    });
  }

  const xPoweredBy = responseHeaders['x-powered-by'];
  if (xPoweredBy) {
    findings.push({
      header: 'x-powered-by',
      status: 'misconfigured',
      severity: 'low',
      value: xPoweredBy,
      recommendation:
        'Remove the X-Powered-By header to avoid revealing technology stack.',
    });
  }

  const totalChecks = SECURITY_HEADERS.length;
  const presentAndCorrect = findings.filter(
    (f) => f.status === 'present',
  ).length;
  const score = Math.round((presentAndCorrect / totalChecks) * 100);

  return { url: targetUrl, findings, score, responseHeaders };
}

function fetchHeaders(
  targetUrl: string,
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const client = targetUrl.startsWith('https') ? https : http;

    const req = client.get(targetUrl, { timeout: 10000 }, (res) => {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          headers[key.toLowerCase()] = value.join(', ');
        }
      }
      // Consume response body to free resources
      res.resume();
      resolve(headers);
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${targetUrl} timed out`));
    });
  });
}

function checkMisconfiguration(
  headerName: string,
  value: string,
): string | null {
  switch (headerName) {
    case 'strict-transport-security': {
      const maxAgeMatch = value.match(/max-age=(\d+)/);
      if (!maxAgeMatch || parseInt(maxAgeMatch[1], 10) < 31536000) {
        return 'HSTS max-age should be at least 31536000 (1 year). Consider adding includeSubDomains and preload directives.';
      }
      return null;
    }
    case 'x-frame-options': {
      const upper = value.toUpperCase();
      if (!['DENY', 'SAMEORIGIN'].includes(upper)) {
        return 'X-Frame-Options should be set to "DENY" or "SAMEORIGIN". ALLOW-FROM is deprecated.';
      }
      return null;
    }
    case 'x-content-type-options': {
      if (value.toLowerCase() !== 'nosniff') {
        return 'X-Content-Type-Options should be set to "nosniff".';
      }
      return null;
    }
    case 'content-security-policy': {
      if (value.includes("'unsafe-inline'") || value.includes("'unsafe-eval'")) {
        return 'CSP contains unsafe directives. Remove unsafe-inline and unsafe-eval where possible.';
      }
      return null;
    }
    default:
      return null;
  }
}
