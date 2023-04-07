const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeWeather() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://mars.nasa.gov/msl/weather/');

  const solDate = await page.$eval(
    '#MSL-Weather-Report .marsDate',
    (el) => el.textContent
  );

  const earthDate = await page.$eval(
    '#MSL-Weather-Report .earthDate',
    (el) => el.textContent
  );

  const highTemperature = await page.$eval(
    '#MSL-Weather-Report .temperatures.main .highs .fahrenheit',
    (el) => el.textContent
  );
  
  const lowTemperature = await page.$eval(
    '#MSL-Weather-Report .temperatures.main .lows .fahrenheit',
    (el) => el.textContent
  );

  const pressure = await page.$eval(
    '#weather_observation td.pressure',
    (el) => el.textContent
  );

  const sunrise = await page.$eval(
    '#weather_observation td.sun',
    (el) => el.textContent
  );
  const sunset = await page.$eval(
    '#weather_observation td.sun.set',
    (el) => el.textContent
  );
  
  
  console.log('Sol Date:', solDate);
  console.log('Earth Date:', earthDate);
  console.log('High Temperature:', highTemperature);
  console.log('Low Temperature:', lowTemperature);
  console.log('Pressure:', pressure);
  console.log('Sunrise:', sunrise);
  console.log('Sunset:', sunset);


  const marsWeather = {
    solDate,
    earthDate,
    highTemperature,
    lowTemperature,
    pressure,
    sunrise,
    sunset
  };

  fs.writeFile(
    'mars_weather.json',
    JSON.stringify(marsWeather, null, 2),
    (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Mars weather data saved to mars_weather.json');
      }
    }
  );

  await browser.close();
}

scrapeWeather();
