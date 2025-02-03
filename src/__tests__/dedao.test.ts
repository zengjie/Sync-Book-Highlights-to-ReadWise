import { DedaoClient } from '../clients/dedao';

describe('DedaoClient', () => {
  let client: DedaoClient;

  beforeAll(() => {
    client = new DedaoClient();
  });

  it('should get book data', async () => {
    const bookTitle = "认知觉醒";  // Replace with a known book title
    const bookData = await client.getBookData(bookTitle);
    console.log('Book data:', JSON.stringify(bookData, null, 2));
    expect(bookData).toBeDefined();
    expect(bookData.sourceUrl).toBeDefined();
    expect(bookData.imageUrl).toBeDefined();
    expect(bookData.author).toBeDefined();
  });
}); 