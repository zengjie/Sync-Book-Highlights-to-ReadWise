import { DedaoTopHitsResponse } from '../types';

export class DedaoClient {
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