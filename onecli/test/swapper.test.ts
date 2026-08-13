import { test } from 'node:test';
import * as assert from 'node:assert';
import { swapBody, swapHeaderValue, swapTemplateText, type SwapReport } from '../src/proxy/swapper';

function resolver(map: Record<string, string>) {
  return (name: string): string | undefined => map[name];
}

function freshReport(): SwapReport {
  return { resolved: [], missed: [] };
}

test('swaps template-form placeholders in header values', () => {
  const report = freshReport();
  const out = swapHeaderValue('Bearer {{OPENAI_API_KEY}}', resolver({ OPENAI_API_KEY: 'sk-123' }), report);
  assert.equal(out, 'Bearer sk-123');
  assert.deepEqual(report.resolved, ['OPENAI_API_KEY']);
});

test('swaps bare placeholder header values (exact match)', () => {
  const report = freshReport();
  const out = swapHeaderValue('OPENAI_API_KEY', resolver({ OPENAI_API_KEY: 'sk-456' }), report);
  assert.equal(out, 'sk-456');
});

test('missed header placeholders are reported and left unchanged', () => {
  const report = freshReport();
  const out = swapHeaderValue('Bearer {{UNREGISTERED_KEY}}', resolver({}), report);
  assert.equal(out, 'Bearer {{UNREGISTERED_KEY}}');
  assert.deepEqual(report.missed, ['UNREGISTERED_KEY']);
});

test('swaps JSON body values: exact and embedded', () => {
  const report = freshReport();
  const body = Buffer.from(JSON.stringify({
    key: '{{OPENAI_API_KEY}}',
    bare: 'MAILGUN_API_KEY',
    nested: { token: 'Bearer {{OPENAI_API_KEY}}' },
    untouched: 42,
    plain: 'no placeholders here'
  }));
  const out = JSON.parse(swapBody(body, resolver({ OPENAI_API_KEY: 'sk-789', MAILGUN_API_KEY: 'mg-1' }), report).toString('utf8'));
  assert.equal(out.key, 'sk-789');
  assert.equal(out.bare, 'mg-1');
  assert.equal(out.nested.token, 'Bearer sk-789');
  assert.equal(out.untouched, 42);
  assert.equal(out.plain, 'no placeholders here');
  assert.deepEqual([...report.resolved].sort(), ['MAILGUN_API_KEY', 'OPENAI_API_KEY']);
});

test('falls back to text swapping for non-JSON bodies', () => {
  const report = freshReport();
  const out = swapBody(Buffer.from('token={{OPENAI_API_KEY}}'), resolver({ OPENAI_API_KEY: 'sk-x' }), report);
  assert.equal(out.toString('utf8'), 'token=sk-x');
});

test('template text swap leaves unrelated text intact', () => {
  const report = freshReport();
  const out = swapTemplateText('hello {{ WORLD }} — but not this: abc', resolver({}), report);
  assert.equal(out, 'hello {{ WORLD }} — but not this: abc');
});
