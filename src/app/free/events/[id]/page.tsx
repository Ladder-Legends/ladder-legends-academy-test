import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';
import { Event, getEventStatus } from '@/types/event';
import { ArrowLeft, Calendar, Clock, MapPin, User, Repeat } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { Badge } from '@/components/ui/badge';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { EventDateDisplay } from '@/components/events/event-date-display';

const allEvents = eventsData as Event[];

// Generate static paths for all FREE events at build time
export async function generateStaticParams() {
  return allEvents
    .filter(event => event.isFree === true)
    .map((event) => ({
      id: event.id,
    }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreeEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = allEvents.find(e => e.id === id);

  // 404 if event doesn't exist OR if it's not free
  if (!event || !event.isFree) {
    notFound();
  }

  const status = getEventStatus(event);
  const coach = event.coach ? coachesData.find(c => c.id === event.coach) : null;

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'tournament':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'coaching':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'casting':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'streaming':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'replay-analysis':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'arcade':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Image
                  src="/LL_LOGO.png"
                  alt="Ladder Legends"
                  width={48}
                  height={48}
                  unoptimized
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Link>

            {/* Title Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">{event.title}</h1>
                <SubscriberBadge isFree={event.isFree} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`${getTypeColor(event.type)} border`}>
                  {event.type.replace('-', ' ')}
                </Badge>

                {status === 'upcoming' ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 border">
                    Upcoming
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border">
                    Past
                  </Badge>
                )}

                {event.recurring?.enabled && (
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 border">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring {event.recurring.frequency}
                  </Badge>
                )}
              </div>
            </div>

            {/* Event Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {event.recurring?.enabled ? 'Next Occurrence' : 'Date & Time'}
                  </dt>
                  <dd className="font-medium">
                    <EventDateDisplay event={event} />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Timezone
                  </dt>
                  <dd className="font-medium">{event.timezone.replace('_', ' ')}</dd>
                </div>

                {event.duration && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </dt>
                    <dd className="font-medium">{event.duration} minutes</dd>
                  </div>
                )}

                {coach && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Coach
                    </dt>
                    <dd className="font-medium">{coach.displayName}</dd>
                  </div>
                )}

                {event.recurring?.enabled && event.recurring.endDate && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Series End Date</dt>
                    <dd className="font-medium">{new Date(event.recurring.endDate).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Description */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <MarkdownContent content={event.description} />
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-muted text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-8 mt-12">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 Ladder Legends Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
