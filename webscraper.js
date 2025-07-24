
import { scrapeHtml } from './scrape-Html.js';
import { scrapeLinks } from './scrape-links.js';  
import { scrapeImages } from './scrape-images.js';

const args = process.argv.slice(2);
const url = args[0];
const option = args[1];

if (!url || !option) {
  console.error('Usage: node webscraper.js <URL> <--option>');
  process.exit(1);
}


async function scrapeWebsite() {
   
  switch (option) {
    
    case '--html':
      console.log(`Scraping HTML from: ${url}`);
      await scrapeHtml(url);
      break;
    case '--links': 
      console.log(`Scraping Links from: ${url}`);
      console.log(await scrapeLinks(url));
        break;
    case '--images':
      console.log(`Scraping Images from: ${url}`);
      await scrapeImages(url);
      break;  
    case '--emails':
      //call the scrapeEmails function
      break;
    case '--games':
      //call the scrapeGames function
      break;  
    default:
       console.error(`
 option: ${option}

Usage:
  node webscraper.js <URL> <option>

Options:
  --html      - Scrape and print raw HTML of the page
  --links     - Extract all hyperlinks from the page
  --images    - Download or list image sources from the page
  --emails    - Extract any visible email addresses
  --games     - Get latest/upcoming games (ignores <URL>)

Example:
  node webscraper.js https://example.com --links
  node webscraper.js https://ign.com --games

  `);
  process.exit(1);
  }
  
}

scrapeWebsite();
