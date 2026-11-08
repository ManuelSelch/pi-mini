import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';
import { act, cleanup, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { useNativeLifecycle } from '../../../src/lifecycle/app/use-native-lifecycle';

const native = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn(), focus: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: native.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: native.listen }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ onFocusChanged: native.focus }),
}));

let handlers: Map<string, (event: { payload: unknown }) => void>;
let focus: (event: { payload: boolean }) => void;
let unlisten: ReturnType<typeof vi.fn>[];
let onError: Mock<(error: unknown) => void>;

beforeEach(() => {
  handlers = new Map();
  unlisten = [];
  onError = vi.fn<(error: unknown) => void>();
  native.invoke.mockReset().mockResolvedValue(null);
  native.listen.mockReset().mockImplementation(async (name, handler) => {
    handlers.set(name, handler);
    const release = vi.fn();
    unlisten.push(release);
    return release;
  });
  native.focus.mockReset().mockImplementation(async (handler) => {
    focus = handler;
    const release = vi.fn();
    unlisten.push(release);
    return release;
  });
});
afterEach(cleanup);

test('Escape does not ask native lifecycle to hide the window', async () => {
  renderHook(() => useNativeLifecycle(onError));
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith('lifecycle_error'));

  fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
  fireEvent.keyDown(window, { key: ' ', ctrlKey: true, altKey: true });
  expect(native.invoke).not.toHaveBeenCalledWith('hide_companion');

  fireEvent.keyDown(window, { key: 'Escape' });

  expect(native.invoke.mock.calls.map((call) => call[0])).toEqual(['lifecycle_error']);
});

test('show and actual native focus request composer focus again, but losing focus does not', async () => {
  const { result } = renderHook(() => useNativeLifecycle(onError));
  await waitFor(() => expect(handlers.size).toBe(2));

  act(() => handlers.get('companion:shown')!({ payload: undefined }));
  expect(result.current).toBe(1);

  act(() => focus({ payload: false }));
  expect(result.current).toBe(1);

  act(() => focus({ payload: true }));
  expect(result.current).toBe(2);
});

test('shortcut registration failure is surfaced even when it predates JavaScript listeners', async () => {
  native.invoke.mockResolvedValueOnce('Cannot register Control+Option+Space');
  renderHook(() => useNativeLifecycle(onError));

  await waitFor(() => expect(onError).toHaveBeenCalledOnce());
  expect(onError).toHaveBeenCalledWith(new Error('Cannot register Control+Option+Space'));
});

test('a native listener resolving after unmount is released immediately', async () => {
  const release = vi.fn();
  let resolve!: (unlisten: () => void) => void;
  native.listen.mockImplementationOnce(
    () =>
      new Promise<() => void>((done) => {
        resolve = done;
      }),
  );
  const { unmount } = renderHook(() => useNativeLifecycle(onError));

  unmount();
  await act(async () => resolve(release));

  expect(release).toHaveBeenCalledOnce();
});

test('unmount releases native listeners', async () => {
  const { unmount } = renderHook(() => useNativeLifecycle(onError));
  await waitFor(() => expect(unlisten).toHaveLength(3));

  unmount();
  fireEvent.keyDown(window, { key: 'Escape' });

  for (const release of unlisten) expect(release).toHaveBeenCalledOnce();
  expect(native.invoke).not.toHaveBeenCalledWith('hide_companion');
});
