// mimicUserBehavior.js
// Contains functions to simulate human-like interactions on a page.

import { randomDelay } from './utils.js';
import { humanBehaviorMinDelay, humanBehaviorMaxDelay } from './config.js';

/**
 * Simulates human mouse movements and scrolling on the page.
 * @param {object} page - The Puppeteer page object.
 */
export const simulateHumanBehavior = async (page) => {
  try {
    // Random scrolling down
    await page.evaluate(() => {
      const scrollAmount = Math.floor(Math.random() * 300) + 100;
      window.scrollBy(0, scrollAmount);
    });
    await randomDelay(humanBehaviorMinDelay, humanBehaviorMaxDelay); // Use config values for delay

    // Random mouse movements within the viewport
    const viewport = await page.viewport();
    if (viewport) { // Ensure viewport is defined
        await page.mouse.move(
            Math.random() * viewport.width,
            Math.random() * viewport.height
        );
        await randomDelay(humanBehaviorMinDelay / 2, humanBehaviorMaxDelay / 2); // Shorter delay for mouse move
    }

    // Scroll back up slightly
    await page.evaluate(() => {
      window.scrollBy(0, -Math.floor(Math.random() * 200) + 50);
    });
    await randomDelay(humanBehaviorMinDelay, humanBehaviorMaxDelay);

  } catch (error) {
    console.log("Note: Could not simulate some human behaviors:", error.message);
  }
};
