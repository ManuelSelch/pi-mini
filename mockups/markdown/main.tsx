import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, Button, createTheme } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { Agentation } from 'agentation';
import '@mantine/core/styles.css';
import './styles.css';

function MarkdownExample() {
  return <div className="window">
    <header><IconSparkles size={15}/> Pi mini <span>●</span></header>
    <main className="markdown">
      <h2>Set up your project</h2>
      <p>Follow these steps to get started. <strong>Keep your API key private.</strong></p>
      <ol><li>Install the dependencies.</li><li>Start the development server.</li></ol>
      <pre><code><span>npm</span> install{'\n'}<span>npm</span> run dev</code></pre>
      <blockquote>Tip: Check the <a href="https://example.com">documentation</a> if you get stuck.</blockquote>
      <table><thead><tr><th>Command</th><th>Purpose</th></tr></thead><tbody><tr><td><code>npm test</code></td><td>Run tests</td></tr></tbody></table>
      <div className="actions"><Button size="compact-xs" variant="default">Done</Button><Button size="compact-xs" variant="default">Explain</Button><Button size="compact-xs" variant="default">I’m stuck</Button></div>
    </main>
    <footer>Ask…</footer>
  </div>;
}
const theme = createTheme({ fontFamily: 'system-ui, sans-serif', defaultRadius: 'sm' });
createRoot(document.getElementById('root')!).render(<MantineProvider theme={theme} forceColorScheme="dark"><MarkdownExample/>{import.meta.env.DEV && <Agentation/>}</MantineProvider>);
