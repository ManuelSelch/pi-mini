import type { PiClient, ReadonlyDeep, ClientState } from '@manuelselch/pi-sdk';
import type { UiPromptResult } from '@manuelselch/pi-sdk/protocol';
import { emptyView, type CompanionStatus, type ConversationView, type Question } from '../domain/view';

export class Conversation {
  private view: ConversationView = emptyView;
  private readonly listeners = new Set<() => void>();
  private unsubscribe?: () => void;
  private unsubscribeMessages?: () => void;
  private selectedId?: string;
  private creating = false;
  private initializationFailed = false;
  private creationAttempted = false;
  private disposed = false;
  private submitting = false;
  private localError?: string;
  private usefulResponse = '';
  private previouslyReady = false;
  private ignoreRecoveredDraft = false;

  constructor(readonly client: PiClient, private projectPath: string, private readonly initializeSession?: (client: PiClient, id: string) => Promise<void>) {}

  getView = (): ConversationView => this.view;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start(): void {
    if (this.unsubscribe || this.disposed) return;
    this.unsubscribe = this.client.subscribe((state) => this.synchronize(state));
    this.unsubscribeMessages = this.client.onMessage((message) => {
      if (message.type !== 'event') return;
      if (message.event === 'session.replaced' && message.data.previousSessionId === this.selectedId) {
        this.selectedId = message.data.snapshot.sessionId;
        this.usefulResponse = '';
        this.localError = undefined;
      } else if ('sessionId' in message && message.sessionId === this.selectedId) {
        if (message.event === 'operation.finished' && message.data.outcome === 'failed' && !this.client.getSession(message.sessionId)?.error) this.localError = message.data.error.message;
        if (message.event === 'notification.created' && message.data.level === 'error') this.localError = message.data.message;
      } else return;
      this.synchronize(this.client.getState());
    });
    this.client.start();
  }

  reportError(error: unknown): void {
    this.localError = error instanceof Error ? error.message : String(error);
    this.synchronize(this.client.getState());
  }

  private synchronize(state: ReadonlyDeep<ClientState>): void {
    if (this.disposed) return;
    const ready = state.connection.phase === 'ready';
    const session = this.selectedId ? state.sessions[this.selectedId] : undefined;
    if (ready && !this.previouslyReady && session?.status === 'running') this.ignoreRecoveredDraft = true;
    if (session?.status === 'idle') this.ignoreRecoveredDraft = false;
    this.previouslyReady = ready;
    if (ready && !this.selectedId && !this.creating && !this.creationAttempted) {
      this.creationAttempted = true;
      this.creating = true;
      void this.createSession();
    }
    if (ready && this.selectedId && !session) this.localError = 'The companion session is no longer running. Quit and relaunch Pi Mini to start a new conversation.';
    const prompt = session?.prompts[0];
    const question: Question | undefined = prompt && {
      id: prompt.id, kind: prompt.kind, title: prompt.title, message: prompt.kind === 'confirm' ? prompt.message : undefined,
      body: prompt.body?.text, options: prompt.kind === 'select' ? prompt.options : [], explicit: prompt.submission === 'explicit',
      placeholder: prompt.kind === 'input' ? prompt.placeholder : undefined, prefill: prompt.kind === 'editor' ? prompt.prefill : undefined, submitLabel: prompt.submitLabel, cancelLabel: prompt.cancelLabel,
    };
    const final = session?.messages.findLast((entry) => entry.role === 'assistant' && entry.text.length > 0);
    // Initialization cannot recover a missing stream prefix. Keep the useful
    // response until a finalized assistant message arrives, never a bare suffix.
    const draftText = session?.status === 'running' && !this.ignoreRecoveredDraft ? session.draft?.text : undefined;
    const latest = draftText || (final?.role === 'assistant' ? final.text : undefined);
    if (latest) this.usefulResponse = latest;
    const error = this.localError ?? session?.error ?? state.connection.error?.message;
    const busy = session?.status === 'running' || session?.status === 'aborting';
    const status: CompanionStatus = state.connection.phase === 'superseded' ? 'superseded'
      : this.localError || state.connection.phase === 'failed' ? 'error'
      : !ready ? 'connecting'
      : question ? 'waiting'
      : session?.status === 'aborting' ? 'aborting'
      : busy ? session?.draft?.text || session?.messages.some((entry) => entry.role === 'tool' && entry.tool.status === 'running') ? 'running' : 'thinking'
      : error ? 'error' : 'idle';
    const firstUser = session?.messages.find((entry) => entry.role === 'user');
    const title = session?.sessionName ?? (firstUser?.role === 'user' ? firstUser.text : '');
    const projectPath = session?.projectPath ?? this.projectPath;
    const projectName = session ? state.catalogue.projects.find((project) => project.path === projectPath && project.quickChats)?.name ?? projectPath.split(/[\\/]/).filter(Boolean).at(-1) ?? projectPath : '';
    this.view = {
      sessionId: this.selectedId, title, projectName, response: this.usefulResponse, status, error, question,
      canSend: ready && Boolean(session) && !this.creating && !busy && !question && !this.submitting && !this.initializationFailed,
      canStop: ready && Boolean(busy), submitting: this.submitting,
    };
    for (const listener of this.listeners) listener();
  }

