import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { connect } from "puppeteer-real-browser";

// Use stealth mode
puppeteer.use(StealthPlugin());

const apiUrl = "https://www.ibba.org/wp-json/brokers/all";

// Function to add random delay
const randomDelay = (min = 3000, max = 8000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Function to simulate human mouse movements
const simulateHumanBehavior = async (page) => {
  try {
    // Random scrolling
    await page.evaluate(() => {
      const scrollAmount = Math.floor(Math.random() * 300) + 100;
      window.scrollBy(0, scrollAmount);
    });
    await randomDelay(1000, 2000);
    
    // Random mouse movements
    const viewport = await page.viewport();
    await page.mouse.move(
      Math.random() * viewport.width,
      Math.random() * viewport.height
    );
    await randomDelay(500, 1500);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollBy(0, -Math.floor(Math.random() * 200) + 50);
    });
  } catch (error) {
    console.log("Note: Could not simulate some human behaviors");
  }
};

// Function to wait for Cloudflare challenge to complete
const waitForCloudflareChallenge = async (page, maxWaitTime = 30000) => {
  console.log("🛡️ Waiting for Cloudflare challenge to complete...");
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check if we're still on a Cloudflare challenge page
      const title = await page.title();
      const url = page.url();
      
      if (title.includes('Just a moment') || 
          title.includes('Checking your browser') ||
          url.includes('cf-browser-verification')) {
        console.log("⏳ Still processing Cloudflare challenge...");
        await randomDelay(2000, 4000);
        continue;
      }
      
      // Check if page has loaded normally
      const bodyContent = await page.evaluate(() => {
        return document.body.innerText.length > 100;
      });
      
      if (bodyContent) {
        console.log("✅ Cloudflare challenge passed!");
        return true;
      }
      
    } catch (error) {
      console.log("🔄 Waiting for page to stabilize...");
    }
    
    await randomDelay(1000, 2000);
  }
  
  console.log("⚠️ Cloudflare challenge timeout - proceeding anyway");
  return false;
};

(async () => {
  let browser;
  
  try {
    console.log("🚀 Starting enhanced browser session...");
    
    // Launch browser with maximum stealth settings
    const { browser: browserInstance, page } = await connect({
      headless: false, // Keep visible to handle challenges
      turnstile: true,
      tf: true,
      connectOption: {
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        args: [
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
    });
    
    browser = browserInstance;

    // Set realistic viewport
    await page.setViewport({ width: 1366, height: 768 });

    console.log("🌐 Navigating to homepage and handling Cloudflare...");
    
    // Navigate to homepage
    await page.goto("https://www.ibba.org", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // Wait for Cloudflare challenge to complete
    await waitForCloudflareChallenge(page);
    
    // Additional wait and human simulation
    await randomDelay(5000, 8000);
    await simulateHumanBehavior(page);

    console.log("🔍 Exploring site to establish session...");
    
    // Try to navigate to broker-related pages to establish context
    const brokerPages = [
      '/find-a-broker',
      '/directory',
      '/members',
      '/broker-directory'
    ];
    
    for (const path of brokerPages) {
      try {
        const response = await page.goto(`https://www.ibba.org${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000
        });
        
        if (response && response.status() === 200) {
          console.log(`✅ Found working page: ${path}`);
          await randomDelay(3000, 5000);
          await simulateHumanBehavior(page);
          break;
        }
      } catch (e) {
        console.log(`📝 Page ${path} not accessible`);
      }
    }

    console.log("🍪 Extracting complete session data...");
    
    // Get all cookies and session data
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get page context and headers that the browser would send
    const pageContext = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory || 8,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      } : null
    }));

    console.log("📊 Session established with cookies and context");
    console.log(`🍪 Cookies: ${cookies.length} found`);

    // Now try to access the API endpoint directly through the browser
    console.log("🎯 Attempting to access API endpoint through browser...");
    
    try {
      // Navigate to the API endpoint directly
      const apiResponse = await page.goto(apiUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      
      if (apiResponse && apiResponse.status() === 200) {
        console.log("✅ API endpoint accessible through browser!");
        
        // Get the JSON content
        const jsonContent = await page.evaluate(() => {
          try {
            const preElement = document.querySelector('pre');
            if (preElement) {
              return JSON.parse(preElement.textContent);
            }
            return JSON.parse(document.body.textContent);
          } catch (e) {
            return null;
          }
        });
        
        if (jsonContent && Array.isArray(jsonContent)) {
          console.log("✅ Brokers data extracted successfully!");
          console.log(`📊 Found ${jsonContent.length} brokers`);
          
          jsonContent.forEach((broker, index) => {
            console.log(`#${index + 1}`);
            console.log(`Contact Name: ${broker.first_name || 'N/A'} ${broker.last_name || 'N/A'}`);
            console.log(`Email: ${broker.email || "N/A"}`);
            console.log(`Firm Name/Company: ${broker.company || "N/A"}`);
            console.log(`Phone: ${broker.phone || "N/A"}`);
            console.log(`Location: ${broker.city || 'N/A'}, ${broker.state || 'N/A'}`);
            console.log("----");
          });
          
          // Save to file if needed
          const fs = await import('fs');
          const dataToSave = {
            extractedAt: new Date().toISOString(),
            totalBrokers: jsonContent.length,
            brokers: jsonContent
          };
          
          fs.writeFileSync('brokers_data.json', JSON.stringify(dataToSave, null, 2));
          console.log("💾 Data saved to brokers_data.json");
          
        } else {
          console.log("❌ Could not parse JSON data from API response");
        }
        
      } else {
        console.log(`❌ API endpoint returned status: ${apiResponse ? apiResponse.status() : 'unknown'}`);
        
        // Fallback: Try to find broker data on regular pages
        console.log("🔄 Attempting to scrape broker data from website pages...");
        await fallbackScraping(page);
      }
      
    } catch (apiError) {
      console.log("❌ Could not access API endpoint:", apiError.message);
      
      // Fallback: Try to find broker data on regular pages
      console.log("🔄 Attempting to scrape broker data from website pages...");
      await fallbackScraping(page);
    }

  } catch (error) {
    console.error("❌ Critical error during scraping:", error.message);
    
  } finally {
    // Clean up browser session
    if (browser) {
      try {
        console.log("🧹 Cleaning up browser session...");
        await randomDelay(2000, 3000); // Let any final requests complete
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError.message);
      }
    }
    
    console.log("🏁 Script completed");
  }
})();

