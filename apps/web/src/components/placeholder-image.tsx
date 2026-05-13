/**
 * Deterministic placeholder image — gerçek görsel yokken kullanılır.
 *
 * - Seed string'inden renk + emoji map'i ile renkli kart üretir
 * - Server + client render uyumlu (rastgele yok, deterministic)
 * - SVG / div ile inline (network yok, MinIO erişimi yok)
 *
 * Kullanım:
 *   <PlaceholderImage seed={product.nameTr} category="zeytinyagi" />
 */

const COLOR_PALETTE = [
  { bg: '#fef3c7', fg: '#92400e' }, // amber
  { bg: '#fee2e2', fg: '#991b1b' }, // red
  { bg: '#dcfce7', fg: '#166534' }, // green
  { bg: '#dbeafe', fg: '#1e40af' }, // blue
  { bg: '#f3e8ff', fg: '#6b21a8' }, // purple
  { bg: '#fce7f3', fg: '#9d174d' }, // pink
  { bg: '#fed7aa', fg: '#9a3412' }, // orange
  { bg: '#cffafe', fg: '#155e75' }, // cyan
  { bg: '#e7e5e4', fg: '#44403c' }, // stone
];

const CATEGORY_EMOJI: Record<string, string> = {
  zeytinyagi: '🫒',
  zeytin: '🫒',
  peynir: '🧀',
  sut: '🥛',
  bal: '🍯',
  kayisi: '🍑',
  meyve: '🍎',
  sebze: '🥕',
  bakliyat: '🫘',
  baklagil: '🫘',
  ekmek: '🍞',
  hamur: '🥐',
  tatli: '🍰',
  recel: '🍓',
  kuruyemis: '🥜',
  fistik: '🥜',
  badem: '🥜',
  ceviz: '🥜',
  baharat: '🌶',
  cay: '🍵',
  kahve: '☕',
  bitki: '🌿',
  bitkisel: '🌿',
  zeytin_yagi: '🫒',
  yag: '🫒',
  tuz: '🧂',
  un: '🌾',
  bulgur: '🌾',
  pirinc: '🌾',
  makarna: '🍝',
  konserve: '🥫',
  tursu: '🥒',
  salca: '🍅',
  bal_kovani: '🍯',
  pestil: '🍇',
  pekmez: '🍇',
  uzum: '🍇',
  incir: '🍑',
  hurma: '🍑',
  cikolata: '🍫',
  sirke: '🍋',
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickEmoji(seed: string, category?: string): string {
  const search = (category ?? seed).toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (search.includes(key)) return emoji;
  }
  // Default: yöresel sembolü
  return '🌾';
}

function pickColor(seed: string) {
  const idx = hashString(seed) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx]!;
}

export function PlaceholderImage({
  seed,
  category,
  size = 'md',
  className = '',
}: {
  seed: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const color = pickColor(seed);
  const emoji = pickEmoji(seed, category);
  const emojiSize =
    size === 'sm' ? 'text-4xl' : size === 'lg' ? 'text-7xl' : 'text-6xl';

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ backgroundColor: color.bg, color: color.fg }}
      aria-hidden="true"
    >
      <span className={`${emojiSize} opacity-80`}>{emoji}</span>
    </div>
  );
}

/**
 * Inline SVG variant — daha stilize görünüm. Tek başına renkli bloklar +
 * baş harfler. Emoji'ye alternatif (font-family farklılığı yaratmıyor).
 */
export function PlaceholderImageSvg({
  seed,
  className = '',
}: {
  seed: string;
  className?: string;
}) {
  const color = pickColor(seed);
  const initials = seed
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="200" height="200" fill={color.bg} />
      <text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="72"
        fontWeight="700"
        fill={color.fg}
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
}
