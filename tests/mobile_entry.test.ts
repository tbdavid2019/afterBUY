import test from 'node:test';
import assert from 'node:assert/strict';
import { watchPwaUpdates } from '../src/client/utils/pwaUpdates.ts';
import { ITEM_PRESETS } from '../src/shared/presets.ts';

function setup() {
  const worker = Object.assign(new EventTarget(), {
    state: 'installed',
    messages: [] as unknown[],
    postMessage(message: unknown) { this.messages.push(message); },
  });
  const reg = Object.assign(new EventTarget(), {
    waiting: worker as typeof worker | null,
    installing: null as typeof worker | null,
    checks: 0,
    async update() { this.checks++; },
  });
  const container = Object.assign(new EventTarget(), {
    controller: worker,
    async register() { return reg; },
  });
  let notices = 0;
  let reloads = 0;
  const errors: unknown[] = [];
  const updates = watchPwaUpdates(container as unknown as ServiceWorkerContainer,
    () => notices++, () => reloads++, (error) => errors.push(error));
  return { worker, reg, container, updates, errors,
    get notices() { return notices; }, get reloads() { return reloads; } };
}

test('background checks and another tab activating a worker never reload this page', async () => {
  const env = setup();
  await env.updates.check();
  assert.equal(env.notices, 1);
  assert.equal(env.reg.checks, 1);
  env.container.dispatchEvent(new Event('controllerchange'));
  assert.equal(env.notices, 2);
  assert.equal(env.reloads, 0);
  assert.equal(env.worker.messages.length, 0);
  env.updates.dispose();
});

test('explicit update waits for activation then reloads only once', async () => {
  const env = setup();
  await env.updates.apply();
  assert.deepEqual(env.worker.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(env.reloads, 0);
  env.worker.state = 'activated';
  env.worker.dispatchEvent(new Event('statechange'));
  env.container.dispatchEvent(new Event('controllerchange'));
  assert.equal(env.reloads, 1);
  env.updates.dispose();
});

test('explicit update reloads when another tab has already activated the update', async () => {
  const env = setup();
  env.reg.waiting = null;
  await env.updates.apply();
  assert.equal(env.reloads, 1);
  env.updates.dispose();
});

test('newly installed update prompts without activating or reloading it', async () => {
  const env = setup();
  env.reg.waiting = null;
  await env.updates.check();
  env.reg.installing = env.worker;
  env.worker.state = 'installing';
  env.reg.dispatchEvent(new Event('updatefound'));
  env.reg.waiting = env.worker;
  env.worker.state = 'installed';
  env.worker.dispatchEvent(new Event('statechange'));
  assert.equal(env.notices, 1);
  assert.equal(env.reloads, 0);
  assert.equal(env.worker.messages.length, 0);
  env.updates.dispose();
  env.container.dispatchEvent(new Event('controllerchange'));
  env.worker.dispatchEvent(new Event('statechange'));
  assert.equal(env.notices, 1);
});

test('offline registration failure is reported without reloading', async () => {
  const container = Object.assign(new EventTarget(), {
    async register() { throw new Error('offline'); },
  });
  let reloads = 0;
  const errors: unknown[] = [];
  const updates = watchPwaUpdates(container as unknown as ServiceWorkerContainer,
    () => assert.fail('offline registration cannot offer an update'),
    () => reloads++, (error) => errors.push(error));
  await updates.check();
  assert.ok(errors.length > 0);
  assert.equal(reloads, 0);
  updates.dispose();
});

test('standard shampoo template is shared, searchable and supports stock tracking', () => {
  for (const name of ['洗髮精', '洗髮乳']) {
    const preset = ITEM_PRESETS.find((preset) => preset.name.includes(name));
    assert.ok(preset);
    assert.equal(preset.id, 'shampoo');
    assert.equal(preset.category, 'bathroom');
    assert.equal(preset.trackingMode, 'cycle');
    assert.equal(preset.cycleDays, 60);
    assert.equal(preset.minStockAlert, 1);
  }
  assert.equal(new Set(ITEM_PRESETS.map((preset) => preset.id)).size, ITEM_PRESETS.length);
});
