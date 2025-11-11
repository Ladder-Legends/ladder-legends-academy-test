import { Suspense } from 'react';
import { VideoLibraryContent } from '@/components/videos/video-library-content';
import { Footer } from '@/components/footer';

export default function LibraryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <VideoLibraryContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
