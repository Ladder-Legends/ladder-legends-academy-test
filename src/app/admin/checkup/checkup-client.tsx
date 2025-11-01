'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface StaleAssets {
  muxAssets: Array<{ playbackId: string; assetId: string }>;
  blobReplays: Array<{ url: string; pathname: string }>;
  brokenReplayRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  brokenBuildOrderRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  brokenMasterclassRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  staleEvents: Array<{ id: string; title: string; reason: string }>;
}

interface CleanupResults {
  deletedMuxAssets: number;
  deletedBlobReplays: number;
  errors: string[];
}

export function CheckupClient() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [results, setResults] = useState<StaleAssets | null>(null);
  const [cleanupResults, setCleanupResults] = useState<CleanupResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheckup = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setCleanupResults(null);

    try {
      const response = await fetch('/api/admin/checkup');
      if (!response.ok) {
        throw new Error('Failed to run checkup');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const cleanupAssets = async () => {
    if (!results) return;

    const hasAssets = results.muxAssets.length > 0 || results.blobReplays.length > 0;
    if (!hasAssets) {
      alert('No assets to clean up');
      return;
    }

    const confirmMessage = `Are you sure you want to delete:\n` +
      `- ${results.muxAssets.length} Mux asset(s)\n` +
      `- ${results.blobReplays.length} blob replay(s)\n\n` +
      `This action cannot be undone!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setCleaning(true);
    setError(null);
    setCleanupResults(null);

    try {
      const response = await fetch('/api/admin/checkup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assets: results }),
      });

      if (!response.ok) {
        throw new Error('Failed to clean up assets');
      }

      const data = await response.json();
      setCleanupResults(data);

      // Re-run checkup after cleanup
      await runCheckup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCleaning(false);
    }
  };

  const totalIssues = results
    ? results.muxAssets.length +
      results.blobReplays.length +
      results.brokenReplayRefs.length +
      results.brokenBuildOrderRefs.length +
      results.brokenMasterclassRefs.length +
      results.staleEvents.length
    : 0;

  const canCleanup = results && (results.muxAssets.length > 0 || results.blobReplays.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">System Checkup</h1>
          <p className="text-muted-foreground mt-2">
            Check for and clean up stale assets
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={runCheckup}
              disabled={loading || cleaning}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Checkup...
                </>
              ) : (
                'Run Checkup'
              )}
            </Button>

            {canCleanup && (
              <Button
                onClick={cleanupAssets}
                disabled={loading || cleaning}
                variant="destructive"
                size="lg"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clean Up Assets
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Error:</span>
                {error}
              </div>
            </div>
          )}

          {/* Cleanup Results */}
          {cleanupResults && (
            <div className="bg-green-500/10 border border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Cleanup Complete</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Deleted {cleanupResults.deletedMuxAssets} Mux asset(s)</li>
                <li>Deleted {cleanupResults.deletedBlobReplays} blob replay(s)</li>
              </ul>
              {cleanupResults.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-500/30">
                  <p className="font-semibold text-sm mb-1">Errors:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {cleanupResults.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {totalIssues === 0 ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle className="h-6 w-6" />
                      No Issues Found
                    </span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      Found {totalIssues} Issue{totalIssues !== 1 ? 's' : ''}
                    </span>
                  )}
                </h2>

                {totalIssues > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {results.muxAssets.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.muxAssets.length}</div>
                        <div className="text-sm text-muted-foreground">Unused Mux Assets</div>
                      </div>
                    )}
                    {results.blobReplays.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.blobReplays.length}</div>
                        <div className="text-sm text-muted-foreground">Unused Blob Replays</div>
                      </div>
                    )}
                    {results.brokenReplayRefs.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.brokenReplayRefs.length}</div>
                        <div className="text-sm text-muted-foreground">Broken Replay References</div>
                      </div>
                    )}
                    {results.brokenBuildOrderRefs.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.brokenBuildOrderRefs.length}</div>
                        <div className="text-sm text-muted-foreground">Broken Build Order References</div>
                      </div>
                    )}
                    {results.brokenMasterclassRefs.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.brokenMasterclassRefs.length}</div>
                        <div className="text-sm text-muted-foreground">Broken Masterclass References</div>
                      </div>
                    )}
                    {results.staleEvents.length > 0 && (
                      <div className="bg-muted rounded p-4">
                        <div className="text-2xl font-bold">{results.staleEvents.length}</div>
                        <div className="text-sm text-muted-foreground">Stale Events</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Results */}
              {results.muxAssets.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Unused Mux Assets</h3>
                  <div className="space-y-2">
                    {results.muxAssets.map((asset) => (
                      <div key={asset.assetId} className="bg-muted rounded px-4 py-2 font-mono text-sm">
                        <div>Playback ID: {asset.playbackId}</div>
                        <div className="text-muted-foreground text-xs">Asset ID: {asset.assetId}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.blobReplays.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Unused Blob Replays</h3>
                  <div className="space-y-2">
                    {results.blobReplays.map((replay) => (
                      <div key={replay.url} className="bg-muted rounded px-4 py-2 font-mono text-sm break-all">
                        <div className="font-semibold">{replay.pathname}</div>
                        <div className="text-muted-foreground text-xs">{replay.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.brokenReplayRefs.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Broken Replay References</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These need to be fixed manually in replays.json
                  </p>
                  <div className="space-y-2">
                    {results.brokenReplayRefs.map((ref, i) => (
                      <div key={i} className="bg-muted rounded px-4 py-2">
                        <div className="font-semibold">{ref.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {ref.id} | Field: {ref.field} → Missing: {ref.missingId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.brokenBuildOrderRefs.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Broken Build Order References</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These need to be fixed manually in build-orders.json
                  </p>
                  <div className="space-y-2">
                    {results.brokenBuildOrderRefs.map((ref, i) => (
                      <div key={i} className="bg-muted rounded px-4 py-2">
                        <div className="font-semibold">{ref.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {ref.id} | Field: {ref.field} → Missing: {ref.missingId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.brokenMasterclassRefs.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Broken Masterclass References</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These need to be fixed manually in masterclasses.json
                  </p>
                  <div className="space-y-2">
                    {results.brokenMasterclassRefs.map((ref, i) => (
                      <div key={i} className="bg-muted rounded px-4 py-2">
                        <div className="font-semibold">{ref.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {ref.id} | Field: {ref.field} → Missing: {ref.missingId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.staleEvents.length > 0 && (
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Stale Events</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These need to be removed manually from events.json
                  </p>
                  <div className="space-y-2">
                    {results.staleEvents.map((event) => (
                      <div key={event.id} className="bg-muted rounded px-4 py-2">
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {event.id} | {event.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
