import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PiClient } from '@manuelselch/pi-sdk';
import { Conversation } from '../../../src/conversation/app/conversation';
import { emptyView } from '../../../src/conversation/domain/view';
import { ConversationContainer } from '../../../src/conversation/ui/containers/conversation-container';

Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }),
});
Object.assign(globalThis, {
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
Object.defineProperty(document, 'fonts', { value: new window.EventTarget(), configurable: true });
afterEach(cleanup);

function fixture(running: boolean) {
  const client = new PiClient({
    endpoint: 'ws://127.0.0.1:1/ws',
    transport: () => {
      throw new Error('Not connected');
    },
  });
  const conversation = new Conversation(client, '/workspace');
  vi.spyOn(conversation, 'getView').mockReturnValue({
    ...emptyView,
    status: running ? 'running' : 'idle',
    canSend: !running,
    canStop: running,
  });
  const stop = vi.spyOn(conversation, 'stop').mockResolvedValue();
  const ui = render(
    <MantineProvider>
      <ConversationContainer conversation={conversation} onDrag={() => {}} focusRequest={0} />
    </MantineProvider>,
  );
  return { ui, stop };
}

test('Escape stops a running agent without treating composition as a stop', () => {
  const { stop } = fixture(true);
  fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
  expect(stop).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(stop).toHaveBeenCalledOnce();
});

test('Escape closes the project switcher without stopping the agent', () => {
  const { ui, stop } = fixture(false);
  fireEvent.keyDown(window, { key: 'o', metaKey: true });
  const search = ui.getByRole('textbox', { name: 'Search projects' });
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(ui.queryByRole('dialog', { name: 'Open project' })).toBeNull();
  expect(stop).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(stop).not.toHaveBeenCalled();
});
