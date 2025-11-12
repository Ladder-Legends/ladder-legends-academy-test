'use client';

import Link from 'next/link';
import { Lightbulb, ExternalLink } from 'lucide-react';

interface DidYouKnowProps {
  className?: string;
  bookingUrl?: string;
  hasSubscriberRole?: boolean;
}

export function DidYouKnow({ className = '', bookingUrl, hasSubscriberRole = false }: DidYouKnowProps) {
  return (
    <div className={`border-l-4 border-primary bg-primary/5 rounded-r-lg p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            Did You Know?
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Talk to your coach about personalized training plans and bulk session packages
          </p>
        </div>
        {bookingUrl && (
          <Link
            href={hasSubscriberRole ? bookingUrl : '/subscribe'}
            target={hasSubscriberRole ? "_blank" : undefined}
            rel={hasSubscriberRole ? "noopener noreferrer" : undefined}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold whitespace-nowrap"
          >
            Book Session
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
