import { WeReadClient } from '../src/clients/weread';
import { ReadWiseClient } from '../src/clients/readwise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Parse command line arguments
const args = process.argv.slice(2);
const isFullSync = args.includes('--full-sync');

async function syncWeRead() {
  // Load credentials from .dev.vars
  const devVarsPath = path.join(process.cwd(), '.dev.vars');
  if (!fs.existsSync(devVarsPath)) {
    throw new Error('.dev.vars file not found. Please run the weread_auth.py tool first.');
  }

  const envConfig = dotenv.parse(fs.readFileSync(devVarsPath));
  const { WEREAD_COOKIES, READWISE_TOKEN } = envConfig;
  
  if (!WEREAD_COOKIES) {
    throw new Error('WEREAD_COOKIES not found in .dev.vars. Please run the weread_auth.py tool first.');
  }
  if (!READWISE_TOKEN) {
    throw new Error('READWISE_TOKEN not found in .dev.vars. Please set your Readwise API token.');
  }

  // Initialize clients
  const wereadClient = new WeReadClient(WEREAD_COOKIES, (newCookies) => {
    // Update cookies in .dev.vars when they are refreshed
    const updatedConfig = { ...envConfig, WEREAD_COOKIES: JSON.stringify(newCookies) };
    const fileContent = Object.entries(updatedConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    fs.writeFileSync(devVarsPath, fileContent);
    console.log('Updated WeRead cookies saved to .dev.vars');
  });
  const readwiseClient = new ReadWiseClient(READWISE_TOKEN);

  try {
    console.log('Fetching highlights from WeRead...');
    const highlights = await wereadClient.getAllHighlights();
    console.log(`Found ${highlights.length} highlights from ${new Set(highlights.map(h => h.bookInfo.title)).size} books`);

    // Transform WeRead highlights to Readwise format
    const readwiseHighlights = highlights.map(h => ({
      text: h.markText,
      title: h.bookInfo.title,
      author: h.bookInfo.author,
      image_url: h.bookInfo.cover,
      source_url: h.bookInfo.url,
      source_type: 'weread',
      category: 'books' as const,
      highlighted_at: new Date(h.createTime * 1000).toISOString(),
      highlight_url: h.bookInfo.url,
      note: h.chapterName // Include chapter name as note
    }));

    let newHighlights = readwiseHighlights;

    if (!isFullSync) {
      // Get latest highlight from Readwise to avoid duplicates
      console.log('Checking latest highlight in Readwise...');
      const latestHighlight = await readwiseClient.getLatestBook("weread");
      const latestDate = latestHighlight?.results[0]?.last_highlight_at;
      console.log("Latest highlight date:", latestDate);

      // Filter out highlights that are already in Readwise
      if (latestDate) {
        newHighlights = readwiseHighlights.filter(h => h.highlighted_at > latestDate);
        console.log(`Filtered to ${newHighlights.length} new highlights since ${latestDate}`);
      }
    } else {
      console.log('Running in full sync mode - will sync all highlights');
    }

    if (newHighlights.length === 0) {
      console.log('No highlights to sync');
      return;
    }

    console.log(`Syncing ${newHighlights.length} highlights to Readwise...`);
    const response = await readwiseClient.createHighlights(newHighlights);
    console.log('Sync completed successfully!');

    // Log summary
    console.log('\nSync Summary:');
    console.log(`Mode: ${isFullSync ? 'Full sync' : 'Incremental sync'}`);
    console.log(`Total WeRead highlights: ${highlights.length}`);
    console.log(`Highlights synced: ${newHighlights.length}`);
    console.log(`Books affected: ${new Set(newHighlights.map(h => h.title)).size}`);

    // Group new highlights by book for better overview
    const highlightsByBook = newHighlights.reduce((acc, h) => {
      acc[h.title] = (acc[h.title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nHighlights per book:');
    Object.entries(highlightsByBook)
      .sort(([,a], [,b]) => b - a)
      .forEach(([book, count]) => {
        console.log(`${book}: ${count} highlights`);
      });

  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncWeRead().catch(console.error);