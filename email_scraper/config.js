// config.js
// Centralized configuration for the scraping application.

// Note: puppeteer and puppeteer-real-browser are not imported here.
// Browser setup logic belongs in the main scraping script or a dedicated browser manager.

export const homepageUrl = "https://www.ibba.org";

export const apiUrl = "https://www.ibba.org/wp-json/brokers/all"; // Target API endpoint URL

// Broker-related pages to establish context and for fallback scraping
export const brokerPages = [
    '/find-a-broker',
    '/directory',
    '/members',
    '/broker-directory'
];

// Maximum stealth settings for puppeteer-real-browser connection
// This object will be used when calling connect() in the main script.
export const browserConnectOptions = {
    headless: false, // Keep visible to handle challenges during development/debugging
    turnstile: true, // Enable Turnstile solver
    tf: true, // Enable TensorFlow fingerprinting
    connectOption: {
        defaultViewport: null, // Use default viewport
        ignoreHTTPSErrors: true, // Ignore HTTPS errors
        args: [ // Chromium command-line arguments for maximum stealth
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-tools',
            '--no-default-browser-check',
            '--disable-extensions-except',
            '--disable-plugins-discovery',
            '--start-maximized'
        ]
    }
};

// Potential broker directory pages for fallback scraping
// These are full URLs, as fallbackScraping iterates through them directly.
export const potentialPages = [
    'https://www.ibba.org/find-a-broker',
    'https://www.ibba.org/broker-directory',
    'https://www.ibba.org/members',
    'https://www.ibba.org/directory'
];

// CSS selectors (classes/attributes) that might contain broker information
// Used by the fallback scraping mechanism to identify relevant elements.
export const selectors = [
    '.broker-card', '.member-card', '.broker-listing',
    '.directory-item', '[data-broker]', '.contact-card',
    '.broker', '.member', '.listing', '.directory-entry',
    'article', '.entry', '.post'
];

// Default viewport settings for the browser page
export const defaultViewport = { width: 1366, height: 768 };

// Default timeouts for page navigation in milliseconds
export const navigationTimeout = 60000; // General navigation timeout
export const fallbackPageTimeout = 15000; // Timeout for individual fallback pages

// Default delays in milliseconds for human behavior simulation and Cloudflare checks
export const defaultMinDelay = 3000;
export const defaultMaxDelay = 8000;
export const cloudflareMinDelay = 2000;
export const cloudflareMaxDelay = 4000;
export const humanBehaviorMinDelay = 500;
export const humanBehaviorMaxDelay = 1500;
export const cleanupMinDelay = 2000;
export const cleanupMaxDelay = 3000;
