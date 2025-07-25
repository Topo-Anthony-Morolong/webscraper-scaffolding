// utils.js
// Provides general utility functions.

import { defaultMinDelay, defaultMaxDelay } from './config.js';

/**
 * Generates a random delay between a specified minimum and maximum.
 * @param {number} min - The minimum delay in milliseconds.
 * @param {number} max - The maximum delay in milliseconds.
 * @returns {Promise<void>} A Promise that resolves after the random delay.
 */
export const randomDelay = (min = defaultMinDelay, max = defaultMaxDelay) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};
