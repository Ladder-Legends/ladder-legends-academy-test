'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ExternalLink, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'coach' | 'masterclass' | 'event' | 'buildOrder' | 'replay' | 'video';
  url: string;
  metadata?: Record<string, unknown>;
  score: number;
}

interface OmnisearchResponse {
  query: string;
  results: {
    coaches: SearchResult[];
    masterclasses: SearchResult[];
    events: SearchResult[];
    buildOrders: SearchResult[];
    replays: SearchResult[];
    videos: SearchResult[];
  };
  totalResults: number;
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
  coach: 'text-purple-600 dark:text-purple-400',
  masterclass: 'text-blue-600 dark:text-blue-400',
  event: 'text-green-600 dark:text-green-400',
  buildOrder: 'text-orange-600 dark:text-orange-400',
  replay: 'text-pink-600 dark:text-pink-400',
  video: 'text-cyan-600 dark:text-cyan-400',
};

const TYPE_PAGES: Record<SearchResult['type'], string> = {
  coach: '/coaches',
  masterclass: '/masterclasses',
  event: '/events',
  buildOrder: '/build-orders',
  replay: '/replays',
  video: '/videos',
};

interface OmnisearchProps {
  className?: string;
  placeholder?: string;
  onClose?: () => void;
}

export function Omnisearch({ className, placeholder = 'Search...', onClose }: OmnisearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmnisearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/omnisearch?q=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data: OmnisearchResponse = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

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
    // Navigate to the respective content page with search pre-filled
    const basePath = TYPE_PAGES[type];
    router.push(`${basePath}?search=${encodeURIComponent(query)}`);
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
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
          <h3 className={cn('text-sm font-semibold', TYPE_COLORS[type])}>
            {TYPE_LABELS[type]} ({totalInCategory})
          </h3>
          {totalInCategory > items.length && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleViewMore(type)}
            >
              View {totalInCategory - items.length} more
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
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
                  <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                    {result.title}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded bg-muted', TYPE_COLORS[type])}>
                    {TYPE_SINGULAR[type]}
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

      {/* Results Flyout */}
      {isOpen && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl max-h-[80vh] overflow-y-auto z-50">
          {results.totalResults === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} for "
                  <span className="font-medium text-foreground">{query}</span>"
                </p>
              </div>
              {resultOrder.map((type) => {
                const resultKey = (type + 's') as keyof typeof results.results;
                const items = results.results[resultKey] as SearchResult[];
                return renderResultGroup(type, items, items.length);
              })}
            </>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Searching...
          </div>
        </div>
      )}
    </div>
  );
}
