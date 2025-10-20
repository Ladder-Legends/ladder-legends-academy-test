# Video Data Conversion Scripts

These scripts allow you to convert between JSON and CSV formats for the video library data.

## JSON to CSV

Convert `videos.json` to `videos.csv` for easy editing in Excel or Google Sheets:

```bash
npm run json-to-csv
```

This will create `src/data/videos.csv` from `src/data/videos.json`.

### Custom paths:
```bash
tsx scripts/json-to-csv.ts input.json output.csv
```

## CSV to JSON

Convert `videos.csv` back to `videos.json` after editing:

```bash
npm run csv-to-json
```

This will create `src/data/videos.json` from `src/data/videos.csv`.

### Custom paths:
```bash
tsx scripts/csv-to-json.ts input.csv output.json
```

## CSV Format

The CSV uses the following columns:
- `id` - Unique identifier
- `title` - Video title
- `description` - Video description
- `youtubeId` - YouTube video ID
- `thumbnail` - Thumbnail URL
- `tags` - Pipe-separated tags (e.g., `terran|groovy|build order`)
- `addedAt` - ISO date string

### Example CSV:
```csv
id,title,description,youtubeId,thumbnail,tags,addedAt
1,Terran Basics,Learn the basics,abc123,https://...,terran|groovy|fundamentals,2024-01-01T00:00:00.000Z
```

## Notes

- Tags are separated by `|` (pipe character) in CSV
- Fields containing commas or quotes are automatically escaped
- Empty tags are filtered out during conversion
