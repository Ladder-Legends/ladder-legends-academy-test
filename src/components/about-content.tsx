'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Edit, Save, X } from 'lucide-react';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';
import aboutData from '@/data/about.json';

const aboutContent = aboutData.content;

export function AboutContent() {
  const { addChange } = usePendingChanges();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(aboutContent);

  const handleSave = () => {
    addChange({
      id: 'about',
      contentType: 'about',
      operation: 'update',
      data: { content: editedContent },
    });
    setIsEditing(false);
    toast.success('About page updated (pending commit)');
  };

  const handleCancel = () => {
    setEditedContent(aboutContent);
    setIsEditing(false);
  };

  const handleImageUpload = (filename: string, base64: string) => {
    // Add image to pending changes
    addChange({
      id: `about-image-${filename}`,
      contentType: 'file',
      operation: 'create',
      data: {
        path: `public/about/images/${filename}`,
        content: base64,
      },
    });
  };

  return (
    <main className="flex-1 px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header with Edit Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {!isEditing && (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editedContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <PermissionGate require="owners">
              <div className="flex gap-2 sticky top-24">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </PermissionGate>
          </div>

          {/* Edit Mode */}
          {isEditing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Markdown Content
                </label>
                <MarkdownEditor
                  value={editedContent}
                  onChange={setEditedContent}
                  onImageUpload={handleImageUpload}
                  placeholder="Enter markdown content..."
                  minHeight="600px"
                />
              </div>
              <div className="border border-border rounded-lg p-6 bg-card/50">
                <h3 className="text-lg font-semibold mb-4">Preview</h3>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editedContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
