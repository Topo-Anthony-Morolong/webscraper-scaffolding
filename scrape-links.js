import fetch from "node-fetch";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export async function scrapeLinks(url) {
  try {

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
     
    await browser.close();
    
    if (links.size !== 0) {
      console.log("links found on the page.");
      return links;
    }
    
  } catch (error) {
    console.error("Error scraping website:", error);
  }
}
