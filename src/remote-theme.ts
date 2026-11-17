import type { ThemeColors } from './theme-colors';
import type { RemoteConfig } from './remote-config-model';
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function remoteTheme(base: ThemeColors, overrides: RemoteConfig['theme']['light']): ThemeColors {
  const next = { ...base, ...overrides };
  // A partial override can affect several roles (e.g. primary is also text).
  // Reject an unsafe combination atomically so no cross-role pair is missed.
  return themeContrastIssues(next).length ? base : next;
}

// These roles are used by real controls across the calculator, calendars,
// navigation and carousel. Validate the whole combination before applying it.
export function themeContrastIssues(colors: ThemeColors): string[] {
  const issues: string[] = [];
  const check = (foreground: keyof ThemeColors, background: keyof ThemeColors, minimum = 4.5) => {
    if (contrast(colors[foreground], colors[background]) < minimum) issues.push(`${foreground}/${background}`);
  };
  for (const background of ['background', 'surface', 'surfaceSubtle', 'secondary', 'selected'] as const) {
    for (const foreground of ['text', 'muted', 'primary', 'link'] as const) check(foreground, background);
  }
  check('onPrimary', 'primary'); check('onAccent', 'accent'); check('brandText', 'brandBackground');
  for (const foreground of ['resultText', 'resultMuted', 'resultWarning'] as const) check(foreground, 'resultBackground');
  check('placeholder', 'surface'); check('error', 'errorBackground'); check('error', 'surface'); check('error', 'background');
  check('border', 'surface', 3); check('border', 'background', 3); check('selectedBorder', 'selected', 3);
  check('selectedBorder', 'surface', 3); check('secondaryBorder', 'secondary', 3); check('errorBorder', 'errorBackground', 3);
  return issues;
}
