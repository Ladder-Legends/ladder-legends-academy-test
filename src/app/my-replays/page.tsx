import { MyReplaysContent } from '@/components/my-replays/my-replays-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';

export default function MyReplaysPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <MyReplaysContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
