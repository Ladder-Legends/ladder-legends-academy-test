import { notFound } from 'next/navigation';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';
import { Event } from '@/types/event';
import { EventDetailClient } from './event-detail-client';

const allEvents = eventsData as Event[];

// Generate static paths for all events at build time
export async function generateStaticParams() {
  return allEvents.map((event) => ({
    id: event.id,
  }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = allEvents.find(e => e.id === id);

  if (!event) {
    notFound();
  }

  const coach = event.coach ? coachesData.find(c => c.id === event.coach) || null : null;

  return <EventDetailClient event={event} coach={coach} />;
}
