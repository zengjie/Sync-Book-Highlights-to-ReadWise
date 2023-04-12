/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Client } from "@notionhq/client"

export interface Env {
  NOTION_TOKEN: string;
  FLOMO_DB_ID: string;
  READWISE_TOKEN: string;

  STATE_KV: KVNamespace;
}

function removeSlash(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
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

  async getLatestHighlight(): Promise<any> {
    const params = new URLSearchParams({
      source: "dedao",
      category: "books",
      page: "1",
      page_size: "1",
    });
    const response = await this.get("books", params);
    return await response.json();
  }
}

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

class NotionClientWrapper {
  private notion: Client;

  constructor(notionToken: string, private databaseId: string) {
    this.notion = new Client({
      auth: notionToken,
    });
  }

  async getDedaoHighlights() {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      filter: {
        property: "得到电子书",
        formula: {
          checkbox: {
            equals: true,
          },
        },
      },
    });
    return response.results;
  }



  // ... (Other methods for working with Notion)
}

class HighlightManager {
  private readWiseClient: ReadWiseClient;
  private notionClient: NotionClientWrapper;
  private dedaoClient: DedaoClient;

  constructor(private env: Env) {
    this.notionClient = new NotionClientWrapper(env.NOTION_TOKEN, env.FLOMO_DB_ID);
    this.readWiseClient = new ReadWiseClient(env.READWISE_TOKEN);
    this.dedaoClient = new DedaoClient();
  }

  async syncBookHighlights() {
    const pages = await this.notionClient.getDedaoHighlights();
    const latestHighlight = await this.readWiseClient.getLatestHighlight();
    const latestHighlightText = latestHighlight.results[0]?.title || "";
    let isNewHighlight = true;
    const highlights = [];

    for (const page of pages) {
      // ... (Loop content for highlights)

      const { sourceUrl, imageUrl, author } = await this.dedaoClient.getBookData(page.id);

      // ... (Create highlight object and push to highlights array)
    }

    // ... (Check for new highlights and sync them)
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/highlights/latest") {
      const readWiseClient = new ReadWiseClient(env.READWISE_TOKEN);
      const latestHighlight = await readWiseClient.getLatestHighlight();
      return new Response(`Latest Highlight: ${JSON.stringify(latestHighlight)}`);
    }

    return new Response("/Sync/");
  },
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    //ctx.waitUntil(syncBookHighlights());
  },
};
