import puppeteer from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Enable stealth mode to bypass anti-bot systems like Cloudflare
puppeteerExtra.use(StealthPlugin());


const IGDB_COMING_SOON = "https://www.igdb.com/games/coming_soon";

// Main scraping function
async function fetchUpcomingGames() {

  const browser = await puppeteerExtra.launch({
    headless: false,
    slowMo: 30,
  });

  const tab = await browser.newPage();

  try {

    await tab.goto(IGDB_COMING_SOON, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });


    await tab.waitForSelector(".media");

    // Extract game links and images
    const previews = await tab.$$eval(".media", (nodes) =>
      nodes.map((node) => {
        const link = node.querySelector(".media-body a");
        const image = node.querySelector(".media-left img");
        return {
          gameUrl: link?.href || "",
          profileImage: image?.src || "",
        };
      })
    );

    const results = [];


    for (const [index, { gameUrl, profileImage }] of previews.slice(0, 20).entries()) {
      console.log(`\nScraping game ${index + 1}: ${gameUrl}`);


      await tab.goto(gameUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });


      await tab.waitForSelector("h1");

      // Extract the game name/title
      const gameName = await tab.$eval("h1", (el) => el.textContent.trim());

      // Extract tags (genres and platforms)
      const tags = await tab.$$eval(
        ".MuiTypography-body1 > a",
        (links) => links.map((el) => el.textContent.trim())
      );


      const genres = tags.slice(0, -1);
      const platforms = tags.slice(-1);

      // release date
      const releaseDate = await tab.$$eval("p", (paragraphs) => {
        const line = paragraphs.find((p) =>
          p.textContent.toLowerCase().includes("release date")
        );
        return line ? line.textContent.split(":").slice(1).join(":").trim() : "Unknown";
      });

      // publishers
      const publishers = await tab.$$eval("p", (nodes) => {
        const pub = nodes.find((p) =>
          p.textContent.toLowerCase().startsWith("publishers:")
        );
        return pub
          ? Array.from(pub.querySelectorAll("a")).map((a) => a.textContent.trim())
          : [];
      });

      //get trailer links
      const trailerLink = await tab.$$eval("iframe", (frames) => {
        const yt = frames.find((f) => f.src.includes("youtube") || f.src.includes("trailer"));
        return yt?.src || "Not available";
      });

      // Combine all data into a single object
      const gameInfo = {
        gameName,
        genres,
        platforms,
        releaseDate,
        publishers,
        profileImage,
        trailerLink,
        gameUrl,
      };


      console.log(JSON.stringify(gameInfo, null, 2));


    }


    console.log(`\nScraping complete. Total games scraped: ${results.length}`);
  } catch (err) {

    console.error("Scraping failed:", err.message);
  } finally {

    await browser.close();
  }
}


fetchUpcomingGames();

