import { WeReadClient } from '../clients/weread';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

describe('WeRead Integration Tests', () => {
  let client: WeReadClient;

  beforeAll(() => {
    // Load credentials from .dev.vars
    const devVarsPath = path.join(process.cwd(), '.dev.vars');
    if (!fs.existsSync(devVarsPath)) {
      throw new Error('.dev.vars file not found. Please run the weread_auth.py tool first.');
    }

    const envConfig = dotenv.parse(fs.readFileSync(devVarsPath));
    const wereadCookies = envConfig.WEREAD_COOKIES;
    
    if (!wereadCookies) {
      throw new Error('WEREAD_COOKIES not found in .dev.vars. Please run the weread_auth.py tool first.');
    }

    client = new WeReadClient(wereadCookies);
  });

  // Skip these tests by default to avoid running them in CI
  // Run them explicitly with: npm test -- -t "WeRead Integration" --runInBand
  describe('Highlights Access', () => {
    it('should fetch initial highlights', async () => {
      const response = await client.getHighlights();
      expect(response.synckey).toBeDefined();
      expect(Array.isArray(response.updated)).toBe(true);
      expect(Array.isArray(response.removed)).toBe(true);
      expect(Array.isArray(response.books)).toBe(true);
      
      // Log some info for manual verification
      console.log(`Found ${response.updated.length} highlights, synckey: ${response.synckey}`);
      if (response.updated.length > 0 && response.books.length > 0) {
        console.log('First highlight:', {
          text: response.updated[0].markText,
          chapter: response.updated[0].chapterName,
          book: {
            title: response.books[0].title,
            author: response.books[0].author
          }
        });
      }
    }, 10000);

    it('should fetch incremental highlights', async () => {
      // First get initial synckey
      const initial = await client.getHighlights();
      const synckey = initial.synckey;

      // Then try to get incremental updates
      const updates = await client.getHighlights(synckey);
      expect(updates.synckey).toBeGreaterThanOrEqual(synckey);
      
      // Log some info for manual verification
      console.log(`Incremental sync from ${synckey} to ${updates.synckey}`);
      console.log(`Found ${updates.updated.length} new/updated highlights`);
      console.log(`Found ${updates.removed.length} removed highlights`);
      if (updates.books.length > 0) {
        console.log('Book info:', {
          title: updates.books[0].title,
          author: updates.books[0].author
        });
      }
    }, 10000);

    it('should transform highlights to standard format', async () => {
      const allHighlights = await client.getAllHighlights();
      expect(Array.isArray(allHighlights)).toBe(true);
      
      // Log some info for manual verification
      console.log(`Found ${allHighlights.length} total highlights`);
      
      // Only process book info if we have highlights
      if (allHighlights.length > 0) {
        // Group highlights by book for better overview
        const highlightsByBook = allHighlights.reduce((acc, h) => {
          const title = h.bookInfo.title;
          acc[title] = (acc[title] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Highlights per book:', highlightsByBook);
      }
    }, 30000);
  });
}); 