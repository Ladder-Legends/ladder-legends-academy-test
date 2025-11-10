'use client';

import { Event } from '@/types/event';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateGoogleCalendarUrl, downloadICalFile } from '@/lib/calendar';
import { useState, useRef, useEffect } from 'react';

interface AddToCalendarButtonProps {
  event: Event;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AddToCalendarButton({ event, variant = 'outline', size = 'sm' }: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // If not enough space below (need ~100px for dropdown), flip to top
      if (spaceBelow < 100 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event);
    console.log('Google Calendar URL:', url);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const handleICalDownload = () => {
    downloadICalFile(event);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Add to Calendar</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div
          className={`absolute right-0 w-48 rounded-md shadow-lg bg-popover border border-border z-50 ${
            dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="py-1">
            <button
              onClick={handleGoogleCalendar}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Google Calendar
            </button>
            <button
              onClick={handleICalDownload}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              iCal / Outlook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
