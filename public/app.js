async function fetchData() {
    try {
      const response = await fetch('mars_weather.json');
      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      console.error('Error fetching Mars weather data:', error);
    }
  }
  
  function displayWeather(data) {
    const solDateElement = document.getElementById('sol-date');
    const earthDateElement = document.getElementById('earth-date');
    const highTemperatureElement = document.getElementById('high-temperature');
    const lowTemperatureElement = document.getElementById('low-temperature');
  
    solDateElement.textContent = data.solDate;
    earthDateElement.textContent = data.earthDate;
    highTemperatureElement.textContent = data.highTemperature;
    lowTemperatureElement.textContent = data.lowTemperature;
  }
  
  fetchData();
  