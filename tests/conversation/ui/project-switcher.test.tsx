import { afterEach, test } from 'vitest';
import assert from 'node:assert/strict';
import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ProjectSwitcher } from '../../../src/conversation/ui/components/project-switcher';

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

test('filter and keyboard navigation select a project, while Escape cancels', () => {
  const selected: string[] = [];
  let closed = 0;
  const ui = render(
    <MantineProvider>
      <ProjectSwitcher
        projects={[
          { name: 'Alpha', path: '/a' },
          { name: 'Beta', path: '/b' },
        ]}
        busy={false}
        onSelect={(path) => selected.push(path)}
        onClose={() => {
          closed++;
        }}
      />
    </MantineProvider>,
  );
  const input = ui.getByRole('textbox', { name: 'Search projects' });
  assert.equal(input.getAttribute('placeholder'), 'Search');
  assert.equal(ui.queryByText(/Enter to open a new session/), null);
  assert.match(ui.getByRole('option', { name: 'Alpha' }).className, /bg-transparent/);
  assert.match(ui.getByRole('option', { name: 'Beta' }).className, /hover:text-accent/);
  fireEvent.mouseEnter(ui.getByRole('option', { name: 'Beta' }));
  assert.equal(ui.getByRole('option', { name: 'Alpha' }).getAttribute('aria-selected'), 'true');
  assert.equal(ui.queryByText('/a'), null);
  assert.equal(ui.queryByText('/b'), null);
  fireEvent.change(input, { target: { value: 'beta' } });
  assert.equal(ui.queryByText('Alpha'), null);
  fireEvent.keyDown(input, { key: 'Enter' });
  assert.deepEqual(selected, ['/b']);
  fireEvent.keyDown(input, { key: 'Escape' });
  assert.equal(closed, 1);
});

test('Quick Chats appears first regardless of project order', () => {
  const ui = render(
    <MantineProvider>
      <ProjectSwitcher
        projects={[
          { name: 'Alpha', path: '/a' },
          { name: 'Quick Chats', path: '/home/user', quickChats: true },
        ]}
        busy={false}
        onSelect={() => {}}
        onClose={() => {}}
      />
    </MantineProvider>,
  );

  assert.equal(ui.getAllByRole('option')[0]?.textContent, 'Quick Chats');
});

test('an absolute folder path can be opened even when not in history', () => {
  const selected: string[] = [];
  const ui = render(
    <MantineProvider>
      <ProjectSwitcher
        projects={[]}
        busy={false}
        onSelect={(path) => selected.push(path)}
        onClose={() => {}}
      />
    </MantineProvider>,
  );
  const input = ui.getByRole('textbox', { name: 'Search projects' });
  fireEvent.change(input, { target: { value: '/new/project' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  assert.deepEqual(selected, ['/new/project']);
});
