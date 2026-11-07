import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, Button } from '@mantine/core';
import { Agentation } from 'agentation';
import '@mantine/core/styles.css';
import './styles.css';

function MenuBarMockup() {
  const [menu, setMenu] = useState(true);
  const [visible, setVisible] = useState(false);
  return <div className="desktop">
    <header><span>● &nbsp; Finder &nbsp; File &nbsp; Edit &nbsp; View</span><button aria-label="Pi Mini menu" className="status-icon" onClick={() => setMenu(!menu)}>π</button><span>Mon 9:41</span></header>
    {menu && <nav className="menu" aria-label="Pi Mini">
      <Button variant="subtle" color="dark" fullWidth justify="flex-start" onClick={() => { setVisible(true); setMenu(false); }}>Show Pi Mini</Button>
      <hr/>
      <Button variant="subtle" color="dark" fullWidth justify="flex-start" onClick={() => { setVisible(false); setMenu(false); }}>Quit Pi Mini</Button>
    </nav>}
    {visible && <div className="window"><button onClick={() => setVisible(false)} aria-label="Hide">×</button><strong>Lets cook</strong><div className="composer">Ask anything…</div></div>}
    <p className="hint">Click the menu bar icon to open the menu.</p>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><MantineProvider theme={createTheme({ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' })}><MenuBarMockup/>{import.meta.env.DEV && <Agentation/>}</MantineProvider></React.StrictMode>);
