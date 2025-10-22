'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Video } from '@/types/video';
import { toast } from 'sonner';

interface VideoEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function VideoEditModal({ video, isOpen, onClose, isNew = false }: VideoEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Video>>({});

  useEffect(() => {
    if (video) {
      setFormData(video);
    } else if (isNew) {
      setFormData({
        id: `video-${Date.now()}`,
        title: '',
        description: '',
        youtubeId: '',
        date: new Date().toISOString().split('T')[0],
        tags: [],
      });
    }
  }, [video, isNew, isOpen]);

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.youtubeId) {
      toast.error('Please fill in all required fields (Title, YouTube ID)');
      return;
    }

    const videoData: Video = {
      id: formData.id,
      title: formData.title,
      description: formData.description || '',
      youtubeId: formData.youtubeId,
      thumbnail: `https://i.ytimg.com/vi/${formData.youtubeId}/hqdefault.jpg`,
      date: formData.date || new Date().toISOString().split('T')[0],
      tags: formData.tags || [],
      threadUrl: formData.threadUrl,
    };

    addChange({
      id: videoData.id,
      contentType: 'videos',
      operation: isNew ? 'create' : 'update',
      data: videoData,
    });

    toast.success(`Video ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Video' : 'Edit Video'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Video ID</label>
          <input
            type="text"
            value={formData.id || ''}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="video-1"
            disabled={!isNew}
          />
          {!isNew && (
            <p className="text-xs text-muted-foreground mt-1">ID cannot be changed for existing videos</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Hino Ladder VOD - ZvT Masterclass"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            rows={3}
            placeholder="Description of the video content..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">YouTube ID *</label>
          <input
            type="text"
            value={formData.youtubeId || ''}
            onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="dQw4w9WgXcQ"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The ID from the YouTube URL (e.g., youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={formData.tags?.join(', ') || ''}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="hino, zerg, zvt"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Thread URL (optional)</label>
          <input
            type="url"
            value={formData.threadUrl || ''}
            onChange={(e) => setFormData({ ...formData, threadUrl: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="https://discord.com/channels/..."
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Save to Local Storage
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Changes are saved to browser storage. Click the commit button to push to GitHub.
        </p>
      </div>
    </Modal>
  );
}
