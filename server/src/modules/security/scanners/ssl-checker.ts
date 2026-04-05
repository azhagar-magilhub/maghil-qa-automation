import * as tls from 'tls';
import * as https from 'https';
import { URL } from 'url';

export interface SSLReport {
  host: string;
  port: number;
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  protocol: string;
  cipher: string;
  keyExchange: string;
  serialNumber: string;
  fingerprint: string;
  selfSigned: boolean;
  expired: boolean;
  warnings: string[];
}

export async function checkSSL(targetUrl: string): Promise<SSLReport> {
  const url = new URL(targetUrl);
  const host = url.hostname;
  const port = url.port ? parseInt(url.port, 10) : 443;

  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: host,
        port,
        path: '/',
        method: 'HEAD',
        rejectUnauthorized: false,
        timeout: 10000,
      },
      (res) => {
        const socket = res.socket as tls.TLSSocket;

        if (!socket.getPeerCertificate) {
          res.resume();
          reject(new Error('Unable to retrieve SSL certificate'));
          return;
        }

        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol() || 'unknown';

        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        const expired = validTo < now;
        const selfSigned =
          cert.issuer?.O === cert.subject?.O &&
          cert.issuer?.CN === cert.subject?.CN;

        const warnings: string[] = [];

        if (expired) {
          warnings.push('Certificate has expired.');
        }
        if (daysUntilExpiry <= 30 && !expired) {
          warnings.push(
            `Certificate expires in ${daysUntilExpiry} days. Renew soon.`,
          );
        }
        if (selfSigned) {
          warnings.push(
            'Certificate appears to be self-signed. Use a trusted CA.',
          );
        }
        if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
          warnings.push(
            `Deprecated TLS version: ${protocol}. Upgrade to TLSv1.2 or TLSv1.3.`,
          );
        }
        if (!socket.authorized) {
          warnings.push(
            'Certificate is not trusted by the system certificate store.',
          );
        }

        const report: SSLReport = {
          host,
          port,
          valid: socket.authorized && !expired,
          issuer: formatDN(cert.issuer as any),
          subject: formatDN(cert.subject as any),
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry,
          protocol,
          cipher: cipher?.name || 'unknown',
          keyExchange: cipher?.standardName || 'unknown',
          serialNumber: cert.serialNumber || 'unknown',
          fingerprint: cert.fingerprint || 'unknown',
          selfSigned,
          expired,
          warnings,
        };

        res.resume();
        resolve(report);
      },
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`SSL check timed out for ${host}:${port}`));
    });
  });
}

function formatDN(
  obj: Record<string, string | string[]> | undefined,
): string {
  if (!obj) return 'unknown';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const v = Array.isArray(value) ? value.join(', ') : value;
    parts.push(`${key}=${v}`);
  }
  return parts.join(', ') || 'unknown';
}
