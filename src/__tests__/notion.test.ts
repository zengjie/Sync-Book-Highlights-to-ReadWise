import { NotionClient } from '../clients/notion';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .dev.vars file
dotenv.config({ path: '.dev.vars' });

describe('NotionClient', () => {
  let client: NotionClient;

  beforeAll(() => {
    // Make sure environment variables are set in your .dev.vars file
    const token = process.env.NOTION_TOKEN;
    const dbId = process.env.FLOMO_DB_ID;
    if (!token || !dbId) {
      throw new Error('NOTION_TOKEN or FLOMO_DB_ID environment variable is not set');
    }
    client = new NotionClient(token, dbId);
  });

  it('should get Dedao highlights', async () => {
    // Test with a known date that has highlights
    const fromTime = "2023-01-07";
    const highlights = await client.getDedaoHighlights(fromTime);
    console.log('Dedao highlights:', JSON.stringify(highlights, null, 2));
    expect(highlights).toBeDefined();
    expect(Array.isArray(highlights)).toBe(true);
  }, 30000);  // Increase timeout to 30 seconds
});