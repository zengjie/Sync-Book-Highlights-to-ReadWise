import { Env, ReadWiseHighlight, ReadWiseHighlightCreate } from '../types';
import { NotionClient } from '../clients/notion';
import { ReadWiseClient } from '../clients/readwise';
import { DedaoClient } from '../clients/dedao';
import { WeReadClient, getPcUrl } from '../clients/weread';

export class HighlightManager {
  private readWiseClient: ReadWiseClient;
  private notionClient: NotionClient;
  private dedaoClient: DedaoClient;
  private wereadClient: WeReadClient;

  constructor(private env: Env) {
    this.notionClient = new NotionClient(env.NOTION_TOKEN, env.FLOMO_DB_ID);
    this.readWiseClient = new ReadWiseClient(env.READWISE_TOKEN);
    this.dedaoClient = new DedaoClient();
    this.wereadClient = new WeReadClient(env.WEREAD_COOKIES, async (newCookies) => {
      // Save updated cookies to KV when they are refreshed
      await this.env.syncbook.put("weread_cookies", JSON.stringify(newCookies));
      console.log('Updated WeRead cookies saved to KV storage');
    });
  }

  async syncBookHighlights(fromTime?: string, dryRun: boolean = false) {
    // Try to get cookies from KV first
    const storedCookies = await this.env.syncbook.get("weread_cookies");
    if (storedCookies) {
      this.wereadClient.updateCookies(JSON.parse(storedCookies));
    }

    // Get WeRead synckey from KV
    const wereadSynckey = await this.env.syncbook.get("weread_synckey");
    const synckeyNumber = wereadSynckey ? parseInt(wereadSynckey) : undefined;

    // if fromTime is not set or is empty, calculate fromTime
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

    console.log("syncBookHighlights: fromTime:", fromTime, "synckey:", synckeyNumber);

    // Get highlights from both Dedao and WeRead
    const [notionHighlights, wereadResponse] = await Promise.all([
      this.notionClient.getDedaoHighlights(fromTime),
      this.wereadClient.getHighlights(synckeyNumber)
    ]);

    const wereadHighlights = wereadResponse.updated.map(highlight => {
      const book = wereadResponse.books.find(b => b.bookId === highlight.bookId);
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

    // Transform highlights to Readwise format
    let readwiseHighlights: ReadWiseHighlightCreate[] = [];

    // Process Dedao highlights
    for (const notionHighlight of notionHighlights) {
      let bookData = await this.dedaoClient.getBookData(notionHighlight.title);
      
      let readwiseHighlight: ReadWiseHighlightCreate = {
        text: notionHighlight.content,
        title: notionHighlight.title,
        author: bookData.author,
        image_url: bookData.imageUrl,
        source_url: bookData.sourceUrl,
        source_type: "dedao",
        category: "books",
        highlighted_at: notionHighlight.created_date,
        highlight_url: notionHighlight.url,
      };

      readwiseHighlights.push(readwiseHighlight);
    }

    // Process WeRead highlights
    for (const wereadHighlight of wereadHighlights) {
      // Filter highlights based on fromTime if needed
      const highlightDate = new Date(wereadHighlight.createTime * 1000).toISOString();
      if (fromTime && highlightDate < fromTime) {
        continue;
      }

      let readwiseHighlight: ReadWiseHighlightCreate = {
        text: wereadHighlight.markText,
        title: wereadHighlight.bookInfo.title,
        author: wereadHighlight.bookInfo.author,
        image_url: wereadHighlight.bookInfo.cover,
        source_url: wereadHighlight.bookInfo.url,
        source_type: "weread",
        category: "books",
        highlighted_at: highlightDate,
        highlight_url: wereadHighlight.bookInfo.url,
        note: wereadHighlight.chapterName, // Include chapter name as note
      };

      readwiseHighlights.push(readwiseHighlight);
    }

    if (readwiseHighlights.length === 0) {
      return { message: "No highlights to sync" };
    }
    
    if (dryRun) {
      return {
        message: `Dry run: Would sync ${readwiseHighlights.length} highlights`,
        highlights: readwiseHighlights
      };
    }

    // update all highlights to readwise
    const updateResponse = await this.readWiseClient.createHighlights(readwiseHighlights);

    // Store the new synckey only after successful update to Readwise
    if (wereadResponse.synckey) {
      await this.env.syncbook.put("weread_synckey", wereadResponse.synckey.toString());
    }

    // Find the latest highlight date from dedao highlights only
    const latestHighlight = readwiseHighlights
      .filter(h => h.source_type === "dedao")
      .map(h => h.highlighted_at)
      .sort()
      .pop();

    if (latestHighlight) {
      // update latest sync time
      await this.env.syncbook.put("latest_sync_time", latestHighlight);
    }

    return updateResponse;
  }
} 