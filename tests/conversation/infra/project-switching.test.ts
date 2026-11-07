import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { PiClient, createWebSocketTransport } from '@manuelselch/pi-sdk';
import { importKnownProjects, startCompanionHost } from '../../../src/conversation/infra/host/server';
import { Conversation } from '../../../src/conversation/app/conversation';
import { ControlledRuntime } from '../../support/controlled-runtime';

test('project discovery imports paths without copying Pi Chat history', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-discovery-')));
  try {
    const project = join(root, 'project');
    const agent = join(root, 'agent');
    const metadata = join(root, 'mini.json');
    await mkdir(project);
    await mkdir(join(agent, 'pi-chat'), { recursive: true });
    await writeFile(join(agent, 'pi-chat', 'projects.json'), JSON.stringify({ pins: [project], archives: [{ firstMessage: 'private transcript' }] }));
    await importKnownProjects(metadata, agent, async () => [{ cwd: project }]);
    const imported = JSON.parse(await readFile(metadata, 'utf8'));
    assert.deepEqual(imported.pins, [project]);
    assert.deepEqual(imported.archives, []);
    assert.doesNotMatch(JSON.stringify(imported), /private transcript/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('selecting a project always creates a new session without reusing the previous answer', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-switch-')));
  const first = join(root, 'first');
  const second = join(root, 'second');
  const sessions = join(root, 'data', 'sessions');
  await Promise.all([mkdir(first), mkdir(second)]);
  let count = 0;
  const paths: string[] = [];
  const host = await startCompanionHost({ dataDirectory: join(root, 'data'), projectPath: first, discoverProjects: false, runtimeFactory: {
    newSession: async (path) => { paths.push(path); return new ControlledRuntime(`session-${++count}`, path, sessions); },
    continueProject: async () => { throw new Error('Unexpected resume'); },
    openSession: async () => { throw new Error('Unexpected open'); },
  } });
  const client = new PiClient({ endpoint: host.info.endpoint, transport: createWebSocketTransport((url) => new WebSocket(url)) });
  const app = new Conversation(client, first);
  try {
    app.start();
    const deadline = Date.now() + 5000;
    while (!app.getView().canSend && Date.now() < deadline) await delay(5);
    assert.equal(app.getView().canSend, true);
    const original = app.getView().sessionId;
    assert.equal(await app.switchProject(second), true);
    const next = app.getView().sessionId;
    assert.notEqual(next, original);
    assert.equal(app.getView().projectName, 'second');
    assert.equal(app.getView().response, '');
    assert.equal(await app.switchProject(second), true);
    assert.notEqual(app.getView().sessionId, next);
    assert.deepEqual(paths, [first, second, second]);
  } finally {
    app.dispose();
    await host.close();
    await rm(root, { recursive: true, force: true });
  }
});
