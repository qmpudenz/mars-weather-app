// Weather Module
export class WeatherManager {
  constructor() {
    this.temperatureData = [];
    this.currentChartPeriod = 7;
  }

  async getMarsWeather() {
    try {
      const data = await this.fetchData();
      await this.displayWeatherData(data);
      this.updateDataFreshness();
    } catch (error) {
      console.error("Error:", error);
      this.showErrorState();
    }
  }

  async fetchData() {
    const response = await fetch('https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json');
    const rawData = await response.json();
    const data = rawData.soles;

    if (!data || data.length === 0) {
      console.error('Invalid data format, soles property not found or empty');
      return;
    }

    const latestSolData = data[0];
    console.log(latestSolData);

    const solData = data.map((currentSolData) => {
      const {
        id,
        terrestrial_date,
        sol,
        ls,
        season,
        min_temp,
        max_temp,
        pressure,
        pressure_string,
        abs_humidity,
        wind_speed,
        wind_direction,
        atmo_opacity,
        sunrise,
        sunset,
        local_uv_irradiance_index,
        min_gts_temp,
        max_gts_temp,
      } = currentSolData;
      return {
        id,
        terrestrial_date,
        sol,
        ls,
        season,
        min_temp,
        max_temp,
        pressure,
        pressure_string,
        abs_humidity,
        wind_speed,
        wind_direction,
        atmo_opacity,
        sunrise,
        sunset,
        local_uv_irradiance_index,
        min_gts_temp,
        max_gts_temp,
      };
    });
    return {
      latestSolData,
      solData,
    };
  }

  async displayWeatherData(weatherData) {
    if (!weatherData || !weatherData.latestSolData) {
      this.showErrorState();
      return;
    }

    const {
      sol: solDate,
      terrestrial_date: earthDate,
      max_temp: highTemperature,
      min_temp: lowTemperature,
      pressure,
      sunrise,
      sunset,
    } = weatherData.latestSolData;

    // Update UI with weather data
    document.getElementById("solDate").innerText = solDate;
    document.getElementById("earthDate").innerText = this.formattedDate(earthDate);
    document.getElementById("highTemperature").innerText = highTemperature + "°F";
    document.getElementById("lowTemperature").innerText = lowTemperature + "°F";
    document.getElementById("pressure").innerText = pressure;
    document.getElementById("sunrise").innerText = sunrise;
    document.getElementById("sunset").innerText = sunset;

    // Prepare temperature chart data
    this.temperatureData = weatherData.solData.map((solData) => {
      const highTemp = parseInt(solData.max_temp);
      const lowTemp = parseInt(solData.min_temp);
      return {
        sol: solData.sol,
        high: highTemp,
        low: lowTemp,
      };
    });

    // Render temperature analysis
    const chartData = this.getChartDataForPeriod(this.temperatureData, this.currentChartPeriod);
    this.renderTemperatureAnalysis(chartData);

    // Check for weather alerts
    this.checkWeatherAlerts(weatherData);

    // Initialize rover photos
    const sol = weatherData.latestSolData.sol;
    const roverName = "curiosity";
    
    // Note: Photo manager will be initialized by the main app
    // This is just for reference - the actual initialization happens in main.js
  }

  formattedDate(dateString) {
    const date = new Date(dateString);
    const options = { month: "long", day: "numeric", year: "numeric" };
    const formatted = date.toLocaleDateString("en-US", options);

    const day = date.getDate();
    let suffix = "th";

    if (day < 10 || day > 20) {
      switch (day % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
        default:
          suffix = "th";
          break;
      }
    }

    return formatted.replace(/\d{1,2}/, day + suffix);
  }

