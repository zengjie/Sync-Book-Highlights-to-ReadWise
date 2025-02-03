import { ReadWiseClient } from '../clients/readwise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .dev.vars file
dotenv.config({ path: '.dev.vars' });

describe('ReadWiseClient', () => {
  let client: ReadWiseClient;

  beforeAll(() => {
    // Make sure READWISE_TOKEN is set in your .dev.vars file
    const token = process.env.READWISE_TOKEN;
    if (!token) {
      throw new Error('READWISE_TOKEN environment variable is not set');
    }
    client = new ReadWiseClient(token);
  });

  it('should get latest highlight', async () => {
    const result = await client.getLatestBook("weread");
    console.log('Latest highlight:', JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
    if (result) {
      expect(result.count).toBeDefined();
    }
  });

  it('should create highlights', async () => {
    const highlights = [{
      text: "Test highlight",
      title: "Test Book",
      author: "Test Author",
      image_url: "https://example.com/image.jpg",
      source_url: "https://example.com/book",
      source_type: "dedao",
      category: "books" as const,
      highlighted_at: new Date().toISOString(),
      highlight_url: "https://example.com/highlight"
    }];

    const result = await client.createHighlights(highlights);
    console.log('Created highlights:', JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  });
}); 