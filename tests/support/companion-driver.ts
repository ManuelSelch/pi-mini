import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { mkdtemp, mkdir, rm, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PiClient, createWebSocketTransport, type TransportFactory } from '@manuelselch/pi-sdk';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { Conversation } from '../../src/conversation/app/conversation';
import { createCompanionAgentRuntime } from '../../src/conversation/infra/host/runtime';
import { startCompanionHost } from '../../src/conversation/infra/host/server';
import { ControlledRuntime } from './controlled-runtime';

type Host = Awaited<ReturnType<typeof startCompanionHost>>;
type Request = {
  method: string;
  params: { message?: string; result?: { cancelled: boolean; value?: unknown } };
};

export class CompanionDriver {
  private directory?: string;
  private host?: Host;
  private normalHost?: Host;
  private normalClient?: PiClient;
  private replacement?: PiClient;
  private app?: Conversation;
  private runtime?: ControlledRuntime;
  private socket?: WebSocket;
  private requests: Request[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sessionId?: string;
  private promptResult?: Promise<unknown>;
  private expectedHistory = '';

  private async workspace(): Promise<string> {
    this.directory ??= await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-test-')));
    return this.directory;
  }

  private async until(predicate: () => boolean, description: string): Promise<void> {
    const deadline = Date.now() + 8000;
    while (!predicate()) {
      if (Date.now() >= deadline)
        assert.fail(`Timed out: ${description}. View: ${JSON.stringify(this.app?.getView())}`);
      await delay(5);
    }
  }

  async connectNormalPiChat(): Promise<void> {
    const directory = await this.workspace();
    this.normalHost = await startCompanionHost({
      dataDirectory: join(directory, 'normal-pi-chat'),
    });
    const saved = SessionManager.create(
      this.normalHost.info.projectPath,
      this.normalHost.storage.sessionsDirectory,
    );
    saved.appendMessage({
      role: 'user',
      content: 'Normal Pi Chat history only',
      timestamp: Date.now(),
    });
    this.normalClient = new PiClient({
      endpoint: this.normalHost.info.endpoint,
      transport: createWebSocketTransport((url) => new WebSocket(url)),
    });
    this.normalClient.start();
    await this.until(
      () => this.normalClient!.getState().connection.phase === 'ready',
      'normal controller ready',
    );
  }

  async startCompanion(): Promise<void> {
    const directory = await this.workspace();
    const dataDirectory = join(directory, 'companion');
    const projectPath = join(dataDirectory, 'workspace');
    const sessionsDirectory = join(dataDirectory, 'sessions');
    await mkdir(projectPath, { recursive: true });
    await mkdir(sessionsDirectory, { recursive: true });
    this.host = await startCompanionHost({
      dataDirectory,
      projectPath,
      runtimeFactory: {
        newSession: async () =>
          (this.runtime = new ControlledRuntime(
            'companion-session',
            projectPath,
            sessionsDirectory,
          )),
        continueProject: async () => {
          throw new Error('Unexpected continue');
        },
        openSession: async () => {
          throw new Error('Unexpected open');
        },
      },
    });
    const base = createWebSocketTransport((url) => (this.socket = new WebSocket(url)));
    const transport: TransportFactory = (endpoint, handlers) => {
      const socket = base(endpoint, handlers);
      return {
        ...socket,
        send: (text) => {
          this.requests.push(JSON.parse(text) as Request);
          socket.send(text);
        },
      };
    };
    const client = new PiClient({
      endpoint: this.host.info.endpoint,
      transport,
      scheduler: {
        setTimeout: (callback, milliseconds) => {
          const handle = setTimeout(() => {
            this.timers.delete(handle);
            callback();
          }, milliseconds);
          this.timers.add(handle);
          return handle;
        },
        clearTimeout: (handle) => {
          clearTimeout(handle as ReturnType<typeof setTimeout>);
          this.timers.delete(handle as ReturnType<typeof setTimeout>);
        },
      },
    });
    this.app = new Conversation(client, this.host.info.projectPath);
    this.app.start();
    await this.until(() => this.app!.getView().canSend, 'companion session ready');
    this.sessionId = this.app.getView().sessionId;
  }

  async expectIndependentBackendAndStorage(): Promise<void> {
    assert.notEqual(this.host!.info.endpoint, this.normalHost!.info.endpoint);
    assert.notEqual(
      this.host!.storage.sessionsDirectory,
      this.normalHost!.storage.sessionsDirectory,
    );
    assert.notEqual(this.host!.storage.metadataFile, this.normalHost!.storage.metadataFile);
    assert.equal(
      this.runtime!.snapshot().sessionPath!.startsWith(this.host!.storage.sessionsDirectory),
      true,
    );
    const normalHistory = this.normalClient!.getState().catalogue.projects.flatMap(
      (project) => project.sessions,
    );
    assert.equal(
      normalHistory.some((session) => session.firstMessage === 'Normal Pi Chat history only'),
      true,
    );
    const companionHistory = this.app!.client.getState().catalogue.projects.flatMap(
      (project) => project.sessions,
    );
    assert.equal(
      companionHistory.some((session) => session.firstMessage === 'Normal Pi Chat history only'),
      false,
    );
    assert.equal(
      companionHistory.every((session) =>
        session.path.startsWith(this.host!.storage.sessionsDirectory),
      ),
      true,
    );
  }

  async expectNormalPiChatStillControlsItsBackend(): Promise<void> {
    assert.equal(this.normalClient!.getState().connection.phase, 'ready');
    await this.normalClient!.request('server.ping', {});
  }

  async send(text: string): Promise<void> {
    assert.equal(await this.app!.send(text), true);
  }
  async agentStartsThinking(): Promise<void> {
    this.runtime!.think();
  }
  async expectStatus(status: string): Promise<void> {
    await this.until(() => this.app!.getView().status === status, `status ${status}`);
  }
  async agentStreams(text: string): Promise<void> {
    this.runtime!.stream(text);
    await this.until(
      () => this.app!.client.getSession(this.sessionId!)?.draft?.text.endsWith(text) === true,
      'stream delta observed by SDK',
    );
  }
  async agentStreamsWhileDisconnected(text: string): Promise<void> {
    assert.notEqual(this.app!.client.getState().connection.phase, 'ready');
    this.runtime!.stream(text);
  }
  async expectLatestAssistant(text: string): Promise<void> {
    await this.until(() => this.app!.getView().response === text, `assistant response ${text}`);
  }
  async expectNoInventedStepCount(): Promise<void> {
    assert.doesNotMatch(this.app!.getView().response, /step \d+ of \d+/i);
    assert.equal('step' in this.app!.getView(), false);
  }
  async agentFinishes(text: string): Promise<void> {
    await this.runtime!.finish(text);
  }

  async expectCompanionInstructionsDelivered(): Promise<void> {
    const agentDirectory = join(await this.workspace(), 'isolated-agent');
    await mkdir(agentDirectory, { recursive: true });
    const runtime = await createCompanionAgentRuntime(
      {
        projectPath: this.host!.info.projectPath,
        sessionsDirectory: this.host!.storage.sessionsDirectory,
        agentDirectory,
      },
      SessionManager.inMemory(this.host!.info.projectPath),
    );
    try {
      const effectivePrompt = runtime.session.systemPrompt;
      assert.match(effectivePrompt, /Answer briefly by default/);
      assert.match(effectivePrompt, /one actionable step, then wait/);
      assert.match(effectivePrompt, /Offer more explanation when asked/);
      assert.match(effectivePrompt, /Preserve essential warnings/);
      assert.match(effectivePrompt, /Do not invent a fixed step count/);
    } finally {
      await runtime.dispose();
    }
  }

  async stop(): Promise<void> {
    await this.app!.stop();
    await this.until(() => this.app!.getView().canSend, 'idle after stop');
  }
  async expectAbortForSelectedSession(): Promise<void> {
    assert.equal(this.runtime!.abortCount, 1);
    assert.equal(this.requests.filter((r) => r.method === 'run.abort').length, 1);
  }
  async expectSessionRetained(): Promise<void> {
    assert.equal(this.app!.getView().sessionId, this.sessionId);
  }
  async agentFails(message: string): Promise<void> {
    this.runtime!.fail(message);
  }
  async agentFailsAfterAdmission(message: string): Promise<void> {
    this.runtime!.failAfterAdmission(message);
  }
  async expectVisibleError(message: string): Promise<void> {
    await this.until(
      () => this.app!.getView().error?.includes(message) === true,
      'error exposed to UI',
    );
  }
  async expectComposerAvailable(): Promise<void> {
    await this.until(() => this.app!.getView().canSend, 'composer available');
  }

  async agentRequestsSelect(title: string, options: string[]): Promise<void> {
    this.promptResult = this.runtime!.uiContext().select(title, options);
    await this.until(() => this.app!.getView().question?.title === title, 'select prompt');
  }
  async agentRequestsConfirm(title: string): Promise<void> {
    this.promptResult = this.runtime!.uiContext().confirm(title, '');
    await this.until(() => this.app!.getView().question?.title === title, 'confirm prompt');
  }
  async agentRequestsInput(title: string): Promise<void> {
    this.promptResult = this.runtime!.uiContext().input(title);
    await this.until(() => this.app!.getView().question?.title === title, 'input prompt');
  }
  async choose(label: string): Promise<void> {
    const question = this.app!.getView().question!;
    assert.equal(
      await this.app!.answer(question.id, {
        cancelled: false,
        value: question.kind === 'confirm' ? label === 'Yes' : label,
      }),
      true,
    );
  }
  async expectPromptAnswer(answer: unknown): Promise<void> {
    assert.equal(await this.promptResult, answer);
    await this.until(() => !this.app!.getView().question, 'prompt removed');
    assert.deepEqual(this.requests.findLast((r) => r.method === 'prompt.answer')!.params.result, {
      cancelled: false,
      value: answer,
    });
  }
  async submitComposer(text: string): Promise<void> {
    const question = this.app!.getView().question!;
    assert.equal(await this.app!.answer(question.id, { cancelled: false, value: text }), true);
  }
  async sendFollowUp(text: string): Promise<void> {
    await this.send(text);
  }
  async expectNormalUserMessage(text: string): Promise<void> {
    assert.equal(this.requests.findLast((r) => r.method === 'message.send')?.params.message, text);
    assert.equal(this.runtime!.sent.at(-1), text);
  }
  async expectNoFollowUpPromptOrTimeout(): Promise<void> {
    assert.equal(this.app!.getView().question, undefined);
    assert.equal(this.runtime!.snapshot().prompts.length, 0);
    assert.equal(this.requests.filter((r) => r.method === 'prompt.answer').length, 3);
  }

  async disconnectTransport(): Promise<void> {
    this.socket!.close();
    await this.until(
      () => this.app!.client.getState().connection.phase === 'reconnecting',
      'connection dropped',
    );
    this.expectedHistory = 'Connection checked while disconnected.';
    await this.runtime!.finish(this.expectedHistory);
  }
  async dropTransportWhileRunning(): Promise<void> {
    this.socket!.close();
    await this.until(
      () => this.app!.client.getState().connection.phase === 'reconnecting',
      'connection dropped mid-run',
    );
  }
  async restoreTransport(): Promise<void> {
    await this.until(
      () => this.app!.client.getState().connection.phase === 'ready',
      'SDK reconnect',
    );
  }
  async expectSameSessionAndFinalizedHistory(): Promise<void> {
    await this.expectSessionRetained();
    await this.expectLatestAssistant(this.expectedHistory);
    assert.match(
      await readFile(this.runtime!.snapshot().sessionPath!, 'utf8'),
      /Connection checked while disconnected/,
    );
  }
  async expectMessageSentOnce(text: string): Promise<void> {
    assert.equal(
      this.requests.filter((r) => r.method === 'message.send' && r.params.message === text).length,
      1,
    );
  }
  async replaceController(): Promise<void> {
    this.replacement = new PiClient({
      endpoint: this.host!.info.endpoint,
      transport: createWebSocketTransport((url) => new WebSocket(url)),
    });
    this.replacement.start();
    await this.until(
      () => this.replacement!.getState().connection.phase === 'ready',
      'replacement controller',
    );
  }
  async expectNoAutomaticTakeover(): Promise<void> {
    assert.equal(this.app!.client.getState().connection.phase, 'superseded');
    assert.equal(this.timers.size, 0, 'No reconnect or takeover timers remain');
    await this.replacement!.request('server.ping', {});
  }
  async explicitlyTakeControl(): Promise<void> {
    this.app!.takeControl();
  }
  async expectSameSessionReady(): Promise<void> {
    await this.until(() => this.app!.getView().canSend, 'explicit control reclaimed');
    await this.expectSessionRetained();
    await this.expectLatestAssistant(this.expectedHistory);
  }

  async dispose(): Promise<void> {
    this.app?.dispose();
    this.normalClient?.dispose();
    this.replacement?.dispose();
    try {
      await Promise.all([this.host?.close(), this.normalHost?.close()]);
    } finally {
      for (const timer of this.timers) clearTimeout(timer);
      if (this.directory) await rm(this.directory, { recursive: true, force: true });
    }
  }
}
