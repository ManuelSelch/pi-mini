import { afterEach, test } from 'vitest';
import assert from 'node:assert/strict';
import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ProjectSwitcher } from '../../../src/conversation/ui/components/project-switcher';

Object.defineProperty(window, 'matchMedia', { value: (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) });
afterEach(cleanup);

test('filter and keyboard navigation select a project, while Escape cancels', () => {
  const selected: string[] = [];
  let closed = 0;
  const ui = render(<MantineProvider><ProjectSwitcher projects={[{ name: 'Alpha', path: '/a' }, { name: 'Beta', path: '/b' }]} busy={false} onSelect={(path) => selected.push(path)} onClose={() => { closed++; }}/></MantineProvider>);
  const input = ui.getByRole('textbox', { name: 'Search projects' });
  fireEvent.change(input, { target: { value: 'beta' } });
  assert.equal(ui.queryByText('Alpha'), null);
  fireEvent.keyDown(input, { key: 'Enter' });
  assert.deepEqual(selected, ['/b']);
  fireEvent.keyDown(input, { key: 'Escape' });
  assert.equal(closed, 1);
});

test('an absolute folder path can be opened even when not in history', () => {
  const selected: string[] = [];
  const ui = render(<MantineProvider><ProjectSwitcher projects={[]} busy={false} onSelect={(path) => selected.push(path)} onClose={() => {}}/></MantineProvider>);
  const input = ui.getByRole('textbox', { name: 'Search projects' });
  fireEvent.change(input, { target: { value: '/new/project' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  assert.deepEqual(selected, ['/new/project']);
});
