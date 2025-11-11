import { BuildOrdersContent } from '@/components/build-orders/build-orders-content';
import { Footer } from '@/components/footer';
import { Suspense } from 'react';

export default function BuildOrdersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <Suspense fallback={<div className="flex-1" />}>
        <BuildOrdersContent />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
