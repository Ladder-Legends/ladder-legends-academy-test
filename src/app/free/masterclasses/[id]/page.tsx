import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { Play, ArrowLeft, Clock } from 'lucide-react';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { PaywallLink } from '@/components/auth/paywall-link';

const allMasterclasses = masterclassesData as Masterclass[];

// Generate static paths for all FREE masterclasses at build time
export async function generateStaticParams() {
  return allMasterclasses
    .filter(mc => mc.isFree === true)
    .map((mc) => ({
      id: mc.id,
    }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreeMasterclassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const masterclass = allMasterclasses.find(mc => mc.id === id);

  // 404 if masterclass doesn't exist OR if it's not free
  if (!masterclass || !masterclass.isFree) {
    notFound();
  }

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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

              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button */}
            <Link
              href="/masterclasses"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Masterclasses
            </Link>

            {/* Title Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">{masterclass.title}</h1>
                <SubscriberBadge isFree={masterclass.isFree} />
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{masterclass.description}</p>
            </div>

            {/* Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Masterclass Information</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                  <dd className="font-medium">{masterclass.coach}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Race</dt>
                  <dd className={`font-medium capitalize ${getRaceColor(masterclass.race)}`}>{masterclass.race}</dd>
                </div>
                {masterclass.duration && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Duration</dt>
                    <dd className="font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {masterclass.duration}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                  <dd className="font-medium capitalize">{masterclass.difficulty}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Created</dt>
                  <dd className="font-medium">{new Date(masterclass.createdAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="font-medium">{new Date(masterclass.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Video Player */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="aspect-video">
                {masterclass.videoIds && masterclass.videoIds.length > 0 && (
                  <iframe
                    src={`https://www.youtube.com/embed/${masterclass.videoIds[0]}`}
                    title={masterclass.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* Tags */}
            {masterclass.tags && masterclass.tags.length > 0 && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {masterclass.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-muted text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Watch Full Video Button */}
            <div className="flex gap-4">
              <PaywallLink
                href={`/library/${masterclass.videoIds[0]}`}
                isFree={masterclass.isFree}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Play className="h-5 w-5" />
                Watch Full Video
              </PaywallLink>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
