import { test, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { MantineProvider } from '@mantine/core';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { CompanionView } from '../../../src/conversation/ui/components/companion-view';
import { Composer } from '../../../src/conversation/ui/components/composer';
import { emptyView, type ConversationView } from '../../../src/conversation/domain/view';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }),
});
// DOM-only tests do not establish native layout or resizing; no ResizeObserver geometry assertions.
Object.assign(globalThis, {
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
Object.defineProperty(document, 'fonts', { value: new window.EventTarget(), configurable: true });
afterEach(cleanup);

function viewFixture(view: ConversationView) {
  const answers: (string | boolean)[] = [];
  const sends: string[] = [];
  let cancelled = 0;
  const ui = render(
    <MantineProvider forceColorScheme="dark">
      <CompanionView
        view={view}
        composer={null}
        onDrag={() => {}}
        onSend={(text) => sends.push(text)}
        onAnswer={(value) => answers.push(value)}
        onCancel={() => {
          cancelled++;
        }}
        onTakeControl={() => {}}
      />
    </MantineProvider>,
  );
  return {
    ui,
    answers,
    sends,
    get cancelled() {
      return cancelled;
    },
  };
}

test('the empty companion has only Lets cook, without a title, collapse control or status label', () => {
  const { ui } = viewFixture({ ...emptyView, status: 'idle' });

  assert.equal(ui.getByRole('heading').textContent, 'Lets cook');
  assert.equal(ui.getByRole('main').classList.contains('items-center'), true);
  assert.equal(ui.getByRole('main').classList.contains('justify-center'), true);
  assert.equal(ui.queryByText('New conversation'), null);
  assert.equal(ui.queryByRole('button', { name: /collapse|expand/i }), null);
  assert.equal(ui.getByRole('status').getAttribute('title'), 'Ready');
  assert.equal(ui.getByRole('status').classList.contains('thinking'), false);
});

test('the header shows the project followed by the session name', () => {
  const { ui } = viewFixture({
    ...emptyView,
    projectName: 'my-project',
    title: 'Fix the bug',
    status: 'idle',
  });

  assert.match(ui.getByRole('banner').textContent!, /my-project\s*>\s*Fix the bug/);
});

test('a required confirm submits a boolean and does not send an ordinary message', () => {
  const app = viewFixture({
    ...emptyView,
    response: 'Keep the password private.',
    status: 'waiting',
    question: { id: 'q', kind: 'confirm', title: 'Continue?', options: [], explicit: false },
  });

  fireEvent.click(app.ui.getByRole('button', { name: 'No' }));

  assert.deepEqual(app.answers, [false]);
  assert.deepEqual(app.sends, []);
  assert.equal(app.ui.queryByText('ANSWER NEEDED'), null);
});

test('explicit selects wait for Submit while ordinary follow-ups send immediately', () => {
  const question = viewFixture({
    ...emptyView,
    status: 'waiting',
    question: { id: 'q', kind: 'select', title: 'Choose one', options: ['A', 'B'], explicit: true },
  });

  fireEvent.click(question.ui.getByRole('button', { name: 'B' }));

  assert.deepEqual(question.answers, []);

  fireEvent.click(question.ui.getByRole('button', { name: 'Submit' }));

  assert.deepEqual(question.answers, ['B']);
  cleanup();

  const followUp = viewFixture({
    ...emptyView,
    response: 'Check the cable.',
    status: 'idle',
    canSend: true,
  });
  fireEvent.click(followUp.ui.getByRole('button', { name: 'Explain' }));

  assert.deepEqual(followUp.sends, ['Explain']);
  assert.deepEqual(followUp.answers, []);
});

test('errors retain the full response and expose plain red text with transcript padding', () => {
  const response = 'Check the cable.\n\nWarning: do not open the power supply.';
  const { ui } = viewFixture({
    ...emptyView,
    response,
    error: 'Provider unavailable',
    status: 'error',
  });

  assert.equal(ui.getByText('Check the cable.').textContent, 'Check the cable.');
  assert.equal(
    ui.getByText('Warning: do not open the power supply.').textContent,
    'Warning: do not open the power supply.',
  );
  assert.match(ui.getByRole('alert').className, /text-failure/);
  assert.doesNotMatch(ui.getByRole('alert').className, /bg-/);
  assert.equal(ui.getByRole('alert').classList.contains('px-[12px]'), true);
  assert.equal(ui.getByRole('main').classList.contains('px-[12px]'), true);
});

test('busy composer retains typing and exposes Stop without submitting another message', () => {
  let sends = 0;
  let stops = 0;
  const { getByRole } = render(
    <MantineProvider forceColorScheme="dark">
      <Composer
        text="My unsent draft"
        label="Message Pi"
        placeholder="Ask…"
        disabled={false}
        canSubmit={false}
        canStop
        onChange={() => {}}
        onSend={() => {
          sends++;
        }}
        onStop={() => {
          stops++;
        }}
      />
    </MantineProvider>,
  );

  fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' });
  fireEvent.click(getByRole('button', { name: 'Stop reply' }));

  assert.equal(sends, 0);
  assert.equal(stops, 1);
  assert.equal((getByRole('textbox') as HTMLTextAreaElement).value, 'My unsent draft');
});
