'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  showFadeIndicator?: boolean; // For tables, adds a fade gradient on overflow
}

export function HorizontalScrollContainer({ children, className = '', showFadeIndicator = false }: HorizontalScrollContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const hasOverflow = scrollWidth > clientWidth;

      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10); // 10px threshold

      if (showFadeIndicator && hasOverflow) {
        setShowLeftFade(scrollLeft > 0);
        setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
      }
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 336; // card width (320px) + gap (16px)
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      {/* Left Fade Indicator */}
      {showFadeIndicator && showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-[5]" />
      )}

      {/* Right Fade Indicator */}
      {showFadeIndicator && showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-[5]" />
      )}

      {/* Left Arrow - Always visible on mobile, hover on desktop, only when scrollable */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/70 hover:bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-lg transition-all duration-300 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* Right Arrow - Always visible on mobile, hover on desktop, only when scrollable */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/70 hover:bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-lg transition-all duration-300 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className={`overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
