import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useNativeLifecycle(onError: (error: unknown) => void): number {
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    const subscriptions: UnlistenFn[] = [];
    const focus = () => { if (!disposed) setFocusRequest((value) => value + 1); };
    const report = (error: unknown) => { if (!disposed) onError(error); };
    const retain = async (pending: Promise<UnlistenFn>) => {
      const unlisten = await pending;
      if (disposed) unlisten();
      else subscriptions.push(unlisten);
    };
    void Promise.all([
      retain(listen('companion:shown', focus)),
      retain(listen<string>('companion:lifecycle-error', (event) => report(new Error(event.payload)))),
      retain(getCurrentWindow().onFocusChanged((event) => { if (event.payload) focus(); })),
    ]).catch(report);
    void invoke<string | null>('lifecycle_error').then((error) => { if (error) report(new Error(error)); }, report);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      // Hide only; do not cancel an agent prompt, dispose the SDK or clear a draft.
      void invoke('hide_companion').catch(report);
    };
    window.addEventListener('keydown', keydown);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', keydown);
      for (const unlisten of subscriptions) unlisten();
    };
  }, [onError]);
  return focusRequest;
}