// Fallback function to scrape broker data from regular pages
async function fallbackScraping(page) {
  try {
    // Try different potential broker directory pages
    const potentialPages = [
      'https://www.ibba.org/find-a-broker',
      'https://www.ibba.org/broker-directory',
      'https://www.ibba.org/members',
      'https://www.ibba.org/directory'
    ];
    
    for (const url of potentialPages) {
      try {
        console.log(`🔍 Checking ${url}...`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await randomDelay(2000, 4000);
        
        // Look for broker listings on the page
        const brokerData = await page.evaluate(() => {
          const brokers = [];
          
          // Try multiple selectors that might contain broker information
          const selectors = [
            '.broker-card', '.member-card', '.broker-listing', 
            '.directory-item', '[data-broker]', '.contact-card',
            '.broker', '.member', '.listing', '.directory-entry',
            'article', '.entry', '.post'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              console.log(`Found ${elements.length} elements with selector: ${selector}`);
              
              elements.forEach((el, index) => {
                // Extract text content and look for patterns
                const text = el.textContent || '';
                const html = el.innerHTML || '';
                
                // Look for email patterns
                const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g);
                
                // Look for name patterns (common first names followed by last names)
                const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g);
                
                // Look for phone patterns
                const phoneMatch = text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g);
                
                if (emailMatch || nameMatch) {
                  brokers.push({
                    source: selector,
                    index: index,
                    name: nameMatch ? nameMatch[0] : 'N/A',
                    email: emailMatch ? emailMatch[0] : 'N/A',
                    phone: phoneMatch ? phoneMatch[0] : 'N/A',
                    text: text.substring(0, 200) + '...' // First 200 chars for context
                  });
                }
              });
              
              if (brokers.length > 0) break;
            }
          }
          
          return brokers;
        });
        
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
          return; // Exit if we found data
        }
        
      } catch (pageError) {
        console.log(`❌ Could not access ${url}: ${pageError.message}`);
      }
    }
    
    console.log("❌ No broker data found on any accessible pages");
    
  } catch (error) {
    console.error("❌ Error in fallback scraping:", error.message);
  }
}