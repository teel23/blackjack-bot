import type { CSSProperties } from 'react';
import { type Card, type Suit, cardSpoken } from '@/lib/engine/cards';

// Suit shapes as paths (unicode suits can render as emoji on iOS).
const SUIT_PATH: Record<Suit, string> = {
  H: 'M10 18.5C10 18.5 1 12.4 1 6.6 1 3.6 3.3 1.5 5.8 1.5c1.9 0 3.4 1.1 4.2 2.7.8-1.6 2.3-2.7 4.2-2.7 2.5 0 4.8 2.1 4.8 5.1 0 5.8-9 11.9-9 11.9z',
  D: 'M10 1l7.6 9L10 19 2.4 10z',
  S: 'M10 1S1 7.6 1 12.1c0 2.6 2 4.3 4.3 4.3 1.7 0 3-.9 3.7-2.1-.2 2.2-1 3.8-2.5 4.7h7c-1.5-.9-2.3-2.5-2.5-4.7.7 1.2 2 2.1 3.7 2.1 2.3 0 4.3-1.7 4.3-4.3C19 7.6 10 1 10 1z',
  C: 'M10 1.2a4.3 4.3 0 0 0-3.6 6.7A4.3 4.3 0 1 0 8.8 15c-.3 1.6-1.1 2.9-2.3 3.8h7c-1.2-.9-2-2.2-2.3-3.8a4.3 4.3 0 1 0 2.4-7.1A4.3 4.3 0 0 0 10 1.2z',
};

const RED = '#c8243a';
const BLACK = '#15171c';

export function SuitIcon({ suit, size = 16, color }: { suit: Suit; size?: number; color?: string }) {
  const fill = color ?? (suit === 'H' || suit === 'D' ? RED : BLACK);
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d={SUIT_PATH[suit]} fill={fill} />
    </svg>
  );
}

interface Props {
  card?: Card;
  faceDown?: boolean;
  width?: number | string;
  className?: string;
  style?: CSSProperties;
}

export default function PlayingCard({ card, faceDown, width = 'var(--card-w)', className = '', style }: Props) {
  const w = typeof width === 'number' ? `${width}px` : width;
  const box: CSSProperties = { width: w, aspectRatio: '5 / 7', ...style };

  if (faceDown || !card) {
    return (
      <svg viewBox="0 0 100 140" role="img" aria-label="Face-down card" className={`block drop-shadow-md ${className}`} style={box}>
        <defs>
          <pattern id="bjb-back" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="12" height="12" fill="#0e3b5c" />
            <rect width="6" height="6" fill="#134c75" />
          </pattern>
        </defs>
        <rect x="1" y="1" width="98" height="138" rx="9" fill="#f7f7f2" />
        <rect x="6" y="6" width="88" height="128" rx="6" fill="url(#bjb-back)" />
        <rect x="6" y="6" width="88" height="128" rx="6" fill="none" stroke="#f4c55b" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="50" cy="70" r="14" fill="#0b2e47" stroke="#f4c55b" strokeOpacity="0.7" strokeWidth="1.5" />
        <path d="M50 61l7 9-7 9-7-9z" fill="#f4c55b" fillOpacity="0.85" />
      </svg>
    );
  }

  const red = card.suit === 'H' || card.suit === 'D';
  const color = red ? RED : BLACK;
  const face = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  const rankSize = card.rank === '10' ? 25 : 28;
  const corner = (
    <>
      <text
        x="11"
        y="29"
        fontSize={rankSize}
        fontWeight="800"
        fill={color}
        letterSpacing={card.rank === '10' ? -2.5 : 0}
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
      >
        {card.rank}
      </text>
      <path d={SUIT_PATH[card.suit]} fill={color} transform="translate(10 35) scale(1)" />
    </>
  );

  return (
    <svg
      viewBox="0 0 100 140"
      role="img"
      aria-label={cardSpoken(card)}
      className={`block drop-shadow-md ${className}`}
      style={box}
    >
      <rect x="1" y="1" width="98" height="138" rx="9" fill="#fbfbf7" stroke="#d9d9d0" strokeWidth="1" />
      {corner}
      <g transform="rotate(180 50 70)">{corner}</g>
      {face ? (
        <g>
          <rect x="30" y="38" width="40" height="64" rx="5" fill={red ? '#fbe7ea' : '#e8ebf1'} stroke={color} strokeOpacity="0.35" />
          <text
            x="50"
            y="83"
            textAnchor="middle"
            fontSize="36"
            fontWeight="800"
            fill={color}
            fontFamily="Georgia, 'Times New Roman', serif"
          >
            {card.rank}
          </text>
          <path d={SUIT_PATH[card.suit]} fill={color} transform="translate(42 44) scale(0.8)" />
        </g>
      ) : (
        <path
          d={SUIT_PATH[card.suit]}
          fill={color}
          transform={card.rank === 'A' ? 'translate(25 45) scale(2.5)' : 'translate(32 52) scale(1.8)'}
        />
      )}
    </svg>
  );
}