  private async createSession(): Promise<void> {
    try {
      this.selectedId = await this.client.createSession(this.projectPath);
      await this.initializeSession?.(this.client, this.selectedId);
    } catch (error) {
      this.initializationFailed = true;
      if (!this.disposed) this.localError = `Cannot initialize Pi Mini. ${this.describeOutcome(error)}`;
    } finally {
      this.creating = false;
      this.synchronize(this.client.getState());
    }
  }

  private describeOutcome(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return error && typeof error === 'object' && 'outcome' in error && error.outcome === 'unknown'
      ? `${message} The server outcome is unknown; nothing was resent.` : message;
  }

  private async submit(action: () => Promise<unknown>): Promise<boolean> {
    if (this.submitting || this.disposed) return false;
    this.submitting = true;
    this.localError = undefined;
    this.synchronize(this.client.getState());
    try {
      await action();
      return true;
    } catch (error) {
      if (!this.disposed) this.localError = this.describeOutcome(error);
      return false;
    } finally {
      this.submitting = false;
      this.synchronize(this.client.getState());
    }
  }

  async switchProject(path: string): Promise<boolean> {
    if (!this.view.canSend || this.creating || this.disposed) return false;
    const previous = this.selectedId;
    return this.submit(async () => {
      const next = await this.client.createSession(path);
      await this.initializeSession?.(this.client, next);
      if (this.disposed) return;
      this.selectedId = next;
      this.projectPath = path;
      this.usefulResponse = '';
      this.ignoreRecoveredDraft = false;
      // Old-runtime teardown must not hold the new session's composer closed.
      if (previous) void this.client.closeSession(previous).catch(() => {});
    });
  }

  send(text: string): Promise<boolean> {
    if (!text.trim() || !this.view.canSend || !this.selectedId) return Promise.resolve(false);
    const id = this.selectedId;
    return this.submit(() => this.client.prompt(id, text.trim()));
  }

  answer(promptId: string, result: UiPromptResult): Promise<boolean> {
    if (!this.selectedId || this.client.getState().connection.phase !== 'ready' || !this.client.getSession(this.selectedId)?.prompts.some((prompt) => prompt.id === promptId)) return Promise.resolve(false);
    const id = this.selectedId;
    return this.submit(() => this.client.respondToPrompt(id, promptId, result));
  }

  async stop(): Promise<void> {
    if (!this.view.canStop || !this.selectedId) return;
    try { await this.client.abort(this.selectedId); }
    catch (error) { this.reportError(error); }
  }

  takeControl(): void {
    if (this.client.getState().connection.phase !== 'superseded') return;
    if (!this.initializationFailed) this.localError = undefined;
    this.client.takeControl();
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribeMessages?.();
    this.client.dispose();
    this.listeners.clear();
  }
}
