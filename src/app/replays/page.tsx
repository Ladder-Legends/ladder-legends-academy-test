import { ReplaysContent } from '@/components/replays/replays-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';

export default function ReplaysPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <ReplaysContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
