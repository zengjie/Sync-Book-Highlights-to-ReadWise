/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Client, collectPaginatedAPI } from "@notionhq/client"
import { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface Env {
  NOTION_TOKEN: string;
  FLOMO_DB_ID: string;
  READWISE_TOKEN: string;

  syncbook: KVNamespace;
}

function removeSlash(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

// ReadWise Highlights Query Response interface
interface ReadWiseHighlightsQueryResponse {
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

interface ReadWiseHighlight {
  text: string,
  title: string,
  author: string,
  image_url: string,
  source_url: string,
  source_type: string,
  category: string,
  note?: string,
  location?: number,
  location_type?: string,
  highlighted_at: string,
  highlight_url: string,
  modified_highlights?: number[];
}


class ReadWiseClient {
  constructor(private token: string) { }

  async get(path: string, params: URLSearchParams): Promise<Response> {
    path = removeSlash(path);
    const response = await fetch(`https://readwise.io/api/v2/${path}/?${params}`, {
      headers: {
        Authorization: `Token ${this.token}`,
      },
    });
    return response;
  }

  async post(path: string, body: any): Promise<Response> {
    path = removeSlash(path);
    const response = await fetch(`https://readwise.io/api/v2/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return response;
  }

  async getLatestHighlight(): Promise<ReadWiseHighlightsQueryResponse> {
    const params = new URLSearchParams({
      source: "dedao",
      category: "books",
      page: "1",
      page_size: "1",
    });
    const response = await this.get("books", params);
    return await response.json();
  }

  async createHighlights(highlights: ReadWiseHighlight[]): Promise<ReadWiseHighlight[]> {
    const response = await this.post("highlights", { highlights });
    return response.json();
  }
}

// Dedao Top Hits Response interface
interface DedaoTopHitsResponse {
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

class DedaoClient {
  async getBookData(bookTitle: string) {
    const formData = new URLSearchParams({
      content: bookTitle,
      tab_type: "2",
      is_ebook_vip: "1",
      page: "1",
      page_size: "1",
    });
    const response = await fetch("https://www.dedao.cn/api/search/pc/tophits", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
    const data: DedaoTopHitsResponse = await response.json();
    const bookId = data.c.data.moduleList[0].layerDataList[0].extra.enid;
    const sourceUrl = `https://www.dedao.cn/ebook/reader?id=${bookId}`;
    const imageUrl = data.c.data.moduleList[0].layerDataList[0].image;
    const author = data.c.data.moduleList[0].layerDataList[0].author;
    return { sourceUrl, imageUrl, author };
  }
}

interface HighlightInNotion {
  id: string;
  title: string;
  created_date: string;
  content: string;
  url: string;
}

class NotionClient {
  private notion: Client;

  constructor(notionToken: string, private databaseId: string) {
    this.notion = new Client({
      auth: notionToken,
    });
  }

  async getDedaoHighlights(fromTime: string): Promise<HighlightInNotion[]> {
    const resp = await this.notion.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          {
            property: "得到电子书",
            formula: {
              checkbox: {
                equals: true,
              },
            }
          },
          {
            timestamp: "created_time",
            created_time: {
              after: fromTime
            }
          }
        ]
      },
      sorts: [
        {
          timestamp: "created_time",
          direction: "ascending",
        }
      ],
      page_size: 10,
    });

    const pageObjects = resp.results;

    // convert pageObjects to HighlightInNotion[]
    const highlights = [];
    for (const pageObject of pageObjects) {
      const page = pageObject as PageObjectResponse;
      const props = page.properties;

      if (props["书名"].type !== "formula") {
        continue;
      }

      if (props["书名"].formula.type !== "string") {
        continue;
      }

      if (props["Link"].type !== "url") {
        continue;
      }

      if (props["Created time"].type !== "created_time") {
        continue;
      }

      const title = props["书名"].formula.string;
      const url = props["Link"].url;

      let highlight:HighlightInNotion = {
        id: pageObject.id,
        title: title !== null ? title : "",
        url: url !== null ? url : "",
        created_date: props["Created time"].created_time,
        content: "",
      };

      // Get notion page children blocks
      const resp = await this.notion.blocks.children.list({
        block_id: page.id
      });
      const blocks = resp.results;

      // Get block text and concaenate it to highlight content
      for (const blockObj of blocks) {
        const block = blockObj as BlockObjectResponse;
        if (block.type === "paragraph") {
          let plain_text = block.paragraph.rich_text[0].plain_text;
          // Remove first line and last 2 lines
          plain_text = plain_text.substring(plain_text.indexOf("\n") + 1);
          plain_text = plain_text.substring(0, plain_text.lastIndexOf("\n"));
          plain_text = plain_text.substring(0, plain_text.lastIndexOf("\n"));
          highlight.content = plain_text;
          break;
        }
      }

      highlights.push(highlight);
    }
    return highlights;
  }
}

class HighlightManager {
  private readWiseClient: ReadWiseClient;
  private notionClient: NotionClient;
  private dedaoClient: DedaoClient;

  constructor(private env: Env) {
    this.notionClient = new NotionClient(env.NOTION_TOKEN, env.FLOMO_DB_ID);
    this.readWiseClient = new ReadWiseClient(env.READWISE_TOKEN);
    this.dedaoClient = new DedaoClient();
  }

  async syncBookHighlights(fromTime?: string) {
    // if fromTime is not set or is empty, calulate fromTime
    if (!fromTime) {
      // Get from syncbook kv
      const lastestSyncTime = await this.env.syncbook.get("latest_sync_time");
      if (lastestSyncTime) {
        fromTime = lastestSyncTime;
      }
      else {
        fromTime = "2023-01-07";
      }
    }

    console.log("syncBookHighlights: fromTime:", fromTime);

      
    // query notion for highlights after the latest update time
    let notionHighlights = await this.notionClient.getDedaoHighlights(fromTime);


    // use dedao API to get book data for the highlights
    let readwiseHighlights = [];
    for (const notionHighlight of notionHighlights) {
      let bookData = await this.dedaoClient.getBookData(notionHighlight.title);
      
      let readwiseHighlight: ReadWiseHighlight = {
        text: notionHighlight.content,
        title: notionHighlight.title,
        author: bookData.author,
        image_url: bookData.imageUrl,
        source_url: bookData.sourceUrl,
        source_type: "dedao",
        category:"books",
        highlighted_at: notionHighlight.created_date,
        highlight_url: notionHighlight.url,
      };

      readwiseHighlights.push(readwiseHighlight);
    }

    if (readwiseHighlights.length === 0) {
      return { message: "No highlights to sync" };
    }
    
    // update all highlights to readwise
    const updateResponse = await this.readWiseClient.createHighlights(readwiseHighlights);

    // update latest sync time
    await this.env.syncbook.put("latest_sync_time", notionHighlights[notionHighlights.length - 1].created_date);

    return updateResponse;
  }
}

function printJSON(json: any) {
  return new Response(`<pre>${JSON.stringify(json, null, 2)}</pre>`);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // only allow access to root endpoint
    if (new URL(request.url).pathname !== "/force-sync") {
      return new Response("", { status: 404 });
    }

    const results = await new HighlightManager(env).syncBookHighlights();
    return printJSON(results);
  },
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(new HighlightManager(env).syncBookHighlights());
  },
};
