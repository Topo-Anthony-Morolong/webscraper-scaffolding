// email-scraper.js
// Main script to orchestrate the scraping process.

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { connect } from "puppeteer-real-browser";

// Import configurations
import {
  homepageUrl,
  apiUrl,
  brokerPages,
  browserConnectOptions,
  defaultViewport,
  navigationTimeout,
  defaultMinDelay,
  defaultMaxDelay,
  cleanupMinDelay,
  cleanupMaxDelay,
} from "./config.js";

// Import utility and navigation functions
import { randomDelay } from "./utils.js";
import { simulateHumanBehavior } from "./mimicUserBehavior.js";
import {
  navigateTo,
  waitForCloudflareChallenge,
  navigateToRelated,
} from "./pageNavigator.js";
import {
  saveToFile,
  fallbackScraping,
  getJsonContent,
} from "./dataExtractor.js";

// Use the stealth plugin for Puppeteer
puppeteer.use(StealthPlugin());

/**
 * Main function to scrape email lists from the target website.
 */
export async function scrapeEmailList() {
  let browser; // Declare browser outside try-finally for broader scope
  let page; // Declare page outside try-finally for broader scope

  try {
    console.log("🚀 Starting enhanced browser session...");

    // Connect to a real browser instance with stealth settings
    const connection = await connect(browserConnectOptions);
    browser = connection.browser;
    page = connection.page;

    // Set realistic viewport
    await page.setViewport(defaultViewport);

    console.log("🌐 Navigating to homepage and handling Cloudflare...");
    // Navigate to homepage
    const homepageResponse = await navigateTo(
      page,
      homepageUrl,
      "domcontentloaded",
      navigationTimeout
    );
    if (!homepageResponse || homepageResponse.status() !== 200) {
      console.error(
        `❌ Failed to load homepage: ${
          homepageResponse ? homepageResponse.status() : "No response"
        }`
      );
      // Decide if you want to exit or continue with fallback
      // For now, we'll continue to try Cloudflare, but a failed homepage load is critical.
    }

    // Wait for Cloudflare challenge to complete
    await waitForCloudflareChallenge(page);

    // Additional wait and human simulation to establish a robust session
    await randomDelay(defaultMinDelay, defaultMaxDelay);
    await simulateHumanBehavior(page);

    console.log("🔍 Exploring site to establish session context...");
    // Try to navigate to broker-related pages to establish context
    await navigateToRelated(page, brokerPages); // Pass page object

    console.log("🍪 Extracting complete session data (cookies and context)...");
    const cookies = await page.cookies(); // Get all cookies and session data
    console.log("📊 Session established with cookies and context.");
    console.log(`🍪 Cookies: ${cookies.length} found`);

    // Now try to access the API endpoint directly through the browser
    console.log("🎯 Attempting to access API endpoint through browser...");

    try {
      // Navigate to the API endpoint directly
      const apiResponse = await navigateTo(
        page,
        apiUrl,
        "domcontentloaded",
        navigationTimeout
      ); // Await the navigation

      if (apiResponse && apiResponse.status() === 200) {
        // Check status() method
        console.log("✅ API endpoint accessible through browser!");

        // Get the JSON content from the page
        const jsonContent = await getJsonContent(page); // Await the function call

        if (jsonContent && Array.isArray(jsonContent)) {
          console.log("✅ Brokers data extracted successfully!");
          console.log(`📊 Found ${jsonContent.length} brokers`);

          jsonContent.forEach((broker, index) => {
            console.log(`#${index + 1}`);
            console.log(
              `Contact Name: ${broker.first_name || "N/A"} ${
                broker.last_name || "N/A"
              }`
            );
            console.log(`Email: ${broker.email || "N/A"}`);
            console.log(`Firm Name/Company: ${broker.company || "N/A"}`);
            console.log(`Phone: ${broker.phone || "N/A"}`);
            console.log(
              `Location: ${broker.city || "N/A"}, ${broker.state || "N/A"}`
            );
            console.log("----");
          });

          // Save to file
          await saveToFile(jsonContent); // Await the save operation
        } else {
          console.log(
            "❌ Could not parse JSON data from API response or data is not an array."
          );
        }
      } else {
        console.log(
          `❌ API endpoint returned status: ${
            apiResponse ? apiResponse.status() : "unknown"
          }`
        );

        // Fallback: Try to find broker data on regular pages
        console.log(
          "🔄 Attempting to scrape broker data from website pages as a fallback..."
        );
        await fallbackScraping(page);
      }
    } catch (apiError) {
      console.log(
        "❌ Could not access API endpoint directly:",
        apiError.message
      );
      // Fallback: Try to find broker data on regular pages
      console.log(
        "🔄 Attempting to scrape broker data from website pages as a fallback..."
      );
      await fallbackScraping(page);
    }
  } catch (error) {
    console.error("❌ Critical error during scraping process:", error.message);
  } finally {
    // Clean up browser session
    if (browser) {
      try {
        console.log("🧹 Cleaning up browser session...");
        await randomDelay(cleanupMinDelay, cleanupMaxDelay); // Let any final requests complete
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError.message);
      }
    }
    console.log("🏁 Script completed.");
  }
}
