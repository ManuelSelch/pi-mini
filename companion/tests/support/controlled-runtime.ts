import { FakeRuntimeAdapter } from '@manuelselch/pi-server/testing';
import type { RuntimeEvent, RuntimeSnapshot } from '@manuelselch/pi-server';
import type { ChatMessage } from '@manuelselch/pi-sdk/protocol';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

/** Controlled model boundary; server, prompt registry, SDK and application are real. */
export class ControlledRuntime extends FakeRuntimeAdapter {
  private readonly observers = new Set<(event: RuntimeEvent) => void>();
  private history: ChatMessage[] = [];
  private activeRun = false;
  private sequence = 0;
  private runId = '';
  private draft = '';
  private resolveRun?: () => void;
  private rejectRun?: (error: Error) => void;
  private lastError?: string;
  readonly sent: string[] = [];
  abortCount = 0;

  constructor(readonly runtimeId: string, readonly projectPath: string, readonly sessionsDirectory: string) { super(runtimeId); }

  override snapshot(): RuntimeSnapshot {
    return { ...super.snapshot(), sessionId: this.runtimeId, projectPath: this.projectPath,
      sessionPath: join(this.sessionsDirectory, `${this.runtimeId}.jsonl`), messages: [...this.history],
      isStreaming: this.activeRun, lastError: this.lastError };
  }

  override subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.observers.add(listener);
    const unsubscribe = super.subscribe(listener);
    return () => { this.observers.delete(listener); unsubscribe(); };
  }

  private publish(event: RuntimeEvent): void { for (const observer of this.observers) observer(event); }

  override prompt(text: string): Promise<void> {
    if (this.activeRun) throw new Error('Already running');
    this.sent.push(text);
    this.lastError = undefined;
    this.runId = `run-${++this.sequence}`;
    this.draft = '';
    const message: ChatMessage = { id: `${this.runId}-user`, role: 'user', text };
    this.history.push(message);
    this.publish({ type: 'messageFinal', runId: this.runId, message });
    this.activeRun = true;
    this.publish({ type: 'runtimeStatus', status: 'running' });
    return new Promise((resolve, reject) => { this.resolveRun = resolve; this.rejectRun = reject; });
  }

  think(): void { this.publish({ type: 'thinkingDelta', runId: this.runId, delta: 'Checking the next useful action' }); }

  stream(text: string): void {
    this.draft += text;
    this.publish({ type: 'assistantDelta', runId: this.runId, delta: text });
  }

  async finish(text: string): Promise<void> {
    const message: ChatMessage = { id: `${this.runId}-assistant`, role: 'assistant', text };
    this.history.push(message);
    this.publish({ type: 'messageFinal', runId: this.runId, message });
    await writeFile(this.snapshot().sessionPath!, this.history.map((entry) => JSON.stringify(entry)).join('\n'));
    this.activeRun = false;
    this.publish({ type: 'runtimeStatus', status: 'idle' });
    this.resolveRun?.();
    this.resolveRun = undefined;
    this.rejectRun = undefined;
  }

  fail(message: string): void {
    this.activeRun = false;
    this.lastError = message;
    this.publish({ type: 'runtimeStatus', status: 'idle', error: message });
    this.rejectRun?.(new Error(message));
    this.resolveRun = undefined;
    this.rejectRun = undefined;
  }

  failAfterAdmission(message: string): void {
    this.activeRun = false;
    this.publish({ type: 'runtimeStatus', status: 'idle' });
    this.rejectRun?.(new Error(message));
    this.resolveRun = undefined;
    this.rejectRun = undefined;
  }

  override async abort(): Promise<void> {
    this.abortCount++;
    await this.finish(this.draft);
  }

  override dispose(): void {
    this.resolveRun?.();
    this.resolveRun = undefined;
    this.observers.clear();
    super.dispose();
  }
}
