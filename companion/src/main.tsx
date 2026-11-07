import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import './styles.css';
import { App } from './app';

const theme = createTheme({
  primaryColor: 'blue', defaultRadius: 'md',
  fontFamily: 'var(--font-sans)',
  fontSizes: { xs: '11px', sm: '12px', md: '13px', lg: '15px', xl: '18px' },
  colors: { dark: ['#c9c9c9', '#b6b6b6', '#a0a0a0', '#828282', '#696969', '#424242', '#2e2e2e', '#242424', '#202020', '#1b1b1b'] },
});

createRoot(document.getElementById('root')!).render(<MantineProvider theme={theme} forceColorScheme="dark"><App/></MantineProvider>);
