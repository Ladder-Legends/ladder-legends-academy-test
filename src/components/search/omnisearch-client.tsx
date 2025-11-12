'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Search, X, ExternalLink, ChevronRight, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import buildOrdersData from '@/data/build-orders.json';
import replaysData from '@/data/replays.json';
import videosData from '@/data/videos.json';
import masterclassesData from '@/data/masterclasses.json';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';
import { BuildOrder } from '@/types/build-order';
import { Replay } from '@/types/replay';
import { Video } from '@/types/video';
import { Masterclass } from '@/types/masterclass';
import { Event } from '@/types/event';
import { Coach } from '@/types/coach';
import {
  enrichBuildOrder,
  enrichReplay,
  enrichVideo,
  enrichMasterclass,
  enrichEvent,
  createSearchableText,
  ContentCollections,
} from '@/lib/content-enrichment';

const buildOrders = buildOrdersData as BuildOrder[];
const replays = replaysData as Replay[];
const videos = videosData as Video[];
const masterclasses = masterclassesData as Masterclass[];
const events = eventsData as Event[];
const coaches = coachesData as Coach[];

const collections: ContentCollections = {
  buildOrders,
  replays,
  videos,
  masterclasses,
  events,
  coaches,
};

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'coach' | 'masterclass' | 'event' | 'buildOrder' | 'replay' | 'video';
  url: string;
  metadata?: Record<string, unknown>;
  score: number;
  isPremium?: boolean;
}

interface SearchResults {
  coaches: SearchResult[];
  masterclasses: SearchResult[];
  events: SearchResult[];
  buildOrders: SearchResult[];
  replays: SearchResult[];
  videos: SearchResult[];
  totalResults: number;
  totalCounts: {
    coaches: number;
    masterclasses: number;
    events: number;
    buildOrders: number;
    replays: number;
    videos: number;
  };
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  coach: 'Coaches',
  masterclass: 'Masterclasses',
  event: 'Events',
  buildOrder: 'Build Orders',
  replay: 'Replays',
  video: 'Videos',
};

const TYPE_SINGULAR: Record<SearchResult['type'], string> = {
  coach: 'Coach',
  masterclass: 'Masterclass',
  event: 'Event',
  buildOrder: 'Build Order',
  replay: 'Replay',
  video: 'Video',
};

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  coach: 'text-foreground',
  masterclass: 'text-foreground',
  event: 'text-foreground',
  buildOrder: 'text-foreground',
  replay: 'text-foreground',
  video: 'text-foreground',
};

const TYPE_PAGES: Record<SearchResult['type'], string> = {
  coach: '/coaches',
  masterclass: '/masterclasses',
  event: '/events',
  buildOrder: '/build-orders',
  replay: '/replays',
  video: '/library',
};

/**
 * Calculate relevance score based on where the match was found
 */
function calculateScore(
  query: string,
  title: string,
  description?: string,
  enrichedText?: string
): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description?.toLowerCase() || '';

  let score = 0;

  // Exact title match: highest score
  if (lowerTitle === lowerQuery) {
    score += 100;
  }
  // Title starts with query
  else if (lowerTitle.startsWith(lowerQuery)) {
    score += 75;
  }
  // Title contains query
  else if (lowerTitle.includes(lowerQuery)) {
    score += 50;
  }

  // Description contains query
  if (lowerDesc.includes(lowerQuery)) {
    score += 25;
  }

  // Enriched content contains query (related content)
  if (enrichedText?.includes(lowerQuery)) {
    score += 10;
  }

  return score;
}

interface OmnisearchProps {
  className?: string;
  placeholder?: string;
  onClose?: () => void;
}

