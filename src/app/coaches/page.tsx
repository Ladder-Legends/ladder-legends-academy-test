import { CoachesContent } from '@/components/coaches-content';
import { Footer } from '@/components/footer';

export default function CoachesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <CoachesContent />

      {/* Footer */}
      <Footer />
    </div>
  );
}
