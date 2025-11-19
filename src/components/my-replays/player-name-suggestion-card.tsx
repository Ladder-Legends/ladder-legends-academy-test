'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface PlayerNameSuggestionCardProps {
  playerName: string;
  count: number;
  onConfirm: (name: string) => void;
  onReject: (name: string) => void;
}

export function PlayerNameSuggestionCard({
  playerName,
  count,
  onConfirm,
  onReject,
}: PlayerNameSuggestionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(playerName);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(playerName);
    setIsProcessing(false);
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Is this your player name?</h3>
            <p className="text-sm text-muted-foreground">
              We found <span className="font-mono font-semibold text-foreground">{playerName}</span> in {count} of your uploaded replays.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0"
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              size="sm"
              className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
