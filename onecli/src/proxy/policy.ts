// Per-service policy: which service may resolve which placeholder.
// Default is DENY — anything not listed is audited and rejected.

import type { YamlValue } from '../util/yaml';

export interface ServicePolicy {
  allowedPlaceholders: Set<string>;
  token: string | null;
}

export interface PolicyConfig {
  defaultAllow: boolean;
  services: Map<string, ServicePolicy>;
}

export function policyFromConfig(raw: YamlValue): PolicyConfig {
  const root = asMap(raw, 'config');
  const policyRaw = asMap(root.policy, 'policy');
  const defaultRaw = policyRaw.default ?? 'deny';
  const defaultAllow = defaultRaw === 'allow' || defaultRaw === true;

  const services = new Map<string, ServicePolicy>();
  for (const [name, value] of Object.entries(asMap(policyRaw.services, 'policy.services'))) {
    const def = asMap(value, `policy.services.${name}`);
    const allowed = (def.allowed_placeholders ?? []) as YamlValue;
    const placeholders = new Set<string>();
    if (Array.isArray(allowed)) {
      for (const item of allowed) {
        if (typeof item === 'string') placeholders.add(item);
      }
    }
    const token = def.token;
    services.set(name, {
      allowedPlaceholders: placeholders,
      token: typeof token === 'string' && token.length > 0 ? token : null
    });
  }
  return { defaultAllow, services };
}

export class Policy {
  private config: PolicyConfig;

  constructor(config: PolicyConfig) {
    this.config = config;
  }

  replace(config: PolicyConfig): void {
    this.config = config;
  }

  /** Is `service` known to the policy at all? */
  knowsService(service: string): boolean {
    return this.config.services.has(service);
  }

  /** May `service` resolve `placeholder`? */
  allows(service: string, placeholder: string): boolean {
    const def = this.config.services.get(service);
    if (!def) return this.config.defaultAllow;
    return def.allowedPlaceholders.has(placeholder);
  }

  /** Verify a service token, when the policy requires one. */
  acceptsToken(service: string, token: string | undefined): { ok: boolean; reason?: string } {
    const def = this.config.services.get(service);
    if (!def) return { ok: false, reason: `unknown service "${service}"` };
    if (def.token === null) return { ok: true };
    if (token !== def.token) return { ok: false, reason: `bad or missing token for service "${service}"` };
    return { ok: true };
  }

  /** Masked view for the API (never leak service tokens). */
  describe(): Record<string, unknown> {
    const services: Record<string, unknown> = {};
    for (const [name, def] of this.config.services) {
      services[name] = {
        allowed_placeholders: [...def.allowedPlaceholders].sort(),
        token: def.token ? '********' : null
      };
    }
    return {
      default: this.config.defaultAllow ? 'allow' : 'deny',
      services
    };
  }
}

function asMap(value: YamlValue | undefined, where: string): Record<string, YamlValue> {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Config error: ${where} must be a map.`);
  }
  return value as Record<string, YamlValue>;
}
