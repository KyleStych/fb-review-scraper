# Facebook Review Scraper

A powerful browser-based tool for automatically scraping reviews from Facebook business pages. This scraper intelligently detects when all reviews have been loaded and automatically downloads data in organized batches.

## Features

- **🔄 Auto-scroll**: Automatically scrolls to load all reviews
- **📦 Batch downloads**: Downloads reviews in configurable batches (e.g., every 30 reviews)
- **🏁 Smart end detection**: Automatically stops when no new reviews are found
- **🔄 Duplicate prevention**: Prevents duplicate reviews across sessions
- **📋 Initial scan**: Scans existing page content before starting auto-scroll
- **📊 Real-time status**: Monitor progress with detailed status reporting
- **🎯 Robust selectors**: Uses stable attribute-based selectors that work with Facebook's dynamic content
- **🔄 Restart logic**: Attempts one final restart before stopping to overcome Facebook's throttling
- **📥 Auto-download on stop**: Optionally downloads remaining reviews when scraper stops

## Quick Start

1. **Navigate to a Facebook business page** (e.g., `https://www.facebook.com/businessname/reviews`)
2. **Open browser console** (F12 → Console tab)
3. **Copy and paste the entire `scrape.js` file** into the console
4. **Start the scraper**:
   ```javascript
   const scraper = scrapeInit(30, false, true, false);
   ```

## Configuration Options

### `scrapeInit(batchSize, debug, autoScroll, autoDownloadOnStop)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `batchSize` | number | `30` | Number of reviews to collect before downloading |
| `debug` | boolean | `false` | Enable detailed debugging output |
| `autoScroll` | boolean | `true` | Automatically scroll to load more reviews |
| `autoDownloadOnStop` | boolean | `false` | Automatically download remaining reviews when scraper stops |

### Usage Examples

```javascript
// Basic usage - 30 reviews per batch, auto-scroll enabled
const scraper = scrapeInit();

// Custom batch size - 50 reviews per batch
const scraper = scrapeInit(50);

// Debug mode enabled
const scraper = scrapeInit(30, true);

// Manual scroll mode (no auto-scroll)
const scraper = scrapeInit(30, false, false);

// Auto-download remaining reviews when stopping
const scraper = scrapeInit(30, false, true, true);

// Full custom configuration
const scraper = scrapeInit(25, true, true, true);
```

## Available Methods

### Status & Monitoring

```javascript
// Get current status
const status = scraper.getStatus();
console.log(status);
// Returns: { total: 45, inBatch: 15, globalCount: 45, scrollCount: 8, ... }

// Check if end is detected
if (status.endDetected) {
  console.log('All reviews collected!');
}
```

### Download & Export

```javascript
// Download remaining reviews manually
scraper.downloadRemaining();

// Stop scraper and optionally download remaining reviews
scraper.stop();
```

### Control & Debug

```javascript
// Stop the scraper
scraper.stop();

// Run debug scan to check selectors
scraper.debug();

// Reset duplicate tracking (start fresh)
scraper.resetTracking();
```

### Manual Control

```javascript
// Trigger manual scroll
scraper.scroll();

// Restart auto-scroll if it stopped
scraper.restartScroll();
```

## Output

### Filename Format
```
facebook-reviews-001-030-1234567890.json
facebook-reviews-031-060-1234567890.json
facebook-reviews-061-090-1234567890.json
```

### JSON Structure
```json
[
  {
    "name": "John Doe",
    "profile": "https://facebook.com/john.doe",
    "review": "Great service! Highly recommend.",
    "rating": "Recommended",
    "id": "JohnDoe_GreatserviceHighlyrecommend"
  }
]
```

## Advanced Features

### Smart End Detection
The scraper uses multiple methods to detect when all reviews have been loaded:
- **Element count tracking**: Monitors total review elements on page
- **Scroll distance**: Detects when page can't scroll further
- **No new reviews**: Counts consecutive attempts with no new content
- **Restart logic**: Attempts one final restart before giving up

### Restart Logic
When the scraper thinks it's reached the end, it:
1. **Attempts one final restart** with reset counters
2. **Waits 2 seconds** then tries scrolling again
3. **If new content is found**, continues normally
4. **If still no new content**, then truly stops

### Auto-Download on Stop
When `autoDownloadOnStop` is enabled:
- **Automatically downloads** remaining reviews when scraper stops
- **Shows helpful message** when auto-download is disabled
- **Prevents data loss** from incomplete batches

## Troubleshooting

### Scraper stops early
- **Facebook throttling**: The restart logic should help overcome this
- **Manual restart**: Use `scraper.restartScroll()` to continue
- **Check status**: Use `scraper.getStatus()` to see current state

### No reviews found
- **Check page**: Ensure you're on a Facebook business reviews page
- **Debug mode**: Run `scraper.debug()` to check selectors
- **Manual scroll**: Try `scraper.scroll()` to trigger content loading

### Duplicate reviews
- **Reset tracking**: Use `scraper.resetTracking()` to start fresh
- **Check console**: Look for "Skipping already seen review" messages

## Browser Compatibility

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support  
- **Safari**: ✅ Full support
- **Edge**: ✅ Full support

## File Management

### Combining Multiple Files
Use the included `combineReviews.js` script to merge multiple downloaded files:

```bash
# Standard format
node combineReviews.js

# Judge.me format (for Shopify Judge.me app import)
node combineReviews.js -jm
```

This will:
- Read all JSON files from `./review-files/`
- Remove duplicates
- Create combined files with metadata
- Save as `combined-facebook-reviews.json` and `combined-facebook-reviews.csv`

#### Judge.me Mode (`-jm` flag)
When using the `-jm` flag, the script converts the data format for Judge.me import:
- **"Recommended"** → **5** (5 stars)
- **"Not Recommended"** → **1** (1 star)  
- **"review"** → **"body"** (field name change)
- Output files: `judge-me-facebook-reviews.json` and `judge-me-facebook-reviews.csv`

**Example Judge.me JSON:**
```json
{
  "name": "John Doe",
  "profile": "https://facebook.com/john.doe", 
  "body": "Great service!",
  "rating": 5,
  "id": "JohnDoe_Greatservice"
}
```

## License

This tool is provided as-is for educational and legitimate business purposes. Please respect Facebook's terms of service and use responsibly.
