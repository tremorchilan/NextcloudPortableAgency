// Minimal YAML-subset parser — enough for OneCLI's config format:
// nested maps, sequences of scalars, scalar literals, `#` comments,
// 2-space indentation. Anything fancier throws a clear error.

export type YamlScalar = string | number | boolean | null;
export type YamlValue = YamlScalar | YamlValue[] | { [key: string]: YamlValue };

interface Line {
  indent: number;
  key: string;
  value: string | null; // null → block map/list follows
  listItem: boolean;
  lineNo: number;
}

export function parseYaml(text: string): YamlValue {
  const lines: Line[] = [];
  text.split('\n').forEach((raw, i) => {
    const lineNo = i + 1;
    const withoutComment = raw.replace(/(^|\s)#.*$/, '').replace(/\s+$/, '');
    if (withoutComment.trim() === '') return;
    if (/^\s*\t/.test(raw)) {
      throw new Error(`yaml: tabs are not allowed for indentation (line ${lineNo}).`);
    }
    const indent = raw.length - raw.trimStart().length;
    const trimmed = withoutComment.trim();
    if (trimmed.startsWith('- ')) {
      lines.push({ indent, key: '', value: trimmed.slice(2).trim(), listItem: true, lineNo });
      return;
    }
    const colon = trimmed.indexOf(':');
    if (colon === -1) {
      throw new Error(`yaml: expected "key: value" (line ${lineNo}): "${trimmed}".`);
    }
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    lines.push({ indent, key, value: value === '' ? null : value, listItem: false, lineNo });
  });

  const root: { [key: string]: YamlValue } = {};
  const stack: Array<{ indent: number; key: string; container: YamlValue }> = [];

  const assign = (key: string, value: YamlValue): void => {
    const parent = stack.length ? stack[stack.length - 1].container : root;
    if (Array.isArray(parent)) {
      parent.push(value);
    } else {
      (parent as { [key: string]: YamlValue })[key] = value;
    }
  };

  for (const line of lines) {
    while (stack.length && line.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (line.listItem) {
      const parent = stack.length ? stack[stack.length - 1].container : root;
      if (!Array.isArray(parent)) {
        throw new Error(`yaml: list item needs a list parent (line ${line.lineNo}).`);
      }
      const scalar = line.value === null ? null : parseScalar(line.value, line.lineNo);
      if (scalar !== null && typeof scalar !== 'object') {
        parent.push(scalar);
      } else if (scalar === null) {
        const list = [] as YamlValue[];
        parent.push(list);
        stack.push({ indent: line.indent, key: '', container: list });
      }
      continue;
    }

    if (stack.length && line.indent <= stack[stack.length - 1].indent) {
      // handled by the pop loop above
    }

    if (line.value === null) {
      const container: YamlValue = {};
      assign(line.key, container);
      stack.push({ indent: line.indent, key: line.key, container });
    } else {
      assign(line.key, parseScalar(line.value, line.lineNo));
    }
  }

  return root;
}

function parseScalar(raw: string, lineNo: number): YamlValue {
  const text = raw.trim();
  if (text === 'null' || text === '~' || text === '') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+$/.test(text)) {
    const n = Number(text);
    if (Number.isSafeInteger(n)) return n;
  }
  if (/^-?\d*\.\d+$/.test(text)) return Number(text);
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  // Inline list like [a, b] — support the common scalar case.
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((part) => parseScalar(part.trim(), lineNo)) as YamlValue[];
  }
  return text;
}
