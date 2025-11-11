import { Footer } from '@/components/footer';
import { EventsContent } from '@/components/events/events-content';
import { Suspense } from 'react';

export const metadata = {
  title: 'Events | Ladder Legends Academy',
  description: 'Join our upcoming Starcraft 2 events: tournaments, coaching sessions, and community games',
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
