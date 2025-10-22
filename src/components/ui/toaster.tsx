'use client';

import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background) / 0.95)',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          backdropFilter: 'blur(8px)',
        },
      }}
    />
  )
}
