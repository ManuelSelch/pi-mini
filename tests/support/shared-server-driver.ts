import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { PiClient, createWebSocketTransport } from '@manuelselch/pi-sdk';
import { createPiServer, createPiRuntimeAdapter } from '@manuelselch/pi-server';
import { SessionManager, createAgentSessionRuntime, createAgentSessionServices, createAgentSessionFromServices, type AgentSessionRuntime } from '@earendil-works/pi-coding-agent';
import { initializeMiniSession } from '../../src/conversation/infra/initialize-mini-session';
import { sharedServerInfo } from '../../src/conversation/infra/host/shared-server';
import { Conversation } from '../../src/conversation/app/conversation';

// Real server, Pi runtime/extensions, SDK and persistence. Only model execution is
// replaced: the prompt handler appends a deterministic user/assistant exchange.
// No browser rendering or native process ownership is claimed by these tests.
export class SharedServerDriver {
  private directory?: string;
  private server?: ReturnType<typeof createPiServer>;
  private endpoint = '';
  private chat?: PiClient;
  private app?: Conversation;
  private runtimes: AgentSessionRuntime[] = [];
  private error?: Error;
  private unavailablePort?: number;
  private releaseCatalogue?: () => void;
  private catalogueGate?: Promise<void>;
  private heldRefreshes = 0;
  private catalogueBaseline = 0;
  private previousProjectSession?: string;
  private nextProject?: string;
  private connect(endpoint: string) {
    return new PiClient({ endpoint, transport: createWebSocketTransport((url) => new WebSocket(url)) });
  }
  private async until(predicate: () => boolean, description: string) {
    const deadline = Date.now() + 8000;
    while (!predicate()) {
      if (Date.now() > deadline) assert.fail(`${description}: ${JSON.stringify(this.app?.getView())}`);
      await delay(5);
    }
  }
  async startPiChatServer() {
    this.directory = await realpath(await mkdtemp(join(tmpdir(), 'mini-shared-')));
    const sessions = join(this.directory, 'sessions');
    const agentDir = join(this.directory, 'agent');
    await Promise.all([mkdir(sessions), mkdir(agentDir)]);
    await build({ entryPoints: [fileURLToPath(new URL('../../src/conversation/infra/mini-mode.ts', import.meta.url))], bundle: true, platform: 'node', format: 'esm', outfile: join(agentDir, 'extensions', 'pi-mini', 'index.js') });
    await writeFile(join(agentDir, 'extensions', 'pi-mini', 'package.json'), JSON.stringify({ type: 'module' }));
    const create = async (cwd: string) => {
      const manager = SessionManager.create(cwd, sessions);
      const runtime = await createAgentSessionRuntime(async ({ cwd, sessionManager, sessionStartEvent }) => {
        const services = await createAgentSessionServices({ cwd, agentDir, resourceLoaderOptions: {
          noSkills: true, noPromptTemplates: true,
        } });
        return { ...await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent }), services, diagnostics: services.diagnostics };
      }, { cwd, agentDir, sessionManager: manager });
      this.runtimes.push(runtime);
      const adapter = createPiRuntimeAdapter(runtime);
      await runtime.session.bindExtensions({ uiContext: adapter.uiContext(), mode: 'rpc' });
      adapter.prompt = async (text: string) => {
        const user = { role: 'user' as const, content: text, timestamp: Date.now() };
        const assistant = { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Check the router label.' }], api: 'openai-completions' as const, provider: 'fixture', model: 'fixture', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop' as const, timestamp: Date.now() };
        runtime.session.agent.state.messages.push(user, assistant);
        manager.appendMessage(user);
        manager.appendMessage(assistant);
      };
      return adapter;
    };
    this.server = createPiServer({ runtimeFactory: { newSession: create, continueProject: create, openSession: async () => { throw new Error('Unexpected open'); } }, catalogue: {
      sessionsDirectory: sessions, metadataFile: join(this.directory, 'projects.json'),
      lister: { listAll: async () => {
        const initialized = this.runtimes.length > this.catalogueBaseline && this.runtimes.at(-1)?.session.messages.some(message => message.role === 'custom' && message.customType === 'pi-mini-instructions');
        if (this.catalogueGate && initialized) {
          this.heldRefreshes++;
          try { await this.catalogueGate; }
          finally { this.heldRefreshes--; }
        }
        return SessionManager.listAll(sessions);
      } }, discovery: { forDirectory: async () => undefined },
    } });
    this.server.httpServer.listen(0, '127.0.0.1');
    await once(this.server.httpServer, 'listening');
    const address = this.server.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    this.endpoint = `ws://127.0.0.1:${address.port}/ws`;
    this.chat = this.connect(this.endpoint);
    this.chat.start();
    await this.until(() => this.chat!.getState().connection.phase === 'ready', 'Chat ready');
  }
  connectionEnvironment() {
    assert.ok(this.directory && this.endpoint);
    return { PI_MINI_ENDPOINT: this.endpoint, PI_MINI_PROJECT: this.directory };
  }
  async startPiMini() {
    const info = await sharedServerInfo(this.endpoint, this.directory);
    this.app = new Conversation(this.connect(info.endpoint), info.projectPath, initializeMiniSession);
    this.app.start();
    await this.until(() => this.app!.getView().canSend, 'Mini initialized');
  }
  async sendAndComplete(message: string) {
    assert.equal(await this.app!.send(message), true);
    await this.until(() => this.app!.getView().response === 'Check the router label.', 'deterministic response');
  }
  async expectPiChatListsMiniConversation(message: string) {
    await this.chat!.request('project.list', {});
    const sessions = this.chat!.getState().catalogue.projects.flatMap(project => project.sessions);
    assert.ok(sessions.some(session => session.firstMessage === message));
    const id = this.app!.getView().sessionId!;
    assert.ok(this.chat!.getSession(id)?.messages.some(entry => entry.role === 'user' && entry.text === message));
  }
  async takeControlInPiChat() {
    this.chat!.takeControl();
    await this.until(() => this.chat!.getState().connection.phase === 'ready', 'Chat takes control');
  }
  async expectPiMiniSuperseded() { await this.until(() => this.app!.getView().status === 'superseded', 'Mini superseded'); }
  async takeControlInPiMini() { this.app!.takeControl(); await this.until(() => this.app!.getView().canSend, 'Mini takes control'); }
  async expectPiChatSuperseded() { await this.until(() => this.chat!.getState().connection.phase === 'superseded', 'Chat superseded'); }
  async expectCompanionInstructionsDelivered() {
    const runtime = this.runtimes.at(-1)!;
    const messages = runtime.session.messages.filter(message => message.role === 'custom' && message.customType === 'pi-mini-instructions');
    assert.equal(messages.length, 1);
    assert.match(JSON.stringify(messages), /Answer briefly by default/);
    assert.equal(runtime.session.isStreaming, false);
    assert.equal(runtime.session.messages.some(message => message.role === 'user'), false);
    assert.equal(runtime.session.extensionRunner.getRegisteredCommands().some(command => command.name === 'mini-mode'), false);
    // A user message causes Pi to flush the previously inserted custom message.
    await this.sendAndComplete('Verify persistence');
    assert.match(await readFile(runtime.session.sessionManager.getSessionFile()!, 'utf8'), /pi-mini-instructions/);
  }
  async quitPiMini() { this.app!.dispose(); }
  async expectPiChatServerAvailable() {
    await this.takeControlInPiChat();
    await this.chat!.request('server.ping', {});
  }
  async startPiMiniWithoutPiChatServer() {
    const listener = createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const address = listener.address();
    assert.ok(address && typeof address !== 'string');
    this.unavailablePort = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    try { await sharedServerInfo(`ws://127.0.0.1:${address.port}/ws`); }
    catch (error) { this.error = error as Error; }
  }
  async expectSharedServerUnavailable() { assert.match(this.error?.message ?? '', /Pi Chat server unavailable/); }
  async expectNoPrivateServer() {
    await assert.rejects(fetch(`http://127.0.0.1:${this.unavailablePort}/health`));
    assert.equal(this.server, undefined);
    assert.equal(this.app, undefined);
  }
  async holdInitializationCatalogueRefresh(): Promise<void> {
    this.catalogueBaseline = this.runtimes.length;
    this.catalogueGate = new Promise(resolve => { this.releaseCatalogue = resolve; });
  }
  async shouldBeReady(): Promise<void> {
    assert.equal(this.app!.getView().canSend, true);
    assert.equal(this.app!.getView().status, 'idle');
  }
  async shouldHaveInstructions(): Promise<void> {
    const state = this.app!.client.getSession(this.app!.getView().sessionId!);
    const runtime = this.runtimes.find(runtime => runtime.session.sessionManager.getSessionFile() === state?.sessionPath);
    assert.ok(runtime, 'Selected session must have a real runtime');
    const instructions = runtime.session.messages.filter(message => message.role === 'custom' && message.customType === 'pi-mini-instructions');
    assert.equal(instructions.length, 1);
    assert.match(JSON.stringify(instructions), /Answer briefly by default/);
  }
  async shouldHaveCatalogueRefreshPending(): Promise<void> {
    await this.until(() => this.heldRefreshes > 0, 'catalogue refresh reached the gate');
    assert.ok(this.releaseCatalogue, 'Catalogue gate must not have been released');
    const state = this.app!.client.getSession(this.app!.getView().sessionId!);
    assert.equal(state?.lastOperation, undefined, 'Ready before initialization operation completion');
  }
  async switchToAnotherProject(): Promise<void> {
    this.previousProjectSession = this.app!.getView().sessionId;
    this.nextProject = join(this.directory!, 'another-project');
    await mkdir(this.nextProject);
    let switched: boolean | undefined;
    const switching = this.app!.switchProject(this.nextProject).then(result => { switched = result; });
    // Bound failures without releasing the catalogue gate to conceal the regression.
    await this.until(() => switched !== undefined, 'project switch returns before catalogue completion');
    await switching;
    assert.equal(switched, true);
  }
  async shouldHaveChangedProject(): Promise<void> {
    assert.notEqual(this.app!.getView().sessionId, this.previousProjectSession);
    const selected = this.app!.client.getSession(this.app!.getView().sessionId!);
    assert.equal(selected?.projectPath, this.nextProject);
  }

  async dispose() {
    this.releaseCatalogue?.();
    this.releaseCatalogue = undefined;
    this.catalogueGate = undefined;
    this.app?.dispose();
    this.chat?.dispose();
    await this.server?.close();
    if (this.directory) await rm(this.directory, { recursive: true, force: true });
  }
}
