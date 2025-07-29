// dataExtractor.js
// Handles the extraction of data from web pages and API responses.

import { potentialPages, selectors, fallbackPageTimeout } from './config.js'; // Import config values
import { randomDelay } from './utils.js'; // Import randomDelay from utils
import { navigateTo } from './pageNavigator.js'; // Import navigateTo for fallback scraping

// Import fs dynamically for saveToFile to avoid issues in environments where it's not available by default
// (e.g., in a browser context, though this script runs in Node.js)
let fs;
try {
  fs = await import('fs');
} catch (e) {
  console.warn("Node.js 'fs' module not available. Data saving to file will be disabled.");
  fs = null; // Set to null if fs is not available
}


/**
 * Extracts JSON content from a Puppeteer page, assuming it's in a <pre> tag or directly in the body.
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise<Array<object>|null>} Parsed JSON content, or null if parsing fails.
 */
export async function getJsonContent(page) {
    try {
        const jsonContent = await page.evaluate(() => { // Added await here
            const preElement = document.querySelector('pre');
            if (preElement) {
                return JSON.parse(preElement.textContent);
            }
            // Fallback if JSON is directly in the body
            return JSON.parse(document.body.textContent);
        });
        return jsonContent;
    } catch (e) {
        console.log("❌ Could not parse JSON data from page content:", e.message);
        return null;
    }
}

/**
 * Fallback function to scrape broker data from regular website pages using predefined selectors.
 * @param {object} page - The Puppeteer page object.
 */
export async function fallbackScraping(page) {
  try {
    for (const url of potentialPages) { // Use potentialPages from config
      try {
        console.log(`🔍 Checking ${url} for broker data...`);
        const response = await navigateTo(page, url, "domcontentloaded", fallbackPageTimeout); // Use navigateTo helper
        if (!response || response.status() !== 200) {
            console.log(`❌ Could not access ${url} (Status: ${response ? response.status() : 'unknown'})`);
            continue;
        }

        await randomDelay(2000, 4000); // Delay after navigation

        // Look for broker listings on the page
        const brokerData = await page.evaluate((selectors) => { // Pass selectors to evaluate context
            const brokers = [];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);

                    elements.forEach((el, index) => {
                        const text = el.textContent || '';
                        const html = el.innerHTML || ''; // html might be useful for more complex parsing

                        const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
                        const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g);
                        const phoneMatch = text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g);

                        if (emailMatch || nameMatch) {
                            brokers.push({
                                source: selector,
                                index: index,
                                name: nameMatch ? nameMatch[0] : 'N/A',
                                email: emailMatch ? emailMatch[0] : 'N/A',
                                phone: phoneMatch ? phoneMatch[0] : 'N/A',
                                text: text.substring(0, Math.min(text.length, 200)) + (text.length > 200 ? '...' : '') // Ensure substring doesn't go out of bounds
                            });
                        }
                    });

                    if (brokers.length > 0) break; // Stop after finding data with one selector
                }
            }
            return brokers;
        }, selectors); // Pass selectors here

        if (brokerData.length > 0) {
            console.log(`✅ Found ${brokerData.length} potential broker entries on ${url}:`);
            brokerData.forEach((broker, index) => {
                console.log(`#${index + 1}`);
                console.log(`Name: ${broker.name}`);
                console.log(`Email: ${broker.email}`);
                console.log(`Phone: ${broker.phone}`);
                console.log(`Context: ${broker.text}`);
                console.log("----");
            });
            return; // Exit function if data is found on any page
        }

      } catch (pageError) {
        console.log(`❌ Could not process ${url}: ${pageError.message}`);
      }
    }

    console.log("❌ No broker data found on any accessible pages via fallback scraping.");

  } catch (error) {
    console.error("❌ Error in fallback scraping:", error.message);
  }
}

/**
 * Saves extracted JSON content to a file.
 * @param {Array<object>} jsonContent - The array of broker data to save.
 */
export async function saveToFile(jsonContent) {
    if (!fs) {
        console.warn("Cannot save to file: Node.js 'fs' module not available.");
        return;
    }
    try {
        const dataToSave = {
            extractedAt: new Date().toISOString(),
            totalBrokers: jsonContent.length,
            brokers: jsonContent
        };

        fs.writeFileSync('brokers_data.json', JSON.stringify(dataToSave, null, 2));
        console.log("💾 Data saved to brokers_data.json");
    } catch (error) {
        console.error("❌ Error saving data to file:", error.message);
    }
}
