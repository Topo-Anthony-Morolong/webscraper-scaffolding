import fetch from "node-fetch";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

async function scrapeWebsite() {
  try {
    const url = "https://www.apple.com/";

    const response = await fetch(url);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    //  Extract all links
    const links = new Set();
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      if (href && !href.startsWith("#")) {
        try {
          const absoluteLink = new URL(href, url).href;
          links.add(absoluteLink);
        } catch (e) {
          console.error("Invalid link:", href);
        }
      }
    });

    console.log(" Links found:");
    console.log([...links]);

    //  Extract all images
    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: "networkidle2" });

        const images = await page.evaluate(() => {
          const results = new Set();

          document.querySelectorAll("img").forEach((img) => {
            const src = img.getAttribute("src");
            const dataSrc = img.getAttribute("data-src");
            const srcset = img.getAttribute("srcset");

            if (src) results.add(src);
            if (dataSrc) results.add(dataSrc);
            if (srcset) {
              const bestSrc = srcset.split(",")[0].trim().split(" ")[0];
              if (bestSrc) results.add(bestSrc);
            }
          });

          return [...results];
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

scrapeWebsite();
