import { BuildOrdersContent } from '@/components/build-orders/build-orders-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build Orders',
  description: 'Master winning build orders for Terran, Zerg, and Protoss. Step-by-step guides with timings, strategies, and pro replays.',
  openGraph: {
    title: 'Build Orders | Ladder Legends Academy',
    description: 'Master winning build orders for Terran, Zerg, and Protoss. Step-by-step guides with timings, strategies, and pro replays.',
    url: 'https://www.ladderlegendsacademy.com/build-orders',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Build Orders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build Orders | Ladder Legends Academy',
    description: 'Master winning build orders for Terran, Zerg, and Protoss. Step-by-step guides with timings, strategies, and pro replays.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function BuildOrdersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <BuildOrdersContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
