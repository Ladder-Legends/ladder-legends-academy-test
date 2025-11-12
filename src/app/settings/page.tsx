import { Metadata } from 'next';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 bg-background pattern-circuit-content">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground mb-8">
              Manage your account preferences and settings
            </p>

            <div className="space-y-6">
              {/* Timezone Settings */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Time & Date</h2>
                <TimezoneSettings />
              </div>

              {/* Future settings sections can be added here */}
              {/*
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                ... notification settings ...
              </div>
              */}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
