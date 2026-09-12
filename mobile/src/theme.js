// Komşuda — görsel dil
// Aciliyet ve komşuluk. Soğuk kurumsal mavi değil, sıcak yeşil + uyarı turuncusu.

export const colors = {
  ink: '#14231F',
  text: '#14231F',
  textMuted: '#5F6F68',
  textFaint: '#8C9A94',

  bg: '#F2F4F1',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EDE8',

  primary: '#1F6F4A',
  primarySoft: '#DFF0E6',

  urgent: '#E2571F',
  urgentSoft: '#FCE9E0',

  warn: '#B8860B',
  warnSoft: '#FAF0D7',

  danger: '#C0392B',
  border: '#DCE3DE',
};

export const type = {
  h1: { fontSize: 24, fontWeight: '600', color: colors.text },
  h2: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textFaint },
};

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
