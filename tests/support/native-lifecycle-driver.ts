import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { PiClient, createWebSocketTransport } from '@manuelselch/pi-sdk';
import WebSocket from 'ws';
import { startCompanionHost } from '../../src/conversation/infra/host/server';

interface Report {
  error?: string;
  sessionId?: string;
  response?: string;
  draft?: string;
  draftState?: string;
  composerFocused?: boolean;
  visible?: boolean;
  focused?: boolean;
  width?: number;
  height?: number;
  resizable?: boolean;
  hasCollapseControl?: boolean;
  backendPid?: number;
  endpoint?: string;
  status?: string;
  phase?: string;
  connectionId?: string;
}

export class RemainingMvpDriver {
  private directory?: string;
  private child?: ChildProcessWithoutNullStreams;
  private exited = false;
  private stderr = '';
  private initial?: Report;
  private lastProbe?: Report;
  private id = 0;
  private previousApplication?: number;
  private requests = new Map<
    number,
    { resolve: (report: Report) => void; reject: (error: Error) => void }
  >();
  private normalHost?: Awaited<ReturnType<typeof startCompanionHost>>;
  private normalDirectory?: string;
  private normalClient?: PiClient;
  private readonly tool = fileURLToPath(
    new URL('../../src-tauri/target/native-input', import.meta.url),
  );

