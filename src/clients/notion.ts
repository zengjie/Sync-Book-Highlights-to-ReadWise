import { Client } from "@notionhq/client";
import { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { HighlightInNotion } from '../types';

export class NotionClient {
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