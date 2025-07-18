// TODO: write this file!
import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function scrapeWebsite() {
  try {
    const url = "https://www.apple.com/";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Example: Extracting all links
    $("a").each((index, element) => {
      console.log($(element).attr("href"));
    });
  } catch (error) {
    console.error("Error scraping website:", error);
  }
}

scrapeWebsite();