  updateDataFreshness() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const dateString = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    document.getElementById("lastUpdateTime").innerText = `${dateString} ${timeString}`;
  }

  showErrorState() {
    document.getElementById("solDate").innerText = "ERROR";
    document.getElementById("earthDate").innerText = "Unable to connect to Mars";
    document.getElementById("highTemperature").innerText = "--°F";
    document.getElementById("lowTemperature").innerText = "--°F";
    document.getElementById("pressure").innerText = "--- Pa";
    document.getElementById("sunrise").innerText = "--:-- LMST";
    document.getElementById("sunset").innerText = "--:-- LMST";
    document.getElementById("lastUpdateTime").innerText = "ERROR";
  }

  checkWeatherAlerts(weatherData) {
    if (!weatherData || !weatherData.latestSolData) return;
    
    const { max_temp, min_temp, pressure, atmo_opacity, wind_speed } = weatherData.latestSolData;
    
    // Clear all alerts
    document.querySelectorAll('.alert-led').forEach(led => led.classList.remove('active'));
    
    let activeAlerts = 0;
    
    // Check for dust storm (high atmospheric opacity)
    if (atmo_opacity && parseFloat(atmo_opacity) > 0.8) {
      document.getElementById('dustAlert').classList.add('active');
      activeAlerts++;
    }
    
    // Check for extreme temperatures
    const maxTemp = parseFloat(max_temp);
    const minTemp = parseFloat(min_temp);
    if (maxTemp > 50 || minTemp < -100) {
      document.getElementById('tempAlert').classList.add('active');
      activeAlerts++;
    }
    
    // Check for low pressure
    if (pressure && parseFloat(pressure) < 700) {
      document.getElementById('pressureAlert').classList.add('active');
      activeAlerts++;
    }
    
    // Check for high winds
    if (wind_speed && parseFloat(wind_speed) > 20) {
      document.getElementById('windAlert').classList.add('active');
      activeAlerts++;
    }
    
    // Update alert status
    const alertStatus = document.getElementById('alertStatus');
    if (activeAlerts > 0) {
      alertStatus.textContent = `${activeAlerts} ALERT${activeAlerts > 1 ? 'S' : ''}`;
      alertStatus.style.color = 'var(--accent-orange)';
    } else {
      alertStatus.textContent = 'STANDBY';
      alertStatus.style.color = 'var(--accent-green)';
    }
  }

  getChartDataForPeriod(data, period) {
    const daysToShow = Math.min(period, data.length);
    return data.slice(0, daysToShow);
  }

  renderTemperatureAnalysis(data) {
    const scrollContainer = document.getElementById('temperatureScroll');
    scrollContainer.innerHTML = '';
    
    if (!data || data.length === 0) {
      scrollContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No temperature data available</div>';
      return;
    }
    
    // Calculate summary statistics
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const avgHigh = Math.round(highs.reduce((a, b) => a + b, 0) / highs.length);
    const avgLow = Math.round(lows.reduce((a, b) => a + b, 0) / lows.length);
    const tempRange = avgHigh - avgLow;
    const highestTemp = Math.max(...highs);
    const lowestTemp = Math.min(...lows);
    
    // Calculate trend
    const firstAvg = (data[0].high + data[0].low) / 2;
    const lastAvg = (data[data.length - 1].high + data[data.length - 1].low) / 2;
    const trend = lastAvg - firstAvg;
    
    // Update summary values
    document.getElementById("avgHigh").textContent = `${avgHigh}°F`;
    document.getElementById("avgLow").textContent = `${avgLow}°F`;
    document.getElementById("tempRange").textContent = `${tempRange}°F`;
    document.getElementById("highestTemp").textContent = `${highestTemp}°F`;
    document.getElementById("lowestTemp").textContent = `${lowestTemp}°F`;
    
    // Update trend
    const trendElement = document.getElementById("trendValue");
    if (trend > 2) {
      trendElement.textContent = 'WARMING';
      trendElement.className = 'trend-value warming';
    } else if (trend < -2) {
      trendElement.textContent = 'COOLING';
      trendElement.className = 'trend-value cooling';
    } else {
      trendElement.textContent = 'STABLE';
      trendElement.className = 'trend-value';
    }
    
    // Calculate the temperature range for the selected period
    const periodMin = Math.min(...lows);
    const periodMax = Math.max(...highs);
    const periodRange = periodMax - periodMin;
    
    // Render temperature days in reverse order (most recent at bottom)
    const reversedData = [...data].reverse();
    reversedData.forEach((day, index) => {
      const dayElement = this.createTemperatureDay(day, reversedData.length - index - 1, periodMin, periodMax, periodRange);
      scrollContainer.appendChild(dayElement);
    });
    
    // Scroll to bottom (most recent) after a short delay
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 100);
  }

  createTemperatureDay(day, index, periodMin, periodMax, periodRange) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'temp-day';
    
    // Calculate temperature bar position relative to the period's range
    const dayLow = day.low;
    const dayHigh = day.high;
    
    // Calculate the position of the low and high within the period range
    const lowPosition = ((dayLow - periodMin) / periodRange) * 100;
    const highPosition = ((dayHigh - periodMin) / periodRange) * 100;
    
    // Ensure positions are within bounds (0-100)
    const clampedLowPosition = Math.max(0, Math.min(100, lowPosition));
    const clampedHighPosition = Math.max(0, Math.min(100, highPosition));
    
    // Format the day label
    const dayLabel = index === 0 ? 'TODAY' : `DAY ${index + 1}`;
    
    dayDiv.innerHTML = `
      <div class="day-info">
        <div class="day-label">Sol ${day.sol}</div>
        <div class="day-date">${dayLabel}</div>
      </div>
      <div class="temp-readings">
        <div class="temp-reading">
          <div class="temp-type">LOW</div>
          <div class="temp-value low">${day.low}°F</div>
        </div>
        <div class="temp-bar">
          <div class="temp-bar-fill" style="width: ${clampedHighPosition - clampedLowPosition}%; margin-left: ${clampedLowPosition}%"></div>
        </div>
        <div class="temp-reading">
          <div class="temp-type">HIGH</div>
          <div class="temp-value high">${day.high}°F</div>
        </div>
      </div>
    `;
    
    return dayDiv;
  }
} 