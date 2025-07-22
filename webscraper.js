import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

async function scrapeWebsite() {
    try {
        const url = process.argv[2];
        if (!url) {
            console.error("Please provide a URL as an argument.");
            process.exit(1);
        }

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        await page.goto(url, { waitUntil: "networkidle2" });

        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract all links
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

        console.log("\nLinks found:");
        console.log([...links]);

        // Extract all images from each link
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
                    return Array.from(results);
                });

                if (images.length) {
                    console.log(`\nImages from: ${link}`);
                    images.forEach((img) => {
                        try {
                            const absoluteImg = new URL(img, link).href;
                            console.log(`${absoluteImg}`);
                        } catch {
                            console.log(`${img}`);
                        }
                    });
                }
            } catch (err) {
                console.error(`Error scraping ${link}: ${err.message}`);
            }
        }

        await browser.close();
    } catch (error) {
        console.error("Error scraping website:", error.message);
    } 
}

async function scrapeGamingData() {
    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set higher timeout and realistic viewport
        await page.setDefaultNavigationTimeout(60000);
        await page.setViewport({ width: 1280, height: 800 });
        
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Target Steam's featured games section
        const url = "https://store.steampowered.com/";
        console.log(`Navigating to ${url}...`);
        
        await page.goto(url, { 
            waitUntil: "domcontentloaded",
            timeout: 60000 
        });

        // Wait a bit for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Handle age verification if it appears
        try {
            const ageGateButton = await page.$('#age_gate_btn_continue');
            if (ageGateButton) {
                await page.click('#age_gate_btn_continue');
                console.log("Bypassed age gate");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch {
            // Age gate not found, continue
        }

        // Wait for the main content to load
        await page.waitForSelector('#tab_newreleases_content', { timeout: 15000 })
            .catch(() => {
                console.log("New releases tab not found, trying featured games...");
                return page.waitForSelector('.home_page_content', { timeout: 10000 });
            });
        
        const html = await page.content();
        const $ = cheerio.load(html);

        const games = [];

        // Try multiple selectors for different sections
        const gameSelectors = [
            '#tab_newreleases_content .tab_item',
            '.home_page_content .store_main_capsule',
            '.dailydeal_ctn',
            '.specials .tab_item'
        ];

        let gamesFound = false;
        for (const selector of gameSelectors) {
            const items = $(selector);
            if (items.length > 0) {
                console.log(`Found ${items.length} games with selector: ${selector}`);
                gamesFound = true;
                
                items.each((_, element) => {
                    const $el = $(element);
                    const name = $el.find('.tab_item_name, .game_purchase_action h1, .dailydeal_desc h3').text().trim() ||
                                $el.find('a').attr('title') || 
                                'Unknown Game';
                    
                    const price = $el.find('.discount_final_price, .game_purchase_price').text().trim();
                    const discount = $el.find('.discount_pct').text().trim();
                    const image = $el.find('img').first().attr('src');
                    const link = $el.find('a').first().attr('href');
                    
                    if (name && name !== 'Unknown Game') {
                        games.push({
                            name: name,
                            price: price || 'N/A',
                            discount: discount || 'No discount',
                            image: image ? (image.startsWith('http') ? image : `https://store.steampowered.com${image}`) : 'N/A',
                            link: link ? (link.startsWith('http') ? link : `https://store.steampowered.com${link}`) : 'N/A',
                            platform: 'Steam',
                            genre: 'TBD',
                            publisher: 'TBD'
                        });
                    }
                });
                
                if (games.length >= 10) break; // Limit to first 10 games
            }
        }

        if (!gamesFound) {
            console.log("No games found with any selector. Let's check what's available on the page...");
            
            // Debug: show some page structure
            const pageTitle = $('title').text();
            const mainContent = $('.home_page_content').length;
            const anyImages = $('img').length;
            
            console.log(`Page title: ${pageTitle}`);
            console.log(`Main content containers: ${mainContent}`);
            console.log(`Total images found: ${anyImages}`);
            
            // Try a more generic approach
            $('a[href*="/app/"]').each((_, element) => {
                const $el = $(element);
                const href = $el.attr('href');
                const title = $el.attr('title') || $el.text().trim();
                const img = $el.find('img').attr('src');
                
                if (title && href && games.length < 5) {
                    games.push({
                        name: title,
                        price: 'N/A',
                        discount: 'N/A',
                        image: img || 'N/A',
                        link: href.startsWith('http') ? href : `https://store.steampowered.com${href}`,
                        platform: 'Steam',
                        genre: 'TBD',
                        publisher: 'TBD'
                    });
                }
            });
        }

        console.log(`\nFound ${games.length} games total.`);
        
        if (games.length > 0) {
            console.log("\nSteam Games Data:");
            console.log(JSON.stringify(games.slice(0, 5), null, 2)); // Show first 5
        } else {
            console.log("No games were extracted. The page structure might have changed.");
        }

        await browser.close();
        return games;
    } catch (error) {
        console.error("Error scraping gaming data:", error.message);
        throw error;
    }
}

// Fixed execution handler - only run one function based on argument
(async () => {
    try {
        if (process.argv[2] === "--gaming") {
            await scrapeGamingData();
        } else if (process.argv[2] && process.argv[2] !== "--gaming") {
            await scrapeWebsite();
        } else {
            console.error("Please provide a URL or use --gaming for gaming data");
            console.log("Usage:");
            console.log("  node webscraper.js <URL>           - Scrape links and images from URL");
            console.log("  node webscraper.js --gaming        - Scrape Steam gaming data");
            process.exit(1);
        }
    } catch (error) {
        console.error("Execution failed:", error.message);
        process.exit(1);
    }
})();