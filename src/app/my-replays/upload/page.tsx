/**
 * Upload Replay Page
 * Allows users to upload .SC2Replay files for analysis
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle2, XCircle } from 'lucide-react';
import type { LearnedBuild } from '@/lib/replay-types';

export default function UploadReplayPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [targetBuildId, setTargetBuildId] = useState<string>('');
  const [builds, setBuilds] = useState<LearnedBuild[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Load available builds on mount
  useEffect(() => {
    fetch('/api/builds')
      .then((res) => res.json())
      .then((data) => {
        setBuilds(data.builds || []);
        setIsLoadingBuilds(false);
      })
      .catch((err) => {
        console.error('Failed to load builds:', err);
        setIsLoadingBuilds(false);
      });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.SC2Replay')) {
      setFile(droppedFile);
      setUploadStatus('idle');
      setErrorMessage('');
    } else {
      setErrorMessage('Please drop a valid .SC2Replay file');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Build query params
      const params = new URLSearchParams();
      if (targetBuildId) {
        params.set('target_build_id', targetBuildId);
      }
      if (playerName) {
        params.set('player_name', playerName);
      }

      const url = `/api/my-replays${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload replay');
      }

      setUploadStatus('success');

      // Redirect to replay detail page after 1.5 seconds
      setTimeout(() => {
        router.push(`/my-replays/${data.replay.id}`);
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload replay');
    } finally {
      setIsUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Please sign in to upload replays.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Upload Replay</h1>
        <p className="text-muted-foreground">
          Upload a .SC2Replay file to analyze your build execution and get coaching feedback
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Replay File</CardTitle>
          <CardDescription>
            Upload your .SC2Replay file for comprehensive analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {file ? file.name : 'Drop your replay file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <Input
              type="file"
              accept=".SC2Replay"
              onChange={handleFileChange}
              className="max-w-xs mx-auto cursor-pointer"
            />
          </div>

          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="player-name">
              Player Name (Optional)
            </Label>
            <Input
              id="player-name"
              type="text"
              placeholder="Your in-game name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              If your replay has multiple players, specify which one to analyze
            </p>
          </div>

          {/* Target Build */}
          <div className="space-y-2">
            <Label htmlFor="target-build">
              Target Build (Optional)
            </Label>
            <Select
              value={targetBuildId}
              onValueChange={setTargetBuildId}
              disabled={isUploading || isLoadingBuilds}
            >
              <SelectTrigger id="target-build">
                <SelectValue placeholder="No comparison (auto-detect only)" />
              </SelectTrigger>
              <SelectContent>
                {builds.map((build) => (
                  <SelectItem key={build.id} value={build.id}>
                    {build.name} ({build.matchup})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Compare your execution to a specific build order
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Replay uploaded successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading || uploadStatus === 'success'}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Replay...
              </>
            ) : uploadStatus === 'success' ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Success!
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Analyze
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
