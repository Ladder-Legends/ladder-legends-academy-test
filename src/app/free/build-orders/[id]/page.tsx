import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import buildOrdersData from '@/data/build-orders.json';
import { BuildOrder } from '@/types/build-order';
import { Video, ArrowLeft, Download } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { getContentVideoUrl } from '@/lib/video-helpers';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';

const allBuildOrders = buildOrdersData as BuildOrder[];
const allReplays = replaysData as Replay[];

// Generate static paths for all FREE build orders at build time
export async function generateStaticParams() {
  return allBuildOrders
    .filter(bo => bo.isFree === true)
    .map((bo) => ({
      id: bo.id,
    }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreeBuildOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const buildOrder = allBuildOrders.find(bo => bo.id === id);

  // 404 if build order doesn't exist OR if it's not free
  if (!buildOrder || !buildOrder.isFree) {
    notFound();
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'macro': return 'bg-blue-500/10 text-blue-500';
      case 'all-in': return 'bg-red-500/10 text-red-500';
      case 'timing': return 'bg-purple-500/10 text-purple-500';
      case 'cheese': return 'bg-orange-500/10 text-orange-500';
      case 'defensive': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Look up replay if replayId is present
  const linkedReplay = buildOrder.replayId
    ? allReplays.find(r => r.id === buildOrder.replayId)
    : null;

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
              href="/build-orders"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Build Orders
            </Link>

            {/* Title Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">{buildOrder.name}</h1>
                <SubscriberBadge isFree={buildOrder.isFree} />
              </div>
              <div className="flex flex-wrap gap-3">
                {buildOrder.type && (
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getTypeColor(buildOrder.type)}`}>
                    {buildOrder.type}
                  </span>
                )}
                <span className={`px-3 py-1.5 text-sm font-medium text-white rounded-full ${getDifficultyColor(buildOrder.difficulty)}`}>
                  {buildOrder.difficulty}
                </span>
                <span className="px-3 py-1.5 text-sm font-medium bg-muted rounded-full capitalize">
                  {buildOrder.race} vs {buildOrder.vsRace}
                </span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{buildOrder.description}</p>
            </div>

            {/* Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Build Order Information</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                  <dd className="font-medium">{buildOrder.coach}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Matchup</dt>
                  <dd className="font-medium capitalize">{buildOrder.race} vs {buildOrder.vsRace}</dd>
                </div>
                {buildOrder.type && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Type</dt>
                    <dd className="font-medium capitalize">{buildOrder.type}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                  <dd className="font-medium capitalize">{buildOrder.difficulty}</dd>
                </div>
                {buildOrder.patch && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Patch</dt>
                    <dd className="font-medium">{buildOrder.patch}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="font-medium">{new Date(buildOrder.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Video & Replay Links */}
            {(getContentVideoUrl(buildOrder) || linkedReplay?.downloadUrl) && (
              <div className="flex flex-wrap gap-4">
                {getContentVideoUrl(buildOrder) && (
                  <PaywallLink
                    href={getContentVideoUrl(buildOrder)!}
                    isFree={buildOrder.isFree}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <Video className="h-5 w-5" />
                    Watch Video Tutorial{buildOrder.videoIds && buildOrder.videoIds.length > 1 ? ` (${buildOrder.videoIds.length} videos)` : ''}
                  </PaywallLink>
                )}

                {linkedReplay?.downloadUrl && (
                  <PaywallLink
                    href={linkedReplay.downloadUrl}
                    isFree={buildOrder.isFree}
                    download
                    className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
                  >
                    <Download className="h-5 w-5" />
                    Download Replay
                  </PaywallLink>
                )}
              </div>
            )}

            {/* Build Order Steps */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Build Order Steps</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Supply</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Time</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Action</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildOrder.steps.map((step, index) => (
                      <tr
                        key={index}
                        className={`border-t border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}
                      >
                        <td className="px-4 py-3 font-semibold">{step.supply}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{step.time || '-'}</td>
                        <td className="px-4 py-3 font-medium">{step.action}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{step.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tags */}
            {buildOrder.tags && buildOrder.tags.length > 0 && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {buildOrder.tags.map(tag => (
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
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
