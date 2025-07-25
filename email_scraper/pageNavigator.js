// pageNavigator.js
// Handles page navigation and Cloudflare challenge waiting.

import {  simulateHumanBehavior } from "./mimicUserBehavior.js"; // Corrected import path
import { cloudflareMinDelay, cloudflareMaxDelay, navigationTimeout, fallbackPageTimeout } from './config.js'; // Import config values
import {randomDelay} from './utils.js'

/**
 * Waits for a Cloudflare challenge to complete by checking page title and URL.
 * @param {object} page - The Puppeteer page object.
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds.
 * @returns {Promise<boolean>} True if Cloudflare challenge is passed, false otherwise.
 */
export const waitForCloudflareChallenge = async (page, maxWaitTime = 30000) => {
  console.log("🛡️ Waiting for Cloudflare challenge to complete...");

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const title = await page.title();
      const url = page.url();

      if (title.includes('Just a moment') ||
          title.includes('Checking your browser') ||
          url.includes('cf-browser-verification')) {
        console.log("⏳ Still processing Cloudflare challenge...");
        await randomDelay(cloudflareMinDelay, cloudflareMaxDelay); // Use config values
        continue;
      }

      const bodyContent = await page.evaluate(() => {
        return document.body.innerText.length > 100;
      });

      if (bodyContent) {
        console.log("✅ Cloudflare challenge passed!");
        return true;
      }

    } catch (error) {
      console.log("🔄 Waiting for page to stabilize or Cloudflare check to resolve...");
    }

    await randomDelay(1000, 2000); // Small delay between checks
  }

  console.log("⚠️ Cloudflare challenge timeout - proceeding anyway");
  return false;
};

/**
 * Navigates the page to a specified URL.
 * @param {object} page - The Puppeteer page object.
 * @param {string} url - The URL to navigate to.
 * @param {string} [waitUntil="domcontentloaded"] - When to consider navigation successful.
 * @param {number} [timeout=navigationTimeout] - Maximum navigation time in milliseconds.
 * @returns {Promise<object|null>} The response object if navigation is successful, null otherwise.
 */
export async function navigateTo(page, url, waitUntil = "domcontentloaded", timeout = navigationTimeout) {
    try {
        const response = await page.goto(url, {
            waitUntil: waitUntil,
            timeout: timeout
        });
        return response;
    } catch (error) {
        console.log(`❌ Navigation to ${url} failed: ${error.message}`);
        return null;
    }
}

/**
 * Navigates to a list of broker-related pages to establish session context.
 * @param {object} page - The Puppeteer page object.
 * @param {Array<string>} brokerPages - An array of URL paths to navigate to.
 */
export async function navigateToRelated(page, brokerPages) { // Added 'page' as an argument
  for (const path of brokerPages) {
      try {
        const fullUrl = `https://www.ibba.org${path}`; // Construct full URL
        const response = await navigateTo(page, fullUrl, "domcontentloaded", fallbackPageTimeout); // Use navigateTo helper

        if (response && response.status() === 200) {
          console.log(`✅ Found working page: ${path}`);
          await randomDelay(3000, 5000);
          await simulateHumanBehavior(page);
          return; // Exit after finding the first working page
        }
      } catch (e) {
        console.log(`📝 Page ${path} not accessible: ${e.message}`);
      }
    }
    console.log("⚠️ No suitable broker-related page found after exploring.");
}
