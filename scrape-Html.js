import fetch from "node-fetch";

export async function scrapeHtml(url) {
    try{
        // Fetch the HTML content of the page
        if (!url) {
            throw new Error("URL is required for scraping HTML.");
        }
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const html = await response.text();
        console.log("Raw HTML of the page:");
        console.log(html);

    }catch (error) {
        console.error("Error scraping HTML:", error.message);
    }
}

