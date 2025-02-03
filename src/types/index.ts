export interface Env {
  NOTION_TOKEN: string;
  FLOMO_DB_ID: string;
  READWISE_TOKEN: string;
  WEREAD_COOKIES: string;
  syncbook: KVNamespace;
}

export interface ReadWiseBooksQueryResponse {
  count: number;
  next: string;
  previous: string;
  results: {
    id: number,
    title: string,
    author: string,
    category: string,
    source: string,
    num_highlights: number,
    last_highlight_at: string,
    updated: string,
    cover_image_url: string,
    highlights_url: string,
    source_url: string,
    asin: string,
    tags: string[],
    document_note: string
  }[];
}

export interface ReadWiseHighlightCreate {
  text: string;                   // Required: The highlight text
  title?: string;                 // Title of the book/article/podcast (max 511 chars)
  author?: string;                // Author of the book/article/podcast (max 1024 chars)
  image_url?: string;             // Cover image URL (max 2047 chars)
  source_url?: string;            // URL of the article/podcast (max 2047 chars)
  source_type?: string;           // Unique identifier for your app (3-64 chars, no spaces)
  category?: 'books' | 'articles' | 'tweets' | 'podcasts';  // Category of the highlight
  note?: string;                  // Annotation note (max 8191 chars)
  location?: number;              // Location in source text
  location_type?: 'page' | 'order' | 'time_offset';  // Type of location
  highlighted_at?: string;        // ISO 8601 datetime
  highlight_url?: string;         // Unique URL of the highlight (max 4095 chars)
}

export interface ReadWiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: string[];
}

export interface DedaoTopHitsResponse {
  c: {
    data: {
      moduleList: {
        layerDataList: {
          extra: {
            enid: string;
          };
          image: string;
          author: string;
        }[];
      }[];
    };
  };
}

export interface HighlightInNotion {
  id: string;
  title: string;
  created_date: string;
  content: string;
  url: string;
}

export interface WeReadCookies {
  wr_vid: string;
  wr_skey: string;
  wr_pf: string;
  wr_rt: string;
}

export interface WeReadHighlight {
  bookId: string;
  bookmarkId: string;
  chapterName: string;
  chapterUid: number;
  markText: string;
  createTime: number;
  bookInfo: {
    title: string;
    author: string;
    cover: string;
    url: string;
  };
}

export interface WeReadHighlightResponse {
  synckey: number;
  updated: {
    bookId: string;
    bookmarkId: string;
    chapterName: string;
    chapterUid: number;
    markText: string;
    range: string;
    style: number;
    type: number;
    createTime: number;
    colorStyle: number;
    contextAbstract: string;
    bookVersion: number;
  }[];
  removed: string[];
  books: {
    bookId: string;
    version: number;
    format: string;
    title: string;
    author: string;
    cover: string;
  }[];
}

export interface ReadWiseHighlightsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ReadWiseHighlight[];
} 