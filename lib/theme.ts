import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

export const THEME = {
  light: {
    background: 'hsl(110 35% 96%)',
    foreground: 'hsl(150 35% 18%)',

    card: 'hsl(110 30% 92%)',
    cardForeground: 'hsl(150 35% 18%)',

    popover: 'hsl(110 30% 92%)',
    popoverForeground: 'hsl(150 35% 18%)',

    primary: 'hsl(145 45% 25%)',
    primaryForeground: 'hsl(110 40% 97%)',

    secondary: 'hsl(110 28% 88%)',
    secondaryForeground: 'hsl(145 35% 22%)',

    muted: 'hsl(110 18% 82%)',
    mutedForeground: 'hsl(145 15% 40%)',

    accent: 'hsl(110 35% 85%)',
    accentForeground: 'hsl(145 35% 22%)',

    destructive: 'hsl(8 65% 60%)',

    border: 'hsl(110 20% 86%)',
    input: 'hsl(110 20% 86%)',
    ring: 'hsl(145 45% 35%)',

    radius: '1.5rem',

    chart1: 'hsl(145 45% 35%)',
    chart2: 'hsl(120 40% 45%)',
    chart3: 'hsl(160 40% 35%)',
    chart4: 'hsl(100 35% 45%)',
    chart5: 'hsl(180 35% 40%)',
  },
  dark: {
    background: 'hsl(150 35% 10%)',
    foreground: 'hsl(120 25% 92%)',

    card: 'hsl(150 30% 14%)',
    cardForeground: 'hsl(120 25% 92%)',

    popover: 'hsl(150 30% 14%)',
    popoverForeground: 'hsl(120 25% 92%)',

    primary: 'hsl(145 45% 45%)',
    primaryForeground: 'hsl(150 35% 10%)',

    secondary: 'hsl(150 25% 20%)',
    secondaryForeground: 'hsl(120 20% 90%)',

    muted: 'hsl(150 18% 18%)',
    mutedForeground: 'hsl(140 12% 65%)',

    accent: 'hsl(150 30% 22%)',
    accentForeground: 'hsl(120 20% 90%)',

    destructive: 'hsl(10 55% 55%)',

    border: 'hsl(150 20% 24%)',
    input: 'hsl(150 20% 24%)',
    ring: 'hsl(145 45% 45%)',

    radius: '1.5rem',

    chart1: 'hsl(145 45% 50%)',
    chart2: 'hsl(120 40% 55%)',
    chart3: 'hsl(165 40% 45%)',
    chart4: 'hsl(100 35% 55%)',
    chart5: 'hsl(185 35% 50%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
