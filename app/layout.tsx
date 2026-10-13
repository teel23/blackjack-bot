import type { Metadata, Viewport } from 'next';
import AppProvider from '@/components/AppProvider';
import './globals.css';

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
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: { 'mobile-web-app-capable': 'yes' },
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
