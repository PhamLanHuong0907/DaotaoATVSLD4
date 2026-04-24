import { createTheme, type ThemeOptions } from '@mui/material/styles';

const sharedComponents: ThemeOptions['components'] = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: { textTransform: 'none', borderRadius: 8 },
    },
  },
  MuiCard: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
};

const sharedTypography: ThemeOptions['typography'] = {
  fontFamily: '"Roboto", "Arial", sans-serif',
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0' },
    secondary: { main: '#f57c00' },
    success: { main: '#2e7d32' },
    error: { main: '#c62828' },
    warning: { main: '#ed6c02' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: sharedTypography,
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#64b5f6' },
    secondary: { main: '#ffb74d' },
    success: { main: '#81c784' },
    error: { main: '#e57373' },
    warning: { main: '#ffb74d' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  typography: sharedTypography,
  components: sharedComponents,
});

// Backwards compatibility
export const theme = lightTheme;
