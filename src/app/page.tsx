import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <DashboardContent />

      {/* Footer */}
      <Footer />
    </div>
  );
}
