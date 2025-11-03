# Discord Content Scraping Results

## Events (6 found)
✅ Successfully scraped 6 scheduled events from Discord and added to `src/data/events.json`

- Groovy Subscriber Replay Analysis (Nov 5)
- Hardcore Ladder Grind (Nov 6)
- Hino Ladder Commentary (Nov 8)
- Team Games Night (Nov 9)
- Micro Mondays (Nov 3) - Recurring weekly event
- EON Ladder Commentary (Nov 4)

## Replays (9 found)
📦 Found 9 replay files with download URLs saved to `/Users/chadfurman/projects/ladder-legends-bot/scraped-data/replays.json`

Replays available for analysis:
1. "the replay vs the 6k" - Incorporeal LE
2. "Ladder_tvp_speed" - TvP ladder game
3-4. Masters Cup 150 quali matches (Nicoract vs BabyMarine)
5-6. Ladder games (tvp_default, tvz_default)
7. Pylon LE match
8-9. 5.8k MMR games vs Protoss

**Note:** These replays need to be analyzed using the SC2Reader API to extract:
- Map name
- Player names, races, MMR
- Game duration
- Match result
- Build orders

To analyze, run the downloaded replay files through `/api/analyze-replay`

## Masterclasses (0 found with YouTube links)
⚠️ Found 3 messages mentioning "masterclass" but none had associated YouTube video links in the message or nearby messages.

To improve masterclass detection, the scraper could be enhanced to:
- Look for YouTube links within 1 hour of "masterclass" mentions by the same author
- Search across multiple messages in a thread
- Check for playlist links

## Next Steps

1. Start SC2Reader API (`python api.py` in sc2reader project)
2. Analyze the 9 downloaded replays
3. Update `src/data/replays.json` with analyzed data
4. Re-run masterclass scraper with enhanced logic
