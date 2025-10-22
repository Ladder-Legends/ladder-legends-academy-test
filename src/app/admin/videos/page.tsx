'use client';

import { useState, useEffect } from 'react';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Video } from '@/types/video';
import videosData from '@/data/videos.json';
import { toast } from 'sonner';

export default function VideosAdminPage() {
  const { changes, addChange } = usePendingChanges();
  const [videos, setVideos] = useState<Video[]>(videosData as Video[]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Video>>({});

  // Apply pending changes to local state
  useEffect(() => {
    let updated = [...videosData as Video[]];

    changes.forEach(change => {
      if (change.contentType !== 'videos') return;

      if (change.operation === 'create' || change.operation === 'update') {
        const index = updated.findIndex(v => v.id === change.data.id);
        if (index >= 0) {
          updated[index] = change.data;
        } else {
          updated.push(change.data);
        }
      } else if (change.operation === 'delete') {
        updated = updated.filter(v => v.id !== change.data.id);
      }
    });

    setVideos(updated);
  }, [changes]);

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData(video);
  };

  const handleDelete = (video: Video) => {
    if (!confirm(`Delete video "${video.title}"?`)) return;

    addChange({
      id: video.id,
      contentType: 'videos',
      operation: 'delete',
      data: video,
    });

    toast.success('Video deleted (pending commit)');
  };

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.youtubeId) {
      toast.error('Please fill in all required fields');
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

    const isNew = !videos.find(v => v.id === videoData.id);

    addChange({
      id: videoData.id,
      contentType: 'videos',
      operation: isNew ? 'create' : 'update',
      data: videoData,
    });

    toast.success(`Video ${isNew ? 'created' : 'updated'} (pending commit)`);
    setEditingId(null);
    setFormData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleNew = () => {
    const newId = `video-${Date.now()}`;
    setEditingId(newId);
    setFormData({
      id: newId,
      title: '',
      description: '',
      youtubeId: '',
      date: new Date().toISOString().split('T')[0],
      tags: [],
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground">Manage coaching videos and VODs</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>

      {editingId && (
        <div className="mb-6 p-6 border border-border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">
            {videos.find(v => v.id === editingId) ? 'Edit Video' : 'New Video'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Video ID</label>
              <input
                type="text"
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="video-1"
                disabled={!!videos.find(v => v.id === editingId)}
              />
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

            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold">ID</th>
              <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
              <th className="text-left px-6 py-4 text-sm font-semibold">Tags</th>
              <th className="text-left px-6 py-4 text-sm font-semibold">Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => (
              <tr
                key={video.id}
                className={`border-t border-border hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                }`}
              >
                <td className="px-6 py-4 font-mono text-sm">{video.id}</td>
                <td className="px-6 py-4">{video.title}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">
                        {tag}
                      </span>
                    ))}
                    {video.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        +{video.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{video.date}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(video)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(video)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
