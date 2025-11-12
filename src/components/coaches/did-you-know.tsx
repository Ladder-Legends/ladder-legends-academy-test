'use client';

import { Lightbulb } from 'lucide-react';

interface DidYouKnowProps {
  className?: string;
}

export function DidYouKnow({ className = '' }: DidYouKnowProps) {
  return (
    <div className={`border-l-4 border-primary bg-primary/5 rounded-r-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
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
      </div>
    </div>
  );
}
