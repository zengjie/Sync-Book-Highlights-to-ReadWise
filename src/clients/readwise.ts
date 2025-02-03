import { removeSlash } from '../utils';
import { ReadWiseHighlight, ReadWiseBooksQueryResponse, ReadWiseHighlightsResponse, ReadWiseHighlightCreate } from '../types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ReadWiseClient {
  constructor(private token: string) { }

  private async handleRateLimit(response: Response, requestInfo: { method?: string; body?: string } = {}): Promise<Response> {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60') + 1;
      console.log(`Rate limit exceeded. Waiting for ${retryAfter} seconds before retrying...`);
      await sleep(retryAfter * 1000);
      return await fetch(response.url, {
        method: requestInfo.method || 'GET',
        headers: {
          Authorization: `Token ${this.token}`,
          ...(requestInfo.body && { 'Content-Type': 'application/json' })
        },
        ...(requestInfo.body && { body: requestInfo.body })
      });
    }
    return response;
  }

  async get(path: string, params: URLSearchParams = new URLSearchParams()): Promise<Response> {
    path = removeSlash(path);
    const response = await fetch(`https://readwise.io/api/v2/${path}/?${params}`, {
      headers: {
        Authorization: `Token ${this.token}`,
      },
    });
    return this.handleRateLimit(response);
  }

  async post(path: string, body: any): Promise<Response> {
    path = removeSlash(path);
    const bodyStr = JSON.stringify(body);
    const response = await fetch(`https://readwise.io/api/v2/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });
    return this.handleRateLimit(response, { method: 'POST', body: bodyStr });
  }

  async delete(path: string): Promise<Response> {
    path = removeSlash(path);
    const response = await fetch(`https://readwise.io/api/v2/${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Token ${this.token}`,
      },
    });
    return this.handleRateLimit(response, { method: 'DELETE' });
  }

  async listBooks(source: "dedao" | "weread", page: number = 1, pageSize: number = 100): Promise<ReadWiseBooksQueryResponse> {
    const params = new URLSearchParams({
      source,
      category: "books",
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const response = await this.get("books", params);
    return await response.json();
  }

  async getLatestBook(source: "dedao" | "weread"): Promise<ReadWiseBooksQueryResponse | null> {
    // First get page 1 to get total count
    const firstPage = await this.listBooks(source, 1, 1);
    
    if (firstPage.count === 0) {
      return null;
    }

    // Fetch the last page to get the latest highlight
    const latestPage = await this.listBooks(source, firstPage.count, 1);
    return latestPage;
  }

  async getHighlights(bookId: number, options: {
    page_size?: number;
    page?: number;
    updated__gt?: string;
    highlighted_at__gt?: string;
    location_type?: string;
  } = {}): Promise<ReadWiseHighlight[]> {
    const params = new URLSearchParams({
      book_id: bookId.toString(),
      page_size: (options.page_size || 1000).toString(),
      ...(options.page && { page: options.page.toString() }),
      ...(options.updated__gt && { updated__gt: options.updated__gt }),
      ...(options.highlighted_at__gt && { highlighted_at__gt: options.highlighted_at__gt }),
      ...(options.location_type && { location_type: options.location_type }),
    });

    const response = await this.get('highlights', params);
    if (!response.ok) {
      throw new Error(`Failed to get highlights: ${response.statusText}`);
    }

    const data = await response.json() as ReadWiseHighlightsResponse;
    return data.results;
  }

  async createHighlights(highlights: ReadWiseHighlightCreate[]): Promise<ReadWiseHighlight[]> {
    const response = await this.post("highlights", { highlights });
    if (!response.ok) {
      throw new Error(`Failed to create highlights: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteHighlight(highlightId: number): Promise<void> {
    const response = await this.delete(`highlights/${highlightId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to delete highlight ${highlightId}: ${response.statusText}`);
    }
  }
} 