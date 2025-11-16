/**
 * My Replays Page
 * Display user's uploaded replays with filtering and stats
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, TrendingUp, Trophy, Target, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { UserReplayData } from '@/lib/replay-types';

export default function MyReplaysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [replays, setReplays] = useState<UserReplayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReplays();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchReplays = async () => {
    try {
      const response = await fetch('/api/my-replays');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replays');
      }

      setReplays(data.replays || []);
    } catch (err) {
      console.error('Error fetching replays:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replays');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Please sign in to view your replays.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalReplays = replays.length;
  const wins = replays.filter((r) => r.fingerprint.metadata.result === 'Win').length;
  const losses = replays.filter((r) => r.fingerprint.metadata.result === 'Loss').length;
  const avgScore = replays
    .filter((r) => r.comparison !== null)
    .reduce((sum, r) => sum + (r.comparison?.execution_score || 0), 0) / (replays.filter((r) => r.comparison).length || 1);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Replays</h1>
          <p className="text-muted-foreground">
            Track your progress and improve your build execution
          </p>
        </div>
        <Link href="/my-replays/upload">
          <Button size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload Replay
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {totalReplays > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Replays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReplays}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Win Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalReplays > 0 ? Math.round((wins / totalReplays) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {wins}W - {losses}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgScore > 0 ? Math.round(avgScore) : '-'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {replays.filter((r) => r.comparison).length} analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest Upload</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {replays[0]
                  ? new Date(replays[0].uploaded_at).toLocaleDateString()
                  : '-'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {totalReplays === 0 && !error && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No replays yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first replay to start tracking your progress
            </p>
            <Link href="/my-replays/upload">
              <Button size="lg">
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Replay
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Replay List */}
      {totalReplays > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Replays</h2>
          {replays.map((replay) => (
            <Card
              key={replay.id}
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/my-replays/${replay.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{replay.filename}</h3>
                      <Badge variant={replay.fingerprint.metadata.result === 'Win' ? 'default' : 'secondary'}>
                        {replay.fingerprint.metadata.result}
                      </Badge>
                      <Badge variant="outline">{replay.fingerprint.matchup}</Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(replay.uploaded_at).toLocaleDateString()}
                      </div>
                      <div>{replay.fingerprint.metadata.map}</div>
                      <div>
                        {replay.fingerprint.metadata.duration
                          ? `${Math.floor(replay.fingerprint.metadata.duration / 60)}:${String(Math.floor(replay.fingerprint.metadata.duration % 60)).padStart(2, '0')}`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {replay.detection && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Detected Build</p>
                        <Badge variant="outline" className="font-medium">
                          {replay.detection.build_name}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(replay.detection.confidence)}% confidence
                        </p>
                      </div>
                    )}

                    {replay.comparison && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Execution</p>
                        <div className="text-2xl font-bold">
                          {Math.round(replay.comparison.execution_score)}%
                        </div>
                        <Badge
                          variant={
                            replay.comparison.tier === 'S' || replay.comparison.tier === 'A'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {replay.comparison.tier}-Tier
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
