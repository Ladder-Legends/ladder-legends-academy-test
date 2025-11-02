'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, Link as LinkIcon, Image as ImageIcon, List, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (filename: string, base64: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Enter markdown content...',
  minHeight = '600px',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertAtCursor('**', '**', 'bold text');
  const handleItalic = () => insertAtCursor('*', '*', 'italic text');
  const handleH1 = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + '# ' + value.substring(lineStart);
    onChange(newText);
  };
  const handleH2 = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + '## ' + value.substring(lineStart);
    onChange(newText);
  };
  const handleLink = () => insertAtCursor('[', '](https://example.com)', 'link text');
  const handleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + '- ' + value.substring(lineStart);
    onChange(newText);
  };
  const handleNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + '1. ' + value.substring(lineStart);
    onChange(newText);
  };

  const handleImageUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageFile(file);
    };
    input.click();
  };

  const handleImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

      // Call the upload handler
      if (onImageUpload) {
        onImageUpload(filename, base64);
      }

      // Insert markdown at cursor
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const imageMarkdown = `![Image description](/about/images/${filename})`;
      const newText = value.substring(0, start) + imageMarkdown + value.substring(start);
      onChange(newText);

      // Set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + imageMarkdown.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      toast.success('Image uploaded (will be saved on commit)');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border border-border rounded-md bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleH1}
          title="Heading 1"
          className="h-8 px-2"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleH2}
          title="Heading 2"
          className="h-8 px-2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-8 bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          title="Bold"
          className="h-8 px-2"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          title="Italic"
          className="h-8 px-2"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-8 bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLink}
          title="Insert Link"
          className="h-8 px-2"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUploadClick}
          title="Upload Image"
          className="h-8 px-2"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-8 bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBulletList}
          title="Bullet List"
          className="h-8 px-2"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleNumberedList}
          title="Numbered List"
          className="h-8 px-2"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Text Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full px-4 py-3 border rounded-md bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-y ${
            isDragging ? 'border-primary border-2' : 'border-border'
          }`}
          style={{ minHeight }}
          placeholder={placeholder}
        />
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-md flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium text-primary">Drop image here to upload</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag and drop images directly into the editor, or use the image button to upload. Maximum 2MB per image.
      </p>
    </div>
  );
}
