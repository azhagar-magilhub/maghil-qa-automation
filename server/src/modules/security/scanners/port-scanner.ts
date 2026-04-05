import * as net from 'net';
import { URL } from 'url';

export interface PortResult {
  port: number;
  service: string;
  status: 'open' | 'closed' | 'filtered';
}

const COMMON_PORTS: Array<{ port: number; service: string }> = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 23, service: 'Telnet' },
  { port: 25, service: 'SMTP' },
  { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' },
  { port: 110, service: 'POP3' },
  { port: 143, service: 'IMAP' },
  { port: 443, service: 'HTTPS' },
  { port: 445, service: 'SMB' },
  { port: 993, service: 'IMAPS' },
  { port: 995, service: 'POP3S' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 5900, service: 'VNC' },
  { port: 6379, service: 'Redis' },
  { port: 8080, service: 'HTTP-Alt' },
  { port: 8443, service: 'HTTPS-Alt' },
  { port: 27017, service: 'MongoDB' },
];

export async function scanPorts(
  targetUrl: string,
): Promise<{
  host: string;
  results: PortResult[];
  openPorts: number;
  warnings: string[];
}> {
  // Stub: basic TCP port check for common ports
  // In production, this would perform actual TCP connection attempts
  const url = new URL(targetUrl);
  const host = url.hostname;

  const results: PortResult[] = [];
  const warnings: string[] = [];

  // Only check a few ports to keep the stub fast
  const portsToCheck = COMMON_PORTS.slice(0, 10);

  for (const { port, service } of portsToCheck) {
    const status = await checkPort(host, port);
    results.push({ port, service, status });
  }

  const openPorts = results.filter((r) => r.status === 'open').length;

  // Generate warnings for risky open ports
  const riskyPorts = [21, 23, 3306, 5432, 6379, 27017, 3389, 5900];
  for (const result of results) {
    if (
      result.status === 'open' &&
      riskyPorts.includes(result.port)
    ) {
      warnings.push(
        `Port ${result.port} (${result.service}) is open and should not be publicly accessible.`,
      );
    }
  }

  return { host, results, openPorts, warnings };
}

function checkPort(
  host: string,
  port: number,
  timeout = 3000,
): Promise<'open' | 'closed' | 'filtered'> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve('open');
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve('filtered');
    });

    socket.on('error', () => {
      socket.destroy();
      resolve('closed');
    });

    socket.connect(port, host);
  });
}
