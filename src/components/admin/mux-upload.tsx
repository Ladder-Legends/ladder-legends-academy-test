'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import * as UpChunk from '@mux/upchunk';

interface MuxUploadProps {
  onUploadComplete: (assetId: string, playbackId: string, thumbnail?: string) => void;
  title?: string;
  description?: string;
  showThumbnailUpload?: boolean;
  thumbnailUploadLabel?: string;
}

/**
 * MuxUpload component
 *
 * Handles direct file uploads to Mux.
 * 1. Creates an upload URL from the API
 * 2. Uploads the file directly to Mux
 * 3. Polls for upload completion
 * 4. Returns the asset ID, playback ID, and optional custom thumbnail
 */
export function MuxUpload({
  onUploadComplete,
  title,
  description,
  showThumbnailUpload = false,
  thumbnailUploadLabel = 'Custom Thumbnail (Optional)'
}: MuxUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadedPlaybackId, setUploadedPlaybackId] = useState<string | null>(null);

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
          code: error.code,
          details: error.details,
          retryable: error.retryable,
        });
        // Show user-friendly error message
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
          const error = await response.json();
          console.error('[MUX UPLOAD CLIENT] Failed to check upload status:', {
            status: response.status,
            uploadId,
            error,
            code: error.code,
            details: error.details,
          });
          throw new Error(error.error || 'Failed to check upload status');
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
            const error = await assetResponse.json();
            console.error('[MUX UPLOAD CLIENT] Failed to get asset info:', {
              status: assetResponse.status,
              assetId,
              error,
              code: error.code,
              details: error.details,
            });
            throw new Error(error.error || 'Failed to get asset information');
          }

          const assetData = await assetResponse.json();

          console.log('[MUX UPLOAD CLIENT] Upload complete!', {
            assetId,
            playbackId: assetData.playbackId,
          });

          toast.success('Video uploaded successfully!');
          setStatus('Video ready');
          setUploadedAssetId(assetId);
          setUploadedPlaybackId(assetData.playbackId);

          // If thumbnail upload is enabled, wait for user to upload thumbnail or click done
          // Otherwise, complete immediately
          if (!showThumbnailUpload) {
            onUploadComplete(assetId, assetData.playbackId, undefined);
          }
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

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomThumbnail(base64);
      toast.success('Custom thumbnail uploaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
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

      {/* Thumbnail Upload - shown after video upload completes when enabled */}
      {showThumbnailUpload && uploadedAssetId && (
        <div>
          <label className="block text-sm font-medium mb-2">{thumbnailUploadLabel}</label>
          <div className="space-y-3">
            {customThumbnail ? (
              <div className="relative">
                <div className="relative w-full aspect-video rounded-lg border border-border overflow-hidden">
                  <Image
                    src={customThumbnail}
                    alt="Custom thumbnail preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomThumbnail(null)}
                  className="absolute top-2 right-2 px-3 py-1 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  id="mux-thumbnail-upload"
                />
                <label
                  htmlFor="mux-thumbnail-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Click to upload custom thumbnail</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </label>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {customThumbnail
                ? 'This custom thumbnail will be used for the video.'
                : 'If not uploaded, Mux will generate a thumbnail automatically.'}
            </p>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => {
              if (uploadedAssetId && uploadedPlaybackId) {
                onUploadComplete(uploadedAssetId, uploadedPlaybackId, customThumbnail || undefined);
              }
            }}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            {customThumbnail ? 'Continue with Custom Thumbnail' : 'Continue without Thumbnail'}
          </button>
        </div>
      )}
    </div>
  );
}
