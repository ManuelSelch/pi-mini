import { afterEach, test } from 'vitest';
import assert from 'node:assert/strict';
import { MantineProvider } from '@mantine/core';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import { CompanionView } from '../../../src/conversation/ui/components/companion-view';
import { emptyView } from '../../../src/conversation/domain/view';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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

class MarkdownResponseDriver {
  private ui?: RenderResult;

  async showResponse(text: string): Promise<void> {
    const element = (
      <MantineProvider forceColorScheme="dark">
        <CompanionView
          view={{ ...emptyView, response: text, status: 'idle', canSend: true }}
          composer={null}
          onDrag={() => {}}
          onSend={() => {}}
          onAnswer={() => {}}
          onCancel={() => {}}
          onTakeControl={() => {}}
        />
      </MantineProvider>
    );
    if (this.ui) this.ui.rerender(element);
    else this.ui = render(element);
  }
  async expectFormattedContent(): Promise<void> {
    const main = this.ui!.getByRole('main');
    assert.equal(this.ui!.getByRole('heading', { name: 'Setup' }).tagName, 'H2');
    assert.equal(main.querySelector('strong')?.textContent, 'Important');
    assert.equal(main.querySelector('li')?.textContent, 'Install');
    assert.ok(main.querySelector('pre code.hljs'));
    assert.equal(this.ui!.getByRole('table').querySelector('td')?.textContent, '1');
    assert.ok(main.querySelector('.katex-display'));
  }
  async expectUpdatedContent(): Promise<void> {
    const main = this.ui!.getByRole('main');
    assert.equal(main.querySelector('strong')?.textContent, 'Starting');
    assert.match(main.textContent!, /Starting and finished/);
  }
  async expectUnsafeContentInert(): Promise<void> {
    const main = this.ui!.getByRole('main');
    assert.equal(main.querySelector('script'), null);
    assert.equal(main.querySelector('a'), null);
  }
  async expectFollowUpsAvailable(): Promise<void> {
    assert.ok(this.ui!.getByRole('button', { name: 'Explain' }));
  }
}

test('assistant responses show pi-chat style Markdown, code, tables and math', async () => {
  const app = new MarkdownResponseDriver();
  await app.showResponse(
    '## Setup\n\n**Important**\n\n- Install\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n$$\nx^2\n$$',
  );
  await app.expectFormattedContent();
});

test('streaming updates retain the complete rendered response and follow-ups', async () => {
  const app = new MarkdownResponseDriver();
  await app.showResponse('**Starting');
  await app.showResponse('**Starting** and finished');
  await app.expectUpdatedContent();
  await app.expectFollowUpsAvailable();
});

test('unsafe links and raw HTML in model output do not execute', async () => {
  const app = new MarkdownResponseDriver();
  await app.showResponse('[unsafe](javascript:alert(1)) <script>alert(1)</script>');
  await app.expectUnsafeContentInert();
});
