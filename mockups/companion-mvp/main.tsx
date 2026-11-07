import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Agentation } from 'agentation';
import '@mantine/core/styles.css';
import '../companion/styles.css';
import './styles.css';
import { MvpCompanion } from './MvpCompanion';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: '11px', sm: '12px', md: '13px', lg: '15px', xl: '18px' },
  colors: { dark: ['#c9c9c9', '#b6b6b6', '#a0a0a0', '#828282', '#696969', '#424242', '#2e2e2e', '#242424', '#202020', '#1b1b1b'] },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MantineProvider theme={theme} forceColorScheme="dark">
    <MvpCompanion />
    {import.meta.env.DEV && <Agentation />}
  </MantineProvider></React.StrictMode>,
);
