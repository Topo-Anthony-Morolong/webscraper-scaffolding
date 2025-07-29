import puppeteer from 'puppeteer';

import { scrapeLinks } from './scrape-links.js';

export async function scrapeImages(url) {
  try {

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      const links = await scrapeLinks(url);
    //  Extract all images
    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: "networkidle2" });

        const images = await page.evaluate(() => {
          const uniqueImages = new Set();

          document.querySelectorAll("img").forEach((img) => {
            const src = img.getAttribute("src");
            const dataSrc = img.getAttribute("data-src");
            const srcset = img.getAttribute("srcset");

            if (src) uniqueImages.add(src);
            if (dataSrc) uniqueImages.add(dataSrc);
            if (srcset) {
              const bestSrc = srcset.split(",")[0].trim().split(" ")[0];
              if (bestSrc) uniqueImages.add(bestSrc);
            }
          });

          return [...uniqueImages].sort((a, b) => a.localeCompare(b));
        });

        if (images.length) {
          console.log(`🔗 ${link}`);
          images.forEach((img) => console.log(`📷 ${new URL(img, link).href}`));
          console.log("---");
        }
      } catch (err) {
        console.error(`❌ Error scraping ${link}:`, err.message);
      }
    }
    await browser.close();
  } catch (error) {
    console.error("Error scraping website:", error);
  }
}
