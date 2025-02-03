import { WeReadCookies, WeReadHighlight, WeReadHighlightResponse } from '../types';
import { removeSlash } from '../utils';
import * as CryptoJS from 'crypto-js';

const getFa = (id: string): [string, string[]] => {
  if (/^\d*$/.test(id)) {
    const c: string[] = [];
    for (let a = 0; a < id.length; a += 9) {
      const b = id.slice(a, Math.min(a + 9, id.length));
      c.push(parseInt(b, 10).toString(16));
    }
    return ['3', c];
  }
  let d = '';
  for (let i = 0; i < id.length; i++) {
    d += id.charCodeAt(i).toString(16);
  }
  return ['4', [d]];
};

export const getPcUrl = (bookId: string): string => {
  const str = CryptoJS.MD5(bookId).toString(CryptoJS.enc.Hex);
  const fa = getFa(bookId);
  let strSub = str.substr(0, 3);
  strSub += fa[0];
  strSub += '2' + str.substr(str.length - 2, 2);
  for (let j = 0; j < fa[1].length; j++) {
    const n = fa[1][j].length.toString(16);
    if (n.length === 1) {
      strSub += '0' + n;
    } else {
      strSub += n;
    }
    strSub += fa[1][j];
    if (j < fa[1].length - 1) {
      strSub += 'g';
    }
  }
  if (strSub.length < 20) {
    strSub += str.substr(0, 20 - strSub.length);
  }
  strSub += CryptoJS.MD5(strSub).toString(CryptoJS.enc.Hex).substr(0, 3);
  const prefix = 'https://weread.qq.com/web/reader/';
  return prefix + strSub;
};

export class WeReadClient {
  private baseUrl = 'https://i.weread.qq.com';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private cookies: WeReadCookies;
  /**
   * Callback function that will be called whenever cookies are refreshed.
   * In Cloudflare Workers, this should be a function that stores cookies in KV storage
   * since environment variables are read-only.
   * 
   * Example usage:
   * ```typescript
   * // First, create a KV namespace in your Cloudflare dashboard named WEREAD_STORAGE
   * // Then bind it to your worker in wrangler.toml:
   * // kv_namespaces = [{ binding = "WEREAD_STORAGE", id = "xxx" }]
   * 
   * interface Env {
   *   WEREAD_STORAGE: KVNamespace;
   * }
   * 
   * const client = new WeReadClient(cookiesJson, async (newCookies) => {
   *   // Store in Cloudflare KV:
   *   await env.WEREAD_STORAGE.put('weread_cookies', JSON.stringify(newCookies));
   * });
   * 
   * // To initialize the client with cookies from KV:
   * const cookiesJson = await env.WEREAD_STORAGE.get('weread_cookies') || '{}';
   * const client = new WeReadClient(cookiesJson, ...);
   * ```
   */
  private cookieUpdateCallback?: (cookies: WeReadCookies) => void | Promise<void>;

  constructor(cookiesJson: string, cookieUpdateCallback?: (cookies: WeReadCookies) => void | Promise<void>) {
    this.cookies = JSON.parse(cookiesJson);
    this.cookieUpdateCallback = cookieUpdateCallback;
  }

  updateCookies(newCookies: WeReadCookies): void {
    this.cookies = newCookies;
  }

  private getCookieString(): string {
    return Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  private async refreshCookies(): Promise<boolean> {
    try {
      const response = await fetch('https://weread.qq.com/', {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',          
          'Cookie': this.getCookieString()
        }
      });

      console.log('cookie', this.getCookieString());

      const setCookie = response.headers.get('set-cookie');
      if (!setCookie) {
        return false;
      }

      // Parse and update cookies
      const newCookies: Partial<WeReadCookies> = {};
      const cookieParts = setCookie.split(',').map(c => c.trim());
     
      console.log('cookieParts', cookieParts);

      for (const cookie of cookieParts) {
        const match = cookie.match(/^(wr_\w+)=([^;]+)/);
        console.log('match', match);
        if (match && match[1] in this.cookies) {
          newCookies[match[1] as keyof WeReadCookies] = match[2];
        }
      }

      console.log('newCookies', newCookies);

      // Update cookies if we got any new ones
      if (Object.keys(newCookies).length > 0) {
        this.cookies = { ...this.cookies, ...newCookies };
        // Wait for the callback to complete in case it's async
        await Promise.resolve(this.cookieUpdateCallback?.(this.cookies));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to refresh cookies:', error);
      return false;
    }
  }

  private async request(path: string, params?: URLSearchParams, retryCount = 0): Promise<Response> {
    path = removeSlash(path);
    const url = params ? `${this.baseUrl}/${path}?${params}` : `${this.baseUrl}/${path}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': this.getCookieString()
      }
    });

    if (response.status === 401 && retryCount < 1) {
      // Try to refresh cookies and retry the request once
      const refreshed = await this.refreshCookies();
      if (refreshed) {
        return this.request(path, params, retryCount + 1);
      }
      throw new Error('WeRead authentication expired and refresh failed');
    }

    if (response.status === 401) {
      throw new Error('WeRead authentication expired');
    }

    return response;
  }

  async getHighlights(synckey?: number): Promise<WeReadHighlightResponse> {
    const params = new URLSearchParams();
    if (synckey !== undefined) {
      params.append('synckey', synckey.toString());
    }
    
    const response = await this.request('book/bookmarklist', params);
    const data: WeReadHighlightResponse = await response.json();
    return data;
  }

  async getAllHighlights(synckey?: number): Promise<WeReadHighlight[]> {
    const response = await this.getHighlights(synckey);
    
    // Transform the highlights into our standard format
    return response.updated.map(highlight => {
      const book = response.books.find(b => b.bookId === highlight.bookId);
      if (!book) {
        throw new Error(`Book info not found for bookId: ${highlight.bookId}`);
      }
      return {
        bookId: highlight.bookId,
        bookmarkId: highlight.bookmarkId,
        chapterName: highlight.chapterName,
        chapterUid: highlight.chapterUid,
        markText: highlight.markText,
        createTime: highlight.createTime,
        bookInfo: {
          title: book.title,
          author: book.author,
          cover: book.cover,
          url: getPcUrl(highlight.bookId)
        }
      };
    });
  }
} 