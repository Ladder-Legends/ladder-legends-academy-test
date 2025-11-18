'use client';

import { Event } from '@/types/event';
import { Calendar, ChevronDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateGoogleCalendarUrl, downloadICalFile } from '@/lib/calendar';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AddToCalendarButtonProps {
  event: Event;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isPremium?: boolean; // Is this premium content?
  hasSubscriberRole?: boolean; // Does the user have subscriber access?
}

export function AddToCalendarButton({
  event,
  variant = 'outline',
  size = 'sm',
  isPremium = false,
  hasSubscriberRole = false,
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setDropdownStyle({
          position: 'fixed',
          top: `${buttonRect.top - 100}px`,
          right: `${window.innerWidth - buttonRect.right}px`,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: `${buttonRect.bottom + 8}px`,
          right: `${window.innerWidth - buttonRect.right}px`,
        });
      }
    }
  }, [isOpen]);

  // Check if calendar should be gated
  const showPaywall = isPremium && !hasSubscriberRole;

  const handleGoogleCalendar = () => {
    if (showPaywall) {
      window.location.href = '/subscribe';
      return;
    }
    const url = generateGoogleCalendarUrl(event);
    console.log('Google Calendar URL:', url);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const handleICalDownload = () => {
    if (showPaywall) {
      window.location.href = '/subscribe';
      return;
    }
    downloadICalFile(event);
    setIsOpen(false);
  };

  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="w-48 rounded-md shadow-lg bg-popover border border-border z-[9999]"
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
  ) : null;

  return (
    <>
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        onClick={() => {
          if (showPaywall) {
            window.location.href = '/subscribe';
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className="flex items-center gap-1"
        title={showPaywall ? 'Subscribe to add events to your calendar' : 'Add to Calendar'}
      >
        {showPaywall ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Add to Calendar</span>
        {!showPaywall && <ChevronDown className="h-3 w-3" />}
      </Button>

      {mounted && !showPaywall && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
