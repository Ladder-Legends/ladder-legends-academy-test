import { MasterclassesContent } from '@/components/masterclasses/masterclasses-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';

export default function MasterclassesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <MasterclassesContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
