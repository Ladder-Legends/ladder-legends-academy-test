import { Metadata } from 'next';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Image
                  src="/LL_LOGO.png"
                  alt="Ladder Legends"
                  width={48}
                  height={48}
                  unoptimized
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              {/* Navigation */}
              <MainNav />
            </div>

            {/* Right side items */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-background">
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
