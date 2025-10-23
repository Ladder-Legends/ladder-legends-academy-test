'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="relative"
    >
      <Sun
        className={`w-5 h-5 transition-all ${
          theme === 'dark'
            ? 'rotate-90 scale-0'
            : 'rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`w-5 h-5 absolute transition-all ${
          theme === 'dark'
            ? 'rotate-0 scale-100'
            : 'rotate-90 scale-0'
        }`}
      />
    </Button>
  );
}
