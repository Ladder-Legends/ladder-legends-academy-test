import { ReplaysContent } from '@/components/replays/replays-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Replays',
  description: 'Watch and analyze professional StarCraft 2 replays from top players. Learn winning strategies, builds, and tactics from Grandmaster gameplay.',
  openGraph: {
    title: 'Pro Replays | Ladder Legends Academy',
    description: 'Watch and analyze professional StarCraft 2 replays from top players. Learn winning strategies, builds, and tactics from Grandmaster gameplay.',
    url: 'https://www.ladderlegendsacademy.com/replays',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Pro Replays',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pro Replays | Ladder Legends Academy',
    description: 'Watch and analyze professional StarCraft 2 replays from top players. Learn winning strategies, builds, and tactics from Grandmaster gameplay.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function ReplaysPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <ReplaysContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
