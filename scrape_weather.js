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
    '.wysiwyg_content table.mb_table tbody tr:nth-child(2) td:nth-child(3) .fahrenheit',
    (el) => el.textContent
  );
  
  const lowTemperature = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(2) td:nth-child(4) .fahrenheit',
    (el) => el.textContent
  );

  const pressure = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(2) td:nth-child(5)',
    (el) => el.textContent
  );

  const sunrise = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(2) td:nth-child(6)',
    (el) => el.textContent
  );
  const sunset = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(2) td:nth-child(7)',
    (el) => el.textContent
  );

  const yesterdaySolDate = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(3) th:nth-child(2)',
    (el) => el.textContent
  );
  const yesterdayHigh = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(3) td:nth-child(3) .fahrenheit',
    (el) => el.textContent
  );
  const yesterdayLow = await page.$eval(
    '.wysiwyg_content table.mb_table tbody tr:nth-child(3) td:nth-child(4) .fahrenheit',
    (el) => el.textContent
  ); 

const highTemperatures = [];
const lowTemperatures = [];

for (let i = 2; i <= 8; i++) {
  const highTemperature = await page.$eval(
    `.wysiwyg_content table.mb_table tbody tr:nth-child(${i}) td:nth-child(3) .fahrenheit`,
    (el) => el.textContent
  );
  highTemperatures.push(highTemperature);

  const lowTemperature = await page.$eval(
    `.wysiwyg_content table.mb_table tbody tr:nth-child(${i}) td:nth-child(4) .fahrenheit`,
    (el) => el.textContent
  );
  lowTemperatures.push(lowTemperature);
}

  
  
  console.log('Sol Date:', solDate);
  console.log('Earth Date:', earthDate);
  console.log('High Temperature:', highTemperature);
  console.log('Low Temperature:', lowTemperature);
  console.log('Pressure:', pressure);
  console.log('Sunrise:', sunrise);
  console.log('Sunset:', sunset);
  console.log('Yesterday Sol Date:', yesterdaySolDate);
  console.log('Yesterday High:', yesterdayHigh);
  console.log('Yesterday Low:', yesterdayLow);
  console.log('High Temperatures:', highTemperatures);
  console.log('Low Temperatures:', lowTemperatures);


  const marsWeather = {
    solDate,
    earthDate,
    highTemperature,
    lowTemperature,
    pressure,
    sunrise,
    sunset,
    yesterdaySolDate,
    yesterdayHigh,
    yesterdayLow,
    highTemperatures,
    lowTemperatures
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

async function fetchData() {
  try {
    const response = await fetch('http://localhost:3000/mars_weather');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Mars weather data:', error);
  }
}



scrapeWeather();

module.exports = scrapeWeather;