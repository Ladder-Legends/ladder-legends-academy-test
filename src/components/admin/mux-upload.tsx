'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import * as UpChunk from '@mux/upchunk';

interface MuxUploadProps {
  onUploadComplete: (assetId: string, playbackId: string) => void;
  title?: string;
  description?: string;
}

/**
 * MuxUpload component
 *
 * Handles direct file uploads to Mux.
 * 1. Creates an upload URL from the API
 * 2. Uploads the file directly to Mux
 * 3. Polls for upload completion
 * 4. Returns the asset ID and playback ID
 */
export function MuxUpload({ onUploadComplete, title, description }: MuxUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - check both MIME type and extension
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidMimeType = file.type.startsWith('video/');
    const isValidExtension = validExtensions.includes(fileExtension);

    if (!isValidMimeType && !isValidExtension) {
      toast.error('Please select a valid video file');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setStatus('Creating upload URL...');

      console.log('[MUX UPLOAD CLIENT] Starting upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        title,
        titleLength: (title || '').length,
      });

      // Step 1: Create upload URL
      const createResponse = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('[MUX UPLOAD CLIENT] Failed to create upload URL:', {
          status: createResponse.status,
          error,
        });
        throw new Error(error.error || 'Failed to create upload URL');
      }

      const { uploadId, uploadUrl } = await createResponse.json();

      console.log('[MUX UPLOAD CLIENT] Upload URL created:', {
        uploadId,
        hasUploadUrl: !!uploadUrl,
      });

      setStatus('Uploading video to Mux...');

      // Step 2: Upload file to Mux using UpChunk for better reliability
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: file,
        chunkSize: 30720, // 30MB chunks (recommended by Mux)
      });

      // Track upload progress
      upload.on('progress', (progressEvent) => {
        const percentComplete = Math.round(progressEvent.detail);
        setProgress(percentComplete);
      });

      // Handle upload success
      upload.on('success', async () => {
        console.log('[MUX UPLOAD CLIENT] File upload complete, waiting for asset creation');
        setStatus('Processing video...');
        setProgress(100);

        // Step 3: Poll for asset creation
        await pollUploadStatus(uploadId);
      });

      // Handle upload errors with retries
      upload.on('error', (error) => {
        console.error('[MUX UPLOAD CLIENT] UpChunk error:', {
          error,
          detail: error.detail,
          message: error.detail?.message,
        });
        throw new Error(error.detail?.message || 'Upload failed');
      });
    } catch (error) {
      console.error('[MUX UPLOAD CLIENT] Upload error:', {
        error,
        message: error instanceof Error ? error.message : 'Upload failed',
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
      setStatus('');
    }
  };

  const pollUploadStatus = async (uploadId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/mux/upload?uploadId=${uploadId}`);

        if (!response.ok) {
          console.error('[MUX UPLOAD CLIENT] Failed to check upload status:', {
            status: response.status,
            uploadId,
          });
          throw new Error('Failed to check upload status');
        }

        const { status, assetId, error } = await response.json();

        console.log('[MUX UPLOAD CLIENT] Poll status:', {
          uploadId,
          status,
          assetId,
          hasError: !!error,
          attempts,
        });

        if (error) {
          throw new Error(error.message || 'Upload failed');
        }

        if (status === 'asset_created' && assetId) {
          console.log('[MUX UPLOAD CLIENT] Asset created, getting playback ID');

          // Asset created, now get the playback ID
          const assetResponse = await fetch('/api/mux/playback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId }),
          });

          if (!assetResponse.ok) {
            console.error('[MUX UPLOAD CLIENT] Failed to get asset info:', {
              status: assetResponse.status,
              assetId,
            });
            throw new Error('Failed to get asset information');
          }

          const assetData = await assetResponse.json();

          console.log('[MUX UPLOAD CLIENT] Upload complete!', {
            assetId,
            playbackId: assetData.playbackId,
          });

          toast.success('Video uploaded successfully!');
          setStatus('Video ready');
          onUploadComplete(assetId, assetData.playbackId);
          setUploading(false);
          return;
        }

        // Still processing, poll again
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Upload timeout - video is still processing. Please check back later.');
        }

        setTimeout(poll, 5000); // Poll every 5 seconds
      } catch (error) {
        console.error('[MUX UPLOAD CLIENT] Polling error:', {
          error,
          message: error instanceof Error ? error.message : 'Failed to process video',
          uploadId,
          attempts,
        });
        toast.error(error instanceof Error ? error.message : 'Failed to process video');
        setUploading(false);
        setStatus('');
      }
    };

    await poll();
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        {!uploading ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-4">
              Upload a video file to Mux (max 5GB)
            </div>
            <label htmlFor="mux-file-upload" className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Select Video File
              </div>
              <input
                id="mux-file-upload"
                type="file"
                accept="video/*,.mkv,.mp4,.mov,.avi,.wmv,.flv,.webm"
                onChange={handleFileSelect}
                className="sr-only"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: MP4, MOV, AVI, MKV, WebM, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">{status}</div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground">{progress}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
