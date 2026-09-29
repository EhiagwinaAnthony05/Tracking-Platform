import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { RiderTheme } from '../constants/riderTheme';
// Defines the background location task at startup so the OS can relaunch it after the app is closed.
import '../services/locationTracker';

const c = RiderTheme.colors;

const RiderNavTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    background: c.canvas,
    card: c.cardStrong,
    text: c.textPrimary,
    border: c.cardBorder,
    primary: c.primaryButton,
    notification: c.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={RiderNavTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
