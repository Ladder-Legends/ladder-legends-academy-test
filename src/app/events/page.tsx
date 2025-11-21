import { Footer } from '@/components/footer';
import { EventsContent } from '@/components/events/events-content';
import { Suspense } from 'react';

export const metadata = {
  title: 'Events',
  description: 'Join our upcoming Starcraft 2 events: tournaments, coaching sessions, and community games. Connect with the community and improve your skills.',
  openGraph: {
    title: 'Events | Ladder Legends Academy',
    description: 'Join our upcoming Starcraft 2 events: tournaments, coaching sessions, and community games. Connect with the community and improve your skills.',
    url: 'https://www.ladderlegendsacademy.com/events',
    siteName: 'Ladder Legends Academy',
    type: 'website',
    images: [
      {
        url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
        width: 1200,
        height: 630,
        alt: 'Ladder Legends Academy Events',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Events | Ladder Legends Academy',
    description: 'Join our upcoming Starcraft 2 events: tournaments, coaching sessions, and community games. Connect with the community and improve your skills.',
    images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
  },
};

export default function EventsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <EventsContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
