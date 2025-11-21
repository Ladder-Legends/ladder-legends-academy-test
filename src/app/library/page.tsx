import { Suspense } from 'react';
import { Metadata } from 'next';
import { VideoLibraryContent } from '@/components/videos/video-library-content';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Video Library',
  description: 'Browse our complete video library featuring coaching sessions, tutorials, and professional StarCraft 2 gameplay from Grandmaster coaches.',
  openGraph: {
    title: 'Video Library | Ladder Legends Academy',
    description: 'Browse our complete video library featuring coaching sessions, tutorials, and professional StarCraft 2 gameplay from Grandmaster coaches.',
    url: 'https://www.ladderlegendsacademy.com/library',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Video Library',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Library | Ladder Legends Academy',
    description: 'Browse our complete video library featuring coaching sessions, tutorials, and professional StarCraft 2 gameplay from Grandmaster coaches.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function LibraryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <VideoLibraryContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
