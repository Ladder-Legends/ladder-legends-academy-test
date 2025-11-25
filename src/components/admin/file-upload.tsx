'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void | Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

/**
 * Generic file upload component with drag-and-drop support
 * Reusable for any file type: videos, replays, images, etc.
 */
export function FileUpload({
  onFileSelect,
  accept = '*',
  maxSizeMB = 100,
  label = 'Select File',
  description = 'Drag and drop or click to browse',
  uploading = false,
  uploadProgress,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);

  const validateAndProcess = async (file: File) => {
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type if accept pattern is specified
    if (accept !== '*') {
      const acceptPatterns = accept.split(',').map(p => p.trim());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const mimeType = file.type;

      const isAccepted = acceptPatterns.some(pattern => {
        // Check extension match
        if (pattern.startsWith('.')) {
          return fileExtension === pattern.toLowerCase();
        }
        // Check MIME type match (e.g., "video/*", "image/*")
        if (pattern.includes('*')) {
          const [type] = pattern.split('/');
          return mimeType.startsWith(type);
        }
        // Check exact MIME type match
        return mimeType === pattern;
      });

      if (!isAccepted) {
        toast.error(`Invalid file type. Expected: ${accept}`);
        return;
      }
    }

    await onFileSelect(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndProcess(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await validateAndProcess(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      } ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {!uploading ? (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-4">
            {isDragging ? `Drop file here` : description}
          </div>
          <label htmlFor={`file-upload-${label.replace(/\s+/g, '-')}`} className="cursor-pointer">
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
              {label}
            </div>
            <input
              id={`file-upload-${label.replace(/\s+/g, '-')}`}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium">Uploading...</div>
          {uploadProgress !== undefined && (
            <>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground">{uploadProgress}%</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
