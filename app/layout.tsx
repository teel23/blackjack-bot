import type { Metadata, Viewport } from 'next';
import AppProvider from '@/components/AppProvider';
import './globals.css';

// iOS launch screens, rendered by scripts/make-splash.mjs: [css width, css height, pixel ratio].
const SPLASH: [number, number, number][] = [
  [375, 667, 2], [360, 780, 3], [390, 844, 3], [393, 852, 3], [402, 874, 3],
  [428, 926, 3], [430, 932, 3], [440, 956, 3], [414, 896, 2], [414, 896, 3],
];

export const metadata: Metadata = {
  title: 'Blackjack Bot — learn basic strategy',
  description:
    'An iPhone-first blackjack trainer: daily lessons, drills, a strategy chart and a play-money practice table. Educational only — play money, no gambling.',
  applicationName: 'Blackjack Bot',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Blackjack Bot',
    startupImage: SPLASH.map(([w, h, r]) => ({
      url: `/splash/splash-${w * r}x${h * r}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  // Next emits mobile-web-app-capable; older iOS versions still look for the apple- prefixed tag.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#0a100e',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
