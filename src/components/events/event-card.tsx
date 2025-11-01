'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Event, getEventStatus, formatEventDateTime, getNextOccurrence } from "@/types/event";
import { Calendar, Clock, MapPin, User, Repeat, Lock } from "lucide-react";
import { PaywallLink } from "@/components/auth/paywall-link";
import coachesData from '@/data/coaches.json';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const status = getEventStatus(event);
  const nextOccurrence = getNextOccurrence(event);
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
    <PaywallLink href={`/events/${event.id}`} isFree={event.isFree} className="block">
      <Card className="h-full hover:shadow-lg transition-shadow group">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                {event.title}
              </CardTitle>
            </div>
            {!event.isFree && (
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`${getTypeColor(event.type)} border`}
            >
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
                Recurring
              </Badge>
            )}
          </div>

          <CardDescription className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDateTime(event)}</span>
            </div>

            {event.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{event.duration} minutes</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.timezone.replace('_', ' ')}</span>
            </div>

            {coach && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Coach: {coach.displayName}</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted text-xs rounded-full text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{event.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {event.recurring?.enabled && nextOccurrence && status === 'past' && (
            <div className="mt-3 text-sm text-muted-foreground">
              Next occurrence: {nextOccurrence.toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </PaywallLink>
  );
}
