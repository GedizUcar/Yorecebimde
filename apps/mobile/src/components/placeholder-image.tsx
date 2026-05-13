import { View, Text, StyleSheet } from 'react-native';

const COLORS = [
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#fee2e2', fg: '#991b1b' },
  { bg: '#dcfce7', fg: '#166534' },
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#f3e8ff', fg: '#6b21a8' },
  { bg: '#fce7f3', fg: '#9d174d' },
  { bg: '#fed7aa', fg: '#9a3412' },
  { bg: '#cffafe', fg: '#155e75' },
  { bg: '#e7e5e4', fg: '#44403c' },
];

const EMOJI_MAP: Record<string, string> = {
  zeytinyagi: '🫒',
  zeytin: '🫒',
  peynir: '🧀',
  sut: '🥛',
  bal: '🍯',
  kayisi: '🍑',
  meyve: '🍎',
  sebze: '🥕',
  bakliyat: '🫘',
  ekmek: '🍞',
  tatli: '🍰',
  recel: '🍓',
  kuruyemis: '🥜',
  fistik: '🥜',
  baharat: '🌶',
  cay: '🍵',
  kahve: '☕',
  bitki: '🌿',
  tuz: '🧂',
  un: '🌾',
  bulgur: '🌾',
  konserve: '🥫',
  tursu: '🥒',
  salca: '🍅',
  pekmez: '🍇',
  uzum: '🍇',
  incir: '🍑',
  cikolata: '🍫',
  sirke: '🍋',
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickEmoji(seed: string): string {
  const lower = seed.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌾';
}

export function PlaceholderImage({
  seed,
  size = 'md',
  style,
}: {
  seed: string;
  size?: 'sm' | 'md' | 'lg';
  style?: object;
}) {
  const color = COLORS[hashString(seed) % COLORS.length]!;
  const emoji = pickEmoji(seed);
  const emojiFontSize = size === 'sm' ? 28 : size === 'lg' ? 64 : 48;

  return (
    <View style={[styles.container, { backgroundColor: color.bg }, style]}>
      <Text style={{ fontSize: emojiFontSize }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
