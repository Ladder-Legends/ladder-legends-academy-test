import { MyReplaysContent } from '@/components/my-replays/my-replays-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Replays - Track Your SC2 Games | Ladder Legends Academy',
  description: 'Upload and analyze your StarCraft 2 replays. Get detailed statistics, track your progress, and improve your gameplay with AI-powered insights from Grandmaster coaches.',
  openGraph: {
    title: 'My Replays - Track Your StarCraft 2 Games',
    description: 'Upload and analyze your StarCraft 2 replays. Get detailed statistics, track your progress, and improve your gameplay with AI-powered insights.',
    url: 'https://www.ladderlegendsacademy.com/my-replays',
    siteName: 'Ladder Legends Academy',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Replays - Track Your StarCraft 2 Games',
    description: 'Upload and analyze your StarCraft 2 replays. Get detailed statistics and AI-powered insights from Grandmaster coaches.',
  },
};

export default function MyReplaysPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <MyReplaysContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