export function OmnisearchClient({ className, placeholder = 'Search...', onClose }: OmnisearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const hasSubscription =
    session?.user?.hasSubscriberRole ||
    session?.user?.roles?.includes('coaches') ||
    session?.user?.roles?.includes('owner') ||
    false;

  // Perform search on the client side
  const performSearch = useCallback((searchQuery: string, limit = 5) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();

    // Search coaches
    const allCoachResults = coaches
      .filter(coach => {
        const searchText = [coach.name, coach.bio, coach.race, coach.specialties?.join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(coach => ({
        id: coach.id,
        title: coach.name,
        description: coach.bio,
        type: 'coach' as const,
        url: `/coaches/${coach.id}`,
        metadata: { race: coach.race },
        score: calculateScore(searchQuery, coach.name, coach.bio),
      }))
      .sort((a, b) => b.score - a.score);
    const totalCoaches = allCoachResults.length;
    const coachResults = allCoachResults.slice(0, limit);

    // Search masterclasses
    const allMasterclassResults = masterclasses
      .filter(mc => {
        const enriched = enrichMasterclass(mc, collections);
        const searchText = [
          mc.title,
          mc.description,
          mc.coach,
          mc.race,
          ...mc.tags,
          ...enriched._enriched.videoTitles,
          ...enriched._enriched.buildOrderNames,
          ...enriched._enriched.replayTitles,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(mc => {
        const enriched = enrichMasterclass(mc, collections);
        return {
          id: mc.id,
          title: mc.title,
          description: mc.description,
          type: 'masterclass' as const,
          url: `/masterclasses/${mc.id}`,
          metadata: { coach: mc.coach, race: mc.race, difficulty: mc.difficulty },
          score: calculateScore(searchQuery, mc.title, mc.description, createSearchableText(enriched)),
          isPremium: !mc.isFree,
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);
    const totalMasterclasses = allMasterclassResults.length;
    const masterclassResults = allMasterclassResults.slice(0, limit);

    // Search events
    const allEventResults = events
      .filter(event => {
        const enriched = enrichEvent(event, collections);
        const searchText = [
          event.title,
          event.description,
          event.type,
          event.coach,
          ...event.tags,
          ...enriched._enriched.videoTitles,
          ...enriched._enriched.masterclassTitles,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(event => {
        const enriched = enrichEvent(event, collections);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          type: 'event' as const,
          url: `/events/${event.id}`,
          metadata: { type: event.type, date: event.date, coach: event.coach },
          score: calculateScore(searchQuery, event.title, event.description, createSearchableText(enriched)),
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);
    const totalEvents = allEventResults.length;
    const eventResults = allEventResults.slice(0, limit);

    // Search build orders
    const allBuildOrderResults = buildOrders
      .filter(bo => {
        const enriched = enrichBuildOrder(bo, collections);
        const searchText = [
          bo.name,
          bo.description,
          bo.coach,
          bo.race,
          bo.vsRace,
          bo.type,
          ...bo.tags,
          ...enriched._enriched.videoTitles,
          ...enriched._enriched.replayPlayers,
          enriched._enriched.replayMap,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(bo => {
        const enriched = enrichBuildOrder(bo, collections);
        return {
          id: bo.id,
          title: bo.name,
          description: bo.description,
          type: 'buildOrder' as const,
          url: `/build-orders/${bo.id}`,
          metadata: { race: bo.race, vsRace: bo.vsRace, difficulty: bo.difficulty, coach: bo.coach },
          score: calculateScore(searchQuery, bo.name, bo.description, createSearchableText(enriched)),
          isPremium: !bo.isFree,
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);
    const totalBuildOrders = allBuildOrderResults.length;
    const buildOrderResults = allBuildOrderResults.slice(0, limit);

    // Search replays
    const allReplayResults = replays
      .filter(replay => {
        const enriched = enrichReplay(replay, collections);
        const searchText = [
          replay.title,
          replay.description,
          replay.map,
          replay.player1.name,
          replay.player2.name,
          replay.coach,
          replay.matchup,
          ...replay.tags,
          ...enriched._enriched.videoTitles,
          ...enriched._enriched.buildOrderNames,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(replay => {
        const enriched = enrichReplay(replay, collections);
        return {
          id: replay.id,
          title: replay.title,
          description: replay.description,
          type: 'replay' as const,
          url: `/replays/${replay.id}`,
          metadata: {
            matchup: replay.matchup,
            map: replay.map,
            player1: replay.player1.name,
            player2: replay.player2.name,
            coach: replay.coach,
          },
          score: calculateScore(searchQuery, replay.title, replay.description, createSearchableText(enriched)),
          isPremium: !replay.isFree,
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);
    const totalReplays = allReplayResults.length;
    const replayResults = allReplayResults.slice(0, limit);

    // Search videos
    const allVideoResults = videos
      .filter(video => {
        const enriched = enrichVideo(video, collections);
        const searchText = [
          video.title,
          video.description,
          video.coach,
          ...video.tags,
          ...enriched._enriched.buildOrderNames,
          ...enriched._enriched.replayTitles,
          ...enriched._enriched.replayPlayers,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(video => {
        const enriched = enrichVideo(video, collections);
        return {
          id: video.id,
          title: video.title,
          description: video.description,
          type: 'video' as const,
          url: `/library/${video.id}`,
          metadata: {
            coach: video.coach,
            date: video.date,
            source: video.muxPlaybackId ? 'mux' : video.youtubeId ? 'youtube' : 'playlist',
          },
          score: calculateScore(searchQuery, video.title, video.description, createSearchableText(enriched)),
          isPremium: !video.isFree,
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);
    const totalVideos = allVideoResults.length;
    const videoResults = allVideoResults.slice(0, limit);

    const totalResults = totalCoaches + totalMasterclasses + totalEvents + totalBuildOrders + totalReplays + totalVideos;

    setResults({
      coaches: coachResults,
      masterclasses: masterclassResults,
      events: eventResults,
      buildOrders: buildOrderResults,
      replays: replayResults,
      videos: videoResults,
      totalResults,
      totalCounts: {
        coaches: totalCoaches,
        masterclasses: totalMasterclasses,
        events: totalEvents,
        buildOrders: totalBuildOrders,
        replays: totalReplays,
        videos: totalVideos,
      },
    });
    setIsOpen(true);
  }, [hasSubscription]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleResultClick = useCallback((url: string) => {
    router.push(url);
    setIsOpen(false);
    setQuery('');
    onClose?.();
  }, [router, onClose]);

  const handleViewMore = useCallback((type: SearchResult['type']) => {
    const basePath = TYPE_PAGES[type];
    router.push(`${basePath}?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
    setQuery('');
    onClose?.();
  }, [query, router, onClose]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  // Render a group of results
  const renderResultGroup = (
    type: SearchResult['type'],
    items: SearchResult[],
    totalInCategory: number
  ) => {
    if (items.length === 0) return null;

    return (
      <div key={type} className="border-b border-border last:border-b-0">
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50">
          <h3 className={cn('text-sm font-semibold', TYPE_COLORS[type])}>
            {TYPE_LABELS[type]} ({items.length} of {totalInCategory})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => handleViewMore(type)}
          >
            View all results
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <div className="divide-y divide-border">
          {items.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result.url)}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {result.isPremium && !hasSubscription && (
                    <Lock className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                    {result.title}
                  </span>
                </div>
                {result.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {result.description}
                  </p>
                )}
                {result.metadata && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                      <span key={key}>
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Determine result order (coaches first, videos last)
  const resultOrder: SearchResult['type'][] = [
    'coach',
    'masterclass',
    'event',
    'buildOrder',
    'replay',
    'video',
  ];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          aria-label="Omnisearch"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Flyout - Full width */}
      {isOpen && results && (
        <div className="fixed left-0 right-0 mt-2 bg-card border-t border-border shadow-xl max-h-[80vh] overflow-y-auto z-50" style={{ top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 8 : 'auto' }}>
          {results.totalResults === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} for &quot;
                  <span className="font-medium text-foreground">{query}</span>&quot;
                </p>
              </div>
              {resultOrder.map((type) => {
                // Map type to result key (handle plural forms)
                const resultKey = (type === 'coach' ? 'coaches' :
                                  type === 'masterclass' ? 'masterclasses' :
                                  type === 'event' ? 'events' :
                                  type === 'buildOrder' ? 'buildOrders' :
                                  type === 'replay' ? 'replays' :
                                  'videos') as keyof Omit<SearchResults, 'totalResults' | 'totalCounts'>;
                const items = results[resultKey] as SearchResult[];
                const totalCount = results.totalCounts[resultKey];
                if (!items || items.length === 0) return null;
                return renderResultGroup(type, items, totalCount);
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
