import { WeReadClient } from '../clients/weread';
import { WeReadHighlight } from '../types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WeReadClient', () => {
  let client: WeReadClient;
  const mockCookies = {
    wr_vid: 'test_vid',
    wr_skey: 'test_skey',
    wr_pf: 'test_pf',
    wr_rt: 'test_rt'
  };

  beforeEach(() => {
    client = new WeReadClient(JSON.stringify(mockCookies));
    mockFetch.mockClear();
  });

  describe('getHighlights', () => {
    const mockHighlightResponse = {
      synckey: 123,
      updated: [
        {
          bookId: 'test_book_id',
          bookmarkId: 'mark1',
          chapterName: 'Chapter 1',
          chapterUid: 1,
          markText: 'Test highlight',
          createTime: 1647734400, // 2022-03-20
          range: 'range1',
          style: 1,
          type: 1,
          colorStyle: 1,
          contextAbstract: 'context',
          bookVersion: 1
        }
      ],
      removed: ['old_mark1', 'old_mark2'],
      book: {
        bookId: 'test_book_id',
        title: 'Test Book',
        author: 'Test Author',
        cover: 'https://test.cover.url',
        version: 1,
        format: 'epub'
      }
    };

    it('should fetch highlights with no synckey', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockHighlightResponse)
      });

      const result = await client.getHighlights();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://i.weread.qq.com/book/bookmarklist?',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': expect.stringContaining('wr_vid=test_vid')
          })
        })
      );

      expect(result).toEqual(mockHighlightResponse);
    });

    it('should fetch highlights with synckey', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockHighlightResponse)
      });

      const result = await client.getHighlights(123);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://i.weread.qq.com/book/bookmarklist?synckey=123',
        expect.any(Object)
      );

      expect(result).toEqual(mockHighlightResponse);
    });

    it('should handle authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401
      });

      await expect(client.getHighlights()).rejects.toThrow('WeRead authentication expired');
    });
  });

  describe('getAllHighlights', () => {
    const mockHighlightResponse = {
      synckey: 123,
      updated: [
        {
          bookId: 'book1',
          bookmarkId: 'mark1',
          chapterName: 'Chapter 1',
          chapterUid: 1,
          markText: 'Highlight 1',
          createTime: 1647734400,
          range: 'range1',
          style: 1,
          type: 1,
          colorStyle: 1,
          contextAbstract: 'context',
          bookVersion: 1
        },
        {
          bookId: 'book1',
          bookmarkId: 'mark2',
          chapterName: 'Chapter 2',
          chapterUid: 2,
          markText: 'Highlight 2',
          createTime: 1647820800,
          range: 'range2',
          style: 1,
          type: 1,
          colorStyle: 1,
          contextAbstract: 'context',
          bookVersion: 1
        }
      ],
      removed: [],
      books: [{
        bookId: 'book1',
        title: 'Test Book',
        author: 'Test Author',
        cover: 'https://test.cover.url',
        version: 1,
        format: 'epub'
      }]
    };

    it('should transform highlights correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockHighlightResponse)
      });

      const result = await client.getAllHighlights();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        bookId: 'book1',
        bookmarkId: 'mark1',
        chapterName: 'Chapter 1',
        chapterUid: 1,
        markText: 'Highlight 1',
        createTime: 1647734400,
        bookInfo: {
          title: 'Test Book',
          author: 'Test Author',
          cover: 'https://test.cover.url',
          url: expect.stringContaining('https://weread.qq.com/web/reader/')
        }
      });
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          synckey: 0,
          updated: [],
          removed: [],
          books: mockHighlightResponse.books
        })
      });

      const result = await client.getAllHighlights();
      expect(result).toEqual([]);
    });

    it('should pass synckey to getHighlights', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockHighlightResponse)
      });

      await client.getAllHighlights(123);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://i.weread.qq.com/book/bookmarklist?synckey=123',
        expect.any(Object)
      );
    });
  });
}); 