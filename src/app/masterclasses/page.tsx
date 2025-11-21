import { MasterclassesContent } from '@/components/masterclasses/masterclasses-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masterclasses',
  description: 'In-depth masterclasses covering advanced StarCraft 2 strategies, tactics, and gameplay analysis. Learn from Grandmaster coaches.',
  openGraph: {
    title: 'Masterclasses | Ladder Legends Academy',
    description: 'In-depth masterclasses covering advanced StarCraft 2 strategies, tactics, and gameplay analysis. Learn from Grandmaster coaches.',
    url: 'https://www.ladderlegendsacademy.com/masterclasses',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Masterclasses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Masterclasses | Ladder Legends Academy',
    description: 'In-depth masterclasses covering advanced StarCraft 2 strategies, tactics, and gameplay analysis. Learn from Grandmaster coaches.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function MasterclassesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <MasterclassesContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
