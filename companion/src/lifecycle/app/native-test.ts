import { invoke } from '@tauri-apps/api/core';

/** Native scenario probe, enabled only by the explicit --lifecycle-test launch. */
export function watchNativeLifecycle(readState: () => Record<string, unknown>, subscribe: (callback: () => void) => () => void): () => void {
  let ready = false;
  const report = (id: number, error?: string) => {
    const textarea = document.querySelector('textarea');
    void invoke('lifecycle_report', { requestId: id, report: {
      ...readState(), error,
      draft: textarea?.value ?? '', draftState: textarea?.defaultValue ?? '', composerFocused: document.activeElement === textarea,
      hasCollapseControl: Boolean(document.querySelector('[aria-label="Collapse companion"], [aria-label="Expand companion"]')),
    } });
  };
  const receive = (event: Event) => {
    const { id, action, text } = (event as CustomEvent<{ id: number; action: string; text?: string }>).detail;
    try {
      if (action === 'draft') {
        const input = document.querySelector('textarea');
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (!input || !setter || typeof text !== 'string') throw new Error('Composer is unavailable');
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (action === 'send') document.querySelector('textarea')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      if (action === 'escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      report(id);
    } catch (error) { report(id, String(error)); }
  };
  window.addEventListener('pi-mini-native-test', receive);
  const unsubscribe = subscribe(() => {
    const state = readState();
    if (ready || !state.canSend || !state.sessionId) return;
    ready = true;
    report(0);
  });
  return () => { unsubscribe(); window.removeEventListener('pi-mini-native-test', receive); };
}
