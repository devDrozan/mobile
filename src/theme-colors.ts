export type ThemeColors = {
  background: string; surface: string; surfaceSubtle: string;
  text: string; muted: string; border: string; divider: string;
  primary: string; onPrimary: string; brandBackground: string; brandText: string;
  secondary: string; secondaryBorder: string; selected: string; selectedBorder: string;
  link: string; placeholder: string;
  error: string; errorBackground: string; errorBorder: string;
  resultBackground: string; resultText: string; resultMuted: string; resultWarning: string;
  switchOn: string; switchOff: string;
};

export const lightColors: ThemeColors = {
  background: '#f7f8f4', surface: '#ffffff', surfaceSubtle: '#eff4e6',
  text: '#243b35', muted: '#62735c', border: '#dfe7d7', divider: '#e9eee2',
  primary: '#123c35', onPrimary: '#ffffff', brandBackground: '#123c35', brandText: '#d5eab5',
  secondary: '#edf3e5', secondaryBorder: '#dce6d0', selected: '#eff5e7', selectedBorder: '#829d71',
  link: '#506a40', placeholder: '#68785f',
  error: '#8f432f', errorBackground: '#fcf2ec', errorBorder: '#ddbcae',
  resultBackground: '#123c35', resultText: '#eef4db', resultMuted: '#bed2ac', resultWarning: '#e1d5a3',
  switchOn: '#719a66', switchOff: '#dbe4d2',
};

export const darkColors: ThemeColors = {
  background: '#101a16', surface: '#1a2721', surfaceSubtle: '#24362a',
  text: '#e7ede3', muted: '#afbea7', border: '#415346', divider: '#35483b',
  primary: '#bfdba5', onPrimary: '#14261d', brandBackground: '#263e32', brandText: '#d5eab5',
  secondary: '#293d2e', secondaryBorder: '#4d6650', selected: '#2d4634', selectedBorder: '#a8ce92',
  link: '#bedba6', placeholder: '#a2b198',
  error: '#ffb69e', errorBackground: '#3c2923', errorBorder: '#986653',
  resultBackground: '#173b32', resultText: '#eef4db', resultMuted: '#c5d8b6', resultWarning: '#f0dfa4',
  switchOn: '#96ba7e', switchOff: '#4a5a50',
};
