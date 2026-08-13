export interface VaultKeyInfo {
  placeholder: string;
  services: string[];
  createdAt: string;
  updatedAt: string;
  maskedValue: string;
}

export interface AuditEvent {
  ts: string;
  event: string;
  service?: string;
  placeholder?: string;
  upstream?: string;
  status?: string;
  latency_ms?: number;
}

export interface OneCLIHealth {
  ok: boolean;
  version: string;
}

/**
 * REST client for the OneCLI secret guardian running inside the Empire's
 * Docker network (published on a host port, default 58080).
 */
export class OneCLIClient {
  constructor(
    private baseUrl: string,
    private adminToken: () => Promise<string | undefined>,
    private fetchImpl: typeof fetch = fetch
  ) {}

  async health(): Promise<OneCLIHealth> {
    const res = await this.fetchImpl(`${this.baseUrl}/health`);
    return (await res.json()) as OneCLIHealth;
  }

  async listKeys(masked = true): Promise<VaultKeyInfo[]> {
    const res = await this.request('GET', `/api/vault/keys?masked=${masked ? 1 : 0}`);
    return (await res.json()) as VaultKeyInfo[];
  }

  async registerKey(placeholder: string, value: string, services: string[]): Promise<void> {
    await this.request('PUT', `/api/vault/keys/${encodeURIComponent(placeholder)}`, { value, services });
  }

  async deleteKey(placeholder: string): Promise<void> {
    await this.request('DELETE', `/api/vault/keys/${encodeURIComponent(placeholder)}`);
  }

  async rotateKey(placeholder: string, newValue?: string): Promise<{ placeholder: string; rotated: boolean }> {
    const res = await this.request('POST', `/api/vault/rotate`, { placeholder, newValue });
    return (await res.json()) as { placeholder: string; rotated: boolean };
  }

  async audit(limit = 100): Promise<AuditEvent[]> {
    const res = await this.request('GET', `/api/audit?limit=${limit}`);
    return (await res.json()) as AuditEvent[];
  }

  async policy(): Promise<unknown> {
    const res = await this.request('GET', '/api/policy');
    return (await res.json()) as unknown;
  }

  private async request(method: string, pathAndQuery: string, body?: unknown): Promise<Response> {
    const token = await this.adminToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${pathAndQuery}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error(`OneCLI request failed: ${(e as Error).message}. Is the stack running?`);
    }
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.json() as { error?: string }).error ?? '';
      } catch {
        detail = await res.text();
      }
      throw new Error(`OneCLI request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ''}. Is the stack running?`);
    }
    return res;
  }
}
