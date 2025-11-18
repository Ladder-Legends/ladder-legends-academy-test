import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';
import { Event, formatEventDateTime } from '@/types/event';
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

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = allEvents.find(e => e.id === id);

  if (!event) {
    return {
      title: 'Event Not Found',
      description: 'The requested event could not be found.',
    };
  }

  const eventDateTime = formatEventDateTime(event);
  const title = `${event.title} - ${eventDateTime}`;
  const description = event.description.slice(0, 160) || `Join us for ${event.title} at Ladder Legends Academy`;
  const url = `/events/${event.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Ladder Legends Academy',
      type: 'article',
      publishedTime: event.createdAt,
      modifiedTime: event.updatedAt,
      tags: event.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
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
