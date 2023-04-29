const fs = require('fs');
const scrapeWeather = require('./scrape_weather.js');

async function updateWeatherData() {
  const marsWeather = await scrapeWeather();
  fs.writeFile(
    'public/mars_weather.json',
    JSON.stringify(marsWeather, null, 2),
    (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Mars weather data saved to public/mars_weather.json');
      }
    }
  );
}

updateWeatherData();