  private input(action: string, value?: number): string {
    const executable = ['shortcut', 'quit'].includes(action)
      ? this.tool.replace(/native-input$/, 'native-key')
      : this.tool;
    const result = spawnSync(
      executable,
      [action, ...(value === undefined ? [] : [String(value)])],
      { encoding: 'utf8', timeout: 8000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }

  private async until(
    predicate: () => boolean | Promise<boolean>,
    description: string,
    allowExit = false,
  ): Promise<void> {
    const deadline = Date.now() + 15_000;
    while (!(await predicate())) {
      if (!allowExit && this.exited)
        assert.fail(`Companion exited while ${description}. ${this.stderr}`);
      if (Date.now() >= deadline)
        assert.fail(
          `Timed out: ${description}. Probe: ${JSON.stringify(this.lastProbe)}. ${this.stderr}`,
        );
      await delay(20);
    }
  }

  private command(action: string, text?: string): Promise<Report> {
    assert.ok(this.child && !this.exited, 'Native companion is not running');
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requests.delete(id);
        reject(new Error(`Native command ${action} timed out. ${this.stderr}`));
      }, 5000);
      this.requests.set(id, {
        resolve: (report) => {
          clearTimeout(timeout);
          if (report.error) reject(new Error(report.error));
          else resolve(report);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.child!.stdin.write(JSON.stringify({ id, action, text }) + '\n');
    });
  }

  async launchCompanion(): Promise<void> {
    this.previousApplication = Number(this.input('frontmost'));
    this.directory = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-lifecycle-')));
    const executable = fileURLToPath(
      new URL('../../src-tauri/target/debug/pi-mini', import.meta.url),
    );
    this.child = spawn(executable, ['--lifecycle-test'], {
      env: { ...process.env, PI_MINI_SMOKE_DATA_DIR: this.directory },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.on('error', (error) => {
      this.stderr += error.message;
      this.exited = true;
    });
    this.child.on('close', () => {
      this.exited = true;
      for (const pending of this.requests.values())
        pending.reject(new Error(`Native app exited. ${this.stderr}`));
      this.requests.clear();
    });
    this.child.stderr.on('data', (data: Buffer) => {
      this.stderr = (this.stderr + data.toString()).slice(-500_000);
    });
    const lines = createInterface({ input: this.child.stdout });
    lines.on('line', (line) => {
      if (!line.startsWith('MINI_LIFECYCLE:')) return;
      const { id, report } = JSON.parse(line.slice('MINI_LIFECYCLE:'.length)) as {
        id: number;
        report: Report;
      };
      if (report.sessionId) this.lastProbe = report;
      if (id === 0) {
        this.initial = report;
        return;
      }
      this.requests.get(id)?.resolve(report);
      this.requests.delete(id);
    });
    await this.until(() => Boolean(this.initial), 'initial SDK runtime ready');
    assert.equal(this.initial!.error, undefined);
    this.input('activate', this.child.pid);
    await this.until(
      () => Number(this.input('frontmost')) === this.child!.pid,
      'native application activated',
    );
    assert.equal(this.initial!.phase, 'ready');
    await this.until(async () => {
      const report = await this.command('probe');
      return report.focused === true && report.composerFocused === true;
    }, 'initial native composer focus');
  }

  async enterDraft(text: string): Promise<void> {
    await this.command('draft', text);
    await this.until(async () => {
      const report = await this.command('probe');
      return report.draft === text && report.draftState === text;
    }, 'composer draft entered');
  }
  async showCompanionFromMenuBar(): Promise<void> {
    this.input('menu-show', this.child!.pid);
  }
  async expectMenuBarPresenceWithoutDockOrAppSwitcher(): Promise<void> {
    this.input('presence', this.child!.pid);
  }
  async quitCompanionFromMenuBar(): Promise<void> {
    this.input('menu-quit', this.child!.pid);
    await this.until(() => this.exited, 'menu bar Quit exited', true);
  }
  async pressEscape(): Promise<void> {
    await this.command('escape');
  }
  async expectAgentStoppedAndWindowVisible(): Promise<void> {
    await this.until(async () => {
      const report = await this.command('probe');
      return report.visible === true && report.status === 'idle';
    }, 'agent stopped with window visible');
  }
  async expectCompanionHidden(): Promise<void> {
    await this.until(
      async () => (await this.command('probe')).visible === false,
      'native window hidden',
    );
  }
  async switchToAnotherApplication(): Promise<void> {
    this.input('other');
    await this.until(
      () => Number(this.input('frontmost')) !== this.child!.pid,
      'another app has focus',
    );
  }
  async pressGlobalShortcut(): Promise<void> {
    this.input('shortcut');
  }
  async expectCompanionVisibleAndComposerFocused(): Promise<void> {
    await this.until(async () => {
      const report = await this.command('probe');
      return (
        report.visible === true &&
        report.focused === true &&
        report.composerFocused === true &&
        Number(this.input('frontmost')) === this.child!.pid
      );
    }, 'companion restored native and composer focus');
  }
  async expectFixedWindowWithoutCollapseControls(): Promise<void> {
    const report = await this.command('probe');
    assert.equal(report.width, 360);
    assert.equal(report.height, 380);
    assert.equal(report.resizable, false);
    assert.equal(report.hasCollapseControl, false);
  }
  async expectSameSessionAndDraft(text: string): Promise<void> {
    const report = await this.command('probe');
    assert.equal(report.sessionId, this.initial!.sessionId);
    assert.equal(report.draft, text);
    assert.equal(report.backendPid, this.initial!.backendPid);
    assert.equal(report.endpoint, this.initial!.endpoint);
    assert.equal(report.phase, 'ready');
    assert.equal(report.connectionId, this.initial!.connectionId);
  }
  async send(text: string): Promise<void> {
    await this.enterDraft(text);
    await this.command('send');
    await this.until(
      async () => ['thinking', 'running'].includes((await this.command('probe')).status ?? ''),
      'native composer submitted',
    );
  }
  async closeCompanionWindow(): Promise<void> {
    await this.command('close');
  }
  async agentFinishes(text: string): Promise<void> {
    await this.command('finishAgent', text);
  }
  async expectLatestAssistant(text: string): Promise<void> {
    await this.until(
      async () => (await this.command('probe')).response === text,
      'background completion displayed',
    );
  }
  async expectSameSessionAndSingleSubmission(text: string): Promise<void> {
    const report = await this.command('probe');
    assert.equal(report.sessionId, this.initial!.sessionId);
    assert.equal(report.backendPid, this.initial!.backendPid);
    assert.equal(report.phase, 'ready');
    assert.equal(report.connectionId, this.initial!.connectionId);
    const sent = this.stderr
      .split('\n')
      .filter((line) => line.startsWith('PI_MINI_FIXTURE_SENT '))
      .map((line) => JSON.parse(line.slice('PI_MINI_FIXTURE_SENT '.length)) as { message: string });
    assert.deepEqual(
      sent.map((entry) => entry.message),
      [text],
    );
  }
  async connectNormalPiChat(): Promise<void> {
    this.normalDirectory = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-normal-')));
    this.normalHost = await startCompanionHost({ dataDirectory: this.normalDirectory });
    this.normalClient = new PiClient({
      endpoint: this.normalHost.info.endpoint,
      transport: createWebSocketTransport((url) => new WebSocket(url)),
    });
    this.normalClient.start();
    await this.until(
      () => this.normalClient!.getState().connection.phase === 'ready',
      'normal server ready',
    );
  }
  async quitCompanion(): Promise<void> {
    this.input('activate', this.child!.pid);
    await this.until(
      () => Number(this.input('frontmost')) === this.child!.pid,
      'app focused before explicit Quit',
    );
    this.input('quit');
    await this.until(() => this.exited, 'explicit Cmd+Q exited', true);
  }
  private alive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  async expectOwnedProcessAndListenerStopped(): Promise<void> {
    assert.equal(this.exited, true);
    await this.until(() => !this.alive(this.initial!.backendPid!), 'owned backend exited', true);
    const url = this.initial!.endpoint!.replace('ws:', 'http:').replace('/ws', '/health');
    await assert.rejects(fetch(url, { signal: AbortSignal.timeout(1000) }));
  }
  async expectNormalPiChatUnaffected(): Promise<void> {
    assert.equal(this.normalClient!.getState().connection.phase, 'ready');
    await this.normalClient!.request('server.ping', {});
  }
  async dispose(): Promise<void> {
    try {
      if (this.child && !this.exited) {
        this.child.stdin.end();
        try {
          await this.until(() => this.exited, 'native test cleanup', true);
        } catch {
          this.child.kill('SIGKILL');
        }
      }
      if (this.initial?.backendPid)
        await this.until(
          () => !this.alive(this.initial!.backendPid!),
          'owned backend cleanup',
          true,
        );
    } finally {
      this.normalClient?.dispose();
      await this.normalHost?.close();
      if (this.directory) await rm(this.directory, { recursive: true, force: true });
      if (this.normalDirectory) await rm(this.normalDirectory, { recursive: true, force: true });
      if (
        this.previousApplication &&
        this.alive(this.previousApplication) &&
        this.previousApplication !== this.child?.pid
      )
        this.input('activate', this.previousApplication);
    }
  }
}
