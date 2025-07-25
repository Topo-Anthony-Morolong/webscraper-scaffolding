import puppeteer from "puppeteer";
import * as cheerio from "cheerio";


const url = process.argv[2];
if (!url) {
    console.error("Please provide a URL: node scraper.js <url>");
    process.exit(1);
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    if (url.includes("steampowered")) {
        await scrapeSteam(browser);
    } else if (url.includes("igdb.com")) {
        await scrapeIGDB(page);
    } else {
        await scrapeGeneric(page);
    }

    await browser.close();
})();

// Scrape game details from Steam
async function scrapeSteam(browser) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector(".tab_item", { timeout: 60000 });

    const games = await page.$$eval(".tab_item", items =>
        items.slice(0, 10).map(el => ({
            name: el.querySelector(".tab_item_name")?.innerText.trim(),
            url: el.href
        }))
    );

    for (const [i, game] of games.entries()) {
        console.log(`${i + 1}. ${game.name}`);
        console.log(`   Page: ${game.url}`);

        try {
            const detailPage = await browser.newPage();
            await detailPage.goto(game.url, { waitUntil: "domcontentloaded", timeout: 0 });

            const details = await detailPage.evaluate(() => {
                const genres = Array.from(document.querySelectorAll("a[href*='genre']"))
                    .map(a => a.innerText.trim())
                    .join(", ") || "N/A";

                const platforms = Array.from(document.querySelectorAll(".game_area_purchase_platform a"))
                    .map(a => a.innerText.trim())
                    .join(", ") || "N/A";

                const releaseDate = document.querySelector(".date")?.innerText.trim() || "N/A";
                const publisher = Array.from(document.querySelectorAll(".dev_row"))
                    .find(row => row.innerText.includes("Publisher:"))?.querySelector(".summary")?.innerText.trim() || "N/A";
                const profileImg = document.querySelector(".game_header_image_full")?.src || "N/A";
                const trailer = document.querySelector(".highlight_youtube a")?.href || "N/A";

                return { genres, platforms, releaseDate, publisher, profileImg, trailer };
            });

            console.log(`   Genre(s): ${details.genres}`);
            console.log(`   Platforms: ${details.platforms}`);
            console.log(`   Release Date: ${details.releaseDate}`);
            console.log(`   Publisher: ${details.publisher}`);
            console.log(`   Profile Image: ${details.profileImg}`);
            console.log(`   Trailer: ${details.trailer}\n`);

            await detailPage.close();
        } catch (err) {
            console.error(`   Failed to fetch details: ${err.message}`);
        }
    }
}

// Scrape game listings from IGDB with fallback selectors and scroll
async function scrapeIGDB(page) {
    try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
        await autoScroll(page);

        // Try multiple fallback selectors
        const selectors = ["table", ".game-card", ".card_game", ".info,", " media"];

        let found = false;
        for (const sel of selectors) {
            try {
                await page.waitForSelector(sel, { timeout: 8000 });
                found = true;
                break;
            } catch (e) {
                continue;
            }
        }

        if (!found) throw new Error("No valid game card selector found on IGDB page");

        const html = await page.content();
        const $ = cheerio.load(html);

        const games = [];
        $(".game-card, .card_game, .info").each((i, el) => {
            const title = $(el).find(".info_title, h2").first().text().trim();
            const release = $(el).find(".info_detail span, time").first().text().trim();
            const href = $(el).find("a").first().attr("href") || "";
            const link = href.startsWith("http") ? href : `https://www.igdb.com${href}`;

            if (title) {
                games.push({ title, release, link });
            }
        });

        if (games.length === 0) {
            console.log("No games found on IGDB page.");
            return;
        }

        games.slice(0, 10).forEach((game, i) => {
            console.log(`${i + 1}. ${game.title}`);
            console.log(`   Release Date: ${game.release || "N/A"}`);
            console.log(`   Link: ${game.link}\n`);
        });
    } catch (err) {
        console.error(`Failed to scrape IGDB: ${err.message}`);
    }
}

// Scroll page to trigger dynamic content loading
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        });
    });
}

// Scrape links and images from any generic page
async function scrapeGeneric(page) {
    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
        const content = await page.content();
        const $ = cheerio.load(content);

        const links = [];
        const images = [];

        $("a[href]").each((_, el) => {
            let href = $(el).attr("href");
            if (href && !href.startsWith("http")) {
                href = new URL(href, url).href;
            }
            links.push(href);
        });

        $("img[src]").each((_, el) => {
            let src = $(el).attr("src");
            if (src && !src.startsWith("http")) {
                src = new URL(src, url).href;
            }
            images.push(src);
        });

        console.log(`\nFound ${links.length} links:`);
        links.slice(0, 10).forEach(link => console.log(" - " + link));

        console.log(`\nFound ${images.length} images:`);
        images.slice(0, 10).forEach(img => console.log(" - " + img));
    } catch (err) {
        console.error(`Failed to scrape generic site: ${err.message}`);
    }
}
