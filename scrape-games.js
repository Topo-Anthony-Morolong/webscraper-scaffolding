import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.API_KEY;

// Get today's date
const today = new Date().toISOString().split("T")[0];

// Set a future date (e.g., 6 months ahead)
const sixMonthsLater = new Date();
sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
const futureDate = sixMonthsLater.toISOString().split("T")[0];

export async function getUpcomingGames() {
  const url = `https://api.rawg.io/api/games?key=${API_KEY}&dates=${today},${futureDate}&ordering=released&page_size=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const games = data.results.map((game) => ({
      name: game.name,
      release_date: game.released,
      genres: game.genres.map((g) => g.name),
      platforms: game.platforms?.map((p) => p.platform.name),
      image: game.background_image,
    }));

    console.log("Upcoming Games:");
    console.log(games);
  } catch (error) {
    console.error("Error fetching upcoming games:", error.message);
  }
}

getUpcomingGames();
