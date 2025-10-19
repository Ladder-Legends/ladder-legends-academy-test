# Ladder Legends Academy

A Starcraft 2 coaching website featuring a filterable video catalog with a cyberpunk/neon aesthetic.

## Features

- 🎨 Cyberpunk/neon themed UI with purple and cyan accents
- 🎮 Race-specific tag colors (Protoss purple, Terran orange, Zerg purple)
- 🏷️ Filterable video catalog by tags (race, coach, topic)
- 📱 Responsive design with smooth animations
- ⚡ Built with Next.js 15, React 19, and Tailwind CSS 4
- 🎯 shadcn/ui components for consistent UI

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

```bash
npm run build
npm start
```

## Adding Videos

Videos are stored in `src/data/videos.json`. To add a new video:

1. Get the YouTube video ID from the URL (e.g., `dQw4w9WgXcQ` from `youtube.com/watch?v=dQw4w9WgXcQ`)
2. Add a new entry to the JSON array:

```json
{
  "id": "unique-id",
  "title": "Video Title",
  "description": "Brief description of the video content",
  "date": "2024-01-15",
  "tags": ["terran", "macro", "coach nico"],
  "youtubeId": "dQw4w9WgXcQ",
  "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
}
```

### Available Tags

- **Races**: `terran`, `zerg`, `protoss`
- **Coaches**: `coach nico`, `gamerrichy` (add more as needed)
- **Topics**: `macro`, `micro`, `mentality`

You can add custom tags by simply including them in the `tags` array. The filter will automatically pick them up.

## Customizing the Logo

Replace `public/logo.svg` with your own logo file. You can use PNG, SVG, or other image formats. If using a different format (e.g., logo.png), update the image source in `src/app/page.tsx`:

```tsx
<Image
  src="/logo.png"  // Change extension as needed
  alt="Ladder Legends Academy"
  width={64}
  height={64}
  className="object-contain"
/>
```

## Deploying to Vercel

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and configure the build settings
6. Click "Deploy"

Your site will be live in minutes with automatic deployments on every push to main.

### Alternative: Deploy via CLI

```bash
npm install -g vercel
vercel
```

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles & theme colors
│   ├── layout.tsx       # Root layout with metadata
│   └── page.tsx         # Main page with video catalog
├── components/
│   ├── ui/              # shadcn/ui components
│   └── videos/
│       ├── video-card.tsx    # Individual video card
│       ├── video-grid.tsx    # Grid with filtering
│       └── tag-filter.tsx    # Tag filter UI
├── data/
│   └── videos.json      # Video data
└── types/
    └── video.ts         # TypeScript types
```

## Customizing Colors

The color scheme is defined in `src/app/globals.css` using CSS custom properties. Key colors:

- `--primary`: Purple/magenta accent (290, 80%, 60%)
- `--secondary`: Cyan accent (190, 100%, 50%)
- `--background`: Dark blue-tinted background (220, 25%, 6%)

Adjust these values to customize the theme.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## License

All rights reserved © 2024 Ladder Legends Academy
