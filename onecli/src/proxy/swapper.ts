// Placeholder swapping.
//
// A placeholder is `{{NAME}}` (NAME: uppercase letters, digits, underscores).
// Two matching forms are supported:
//   - Template form  `{{NAME}}` anywhere in a header value or text/JSON body.
//   - Bare form       the exact value `NAME` (header values like
//                     `Authorization: Bearer OPENAI_API_KEY`, or exact
//                     string values inside JSON bodies).

export const PLACEHOLDER_PATTERN = /\{\{([A-Z][A-Z0-9_]{2,63})\}\}/g;
export const BARE_PLACEHOLDER_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

export type KeyResolver = (placeholder: string) => string | undefined;

export interface SwapReport {
  resolved: string[];
  missed: string[];
}

/** Record a resolution/miss without duplicates (order preserved). */
export function record(report: SwapReport, list: 'resolved' | 'missed', name: string): void {
  if (!report[list].includes(name)) report[list].push(name);
}

export function swapHeaderValue(value: string, resolve: KeyResolver, report: SwapReport): string {
  if (typeof value !== 'string') return value;
  if (BARE_PLACEHOLDER_PATTERN.test(value)) {
    const real = resolve(value);
    if (real !== undefined) {
      record(report, 'resolved', value);
      return real;
    }
    record(report, 'missed', value);
    return value;
  }
  return swapTemplateText(value, resolve, report);
}

export function swapTemplateText(text: string, resolve: KeyResolver, report: SwapReport): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const real = resolve(name);
    if (real !== undefined) {
      record(report, 'resolved', name);
      return real;
    }
    record(report, 'missed', name);
    return match; // leave untouched — a miss in a body is not fatal
  });
}

/**
 * Swap placeholders inside a JSON body: exact `{{NAME}}`/bare string values
 * are replaced with real keys; `{{NAME}}` occurrences inside longer strings
 * are substituted. Non-JSON content falls back to plain template swapping.
 */
export function swapBody(buffer: Buffer, resolve: KeyResolver, report: SwapReport): Buffer {
  const text = buffer.toString('utf8');
  if (!text.includes('{{') && !looksLikeBarePlaceholder(text)) return buffer;

  try {
    const parsed = JSON.parse(text) as unknown;
    const walked = walk(parsed, resolve, report);
    return Buffer.from(JSON.stringify(walked), 'utf8');
  } catch {
    return Buffer.from(swapTemplateText(text, resolve, report), 'utf8');
  }
}

function walk(value: unknown, resolve: KeyResolver, report: SwapReport): unknown {
  if (typeof value === 'string') {
    if (BARE_PLACEHOLDER_PATTERN.test(value) || /^\{\{[A-Z][A-Z0-9_]{2,63}\}\}$/.test(value)) {
      const name = value.replace(/[{}]/g, '');
      const real = resolve(name);
      if (real !== undefined) {
        record(report, 'resolved', name);
        return real;
      }
      record(report, 'missed', name);
      return value;
    }
    return swapTemplateText(value, resolve, report);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, resolve, report));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, resolve, report);
    }
    return out;
  }
  return value;
}

function looksLikeBarePlaceholder(text: string): boolean {
  // Cheap pre-check before attempting JSON.parse.
  return /^\s*[A-Z][A-Z0-9_]{2,63}\s*$/.test(text);
}
