import { config } from 'dotenv';
import { ReadWiseClient } from '../src/clients/readwise';

async function removeWeReadHighlights() {
  // Load environment variables
  config({ path: '.dev.vars' });

  const readwiseToken = process.env.READWISE_TOKEN;
  if (!readwiseToken) {
    console.error('READWISE_TOKEN environment variable is not set');
    process.exit(1);
  }

  // Check for dry-run mode
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('Running in dry-run mode - no highlights will be actually deleted\n');
  }

  const readwise = new ReadWiseClient(readwiseToken);
  let page = 1;
  let totalFound = 0;

  try {
    while (true) {
      const response = await readwise.listBooks('weread', page);
      
      if (response.results === undefined || response.results.length === 0) {
        break;
      }

      for (const book of response.results) {
        if (book.id) {
          if (book.num_highlights == 0) {
            console.log(`Skipping book ${book.title} with no highlights`);
            continue;
          }

          const highlights = await readwise.getHighlights(book.id);
          for (const highlight of highlights) {
            if (isDryRun) {
              const previewText = highlight.text.slice(0, 20);
              const ellipsis = highlight.text.length > 100 ? '...' : '';
              console.log(
                `Would delete highlight ${highlight.id}: ` + 
                `"${previewText}${ellipsis}" ` +
                `from book ${book.title}`
              );
            } else {
              if (highlight.id) {
                await readwise.deleteHighlight(highlight.id);
                console.log(`Deleted highlight ${highlight.id}`);
              }
            }
            totalFound++;
          }
        }
      }

      if (response.next === null) {
        break;
      }

      page++;
    }

    if (isDryRun) {
      console.log(`\nFound ${totalFound} WeRead highlights that would be deleted`);
      console.log('To actually delete these highlights, run the command without --dry-run');
    } else {
      console.log(`\nSuccessfully deleted ${totalFound} WeRead highlights`);
    }
  } catch (error) {
    console.error('Error processing highlights:', error);
    process.exit(1);
  }
}

removeWeReadHighlights().catch(console.error); 