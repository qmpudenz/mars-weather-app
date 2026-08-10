// Weather Module
export class WeatherManager {
  constructor() {
    this.temperatureData = [];
    this.currentChartPeriod = 7;
    this.currentChartMode = 'line';
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

  setChartMode(mode) {
    if (!['line', 'bar', 'radar', 'multi'].includes(mode)) return;
    this.currentChartMode = mode;
    const chartData = this.getChartDataForPeriod(this.temperatureData, this.currentChartPeriod);
    this.renderTemperatureAnalysis(chartData);
  }

  renderTemperatureAnalysis(data) {
    const scrollContainer = document.getElementById('temperatureScroll');
    scrollContainer.parentElement?.querySelector('.chart-tooltip')?.remove();
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
    
    scrollContainer.dataset.mode = this.currentChartMode;
    scrollContainer.setAttribute('aria-label', `${this.currentChartMode} temperature chart`);

    if (this.currentChartMode === 'line') {
      const periodMin = Math.min(...lows);
      const periodMax = Math.max(...highs);
      const periodRange = Math.max(1, periodMax - periodMin);
      const reversedData = [...data].reverse();

      reversedData.forEach((day, index) => {
        const dayElement = this.createTemperatureDay(
          day,
          reversedData.length - index - 1,
          periodMin,
          periodMax,
          periodRange
        );
        scrollContainer.appendChild(dayElement);
      });

      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
      return;
    }

    const chart = this.createChart(data, this.currentChartMode);
    scrollContainer.appendChild(chart);
    this.setupChartTooltips(chart, scrollContainer);
  }

  createChart(data, mode) {
    const orderedData = [...data].reverse();
    const width = 900;
    const height = 360;
    const padding = { top: 30, right: 30, bottom: 55, left: 65 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const values = orderedData.flatMap(day => [day.low, day.high]).filter(Number.isFinite);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const min = Math.floor((rawMin - 5) / 10) * 10;
    const max = Math.ceil((rawMax + 5) / 10) * 10;
    const range = Math.max(1, max - min);
    const edgeInset = ['bar', 'multi'].includes(mode)
      ? Math.max(22, Math.min(42, plotWidth / (orderedData.length * 2)))
      : 0;
    const usableWidth = plotWidth - edgeInset * 2;
    const x = index => padding.left + edgeInset + (orderedData.length === 1
      ? usableWidth / 2
      : index * usableWidth / (orderedData.length - 1));
    const y = value => padding.top + (max - value) / range * plotHeight;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', `temperature-chart chart-${mode}`);
    svg.setAttribute('role', 'img');

    const gridLines = Array.from({ length: 5 }, (_, index) => {
      const value = max - index * range / 4;
      const lineY = padding.top + index * plotHeight / 4;
      return `<line class="chart-grid" x1="${padding.left}" y1="${lineY}" x2="${width - padding.right}" y2="${lineY}" />
        <text class="chart-axis-label" x="${padding.left - 12}" y="${lineY + 4}" text-anchor="end">${Math.round(value)}°</text>`;
    }).join('');

    const labelStep = Math.max(1, Math.ceil(orderedData.length / 8));
    const xLabels = orderedData.map((day, index) => index % labelStep === 0 || index === orderedData.length - 1
      ? `<text class="chart-axis-label" x="${x(index)}" y="${height - 20}" text-anchor="middle">Sol ${day.sol}</text>`
      : '').join('');

    const point = (day, index, type) => `<circle class="chart-point ${type}" cx="${x(index)}" cy="${y(day[type])}" r="4" tabindex="0" data-series="${type}" data-tooltip="Sol ${day.sol} · ${type.toUpperCase()} ${day[type]}°F"/>`;
    const line = type => `<polyline class="chart-line ${type}" points="${orderedData.map((day, index) => `${x(index)},${y(day[type])}`).join(' ')}" />${orderedData.map((day, index) => point(day, index, type)).join('')}`;
    const barWidth = Math.max(5, Math.min(28, plotWidth / orderedData.length / 3));
    const bars = orderedData.map((day, index) => `<g class="chart-bar-group">
      <rect class="chart-bar low" x="${x(index) - barWidth - 2}" y="${y(day.low)}" width="${barWidth}" height="${padding.top + plotHeight - y(day.low)}" tabindex="0" data-series="low" data-tooltip="Sol ${day.sol} · LOW ${day.low}°F"/>
      <rect class="chart-bar high" x="${x(index) + 2}" y="${y(day.high)}" width="${barWidth}" height="${padding.top + plotHeight - y(day.high)}" tabindex="0" data-series="high" data-tooltip="Sol ${day.sol} · HIGH ${day.high}°F"/>
    </g>`).join('');

    let marks = '';
    if (mode === 'line') {
      marks = line('high') + line('low');
    } else if (mode === 'bar') {
      marks = bars;
    } else if (mode === 'multi') {
      const rangeArea = orderedData.map((day, index) => `${x(index)},${y(day.high)}`)
        .concat([...orderedData].reverse().map((day, reverseIndex) => `${x(orderedData.length - reverseIndex - 1)},${y(day.low)}`)).join(' ');
      const averageLine = `<polyline class="chart-line average" points="${orderedData.map((day, index) => `${x(index)},${y((day.high + day.low) / 2)}`).join(' ')}" />`;
      marks = `<polygon class="chart-range-area" points="${rangeArea}" />${bars}${averageLine}`;
    } else {
      marks = this.createRadarMarks(orderedData, width, height, min, range);
    }

    const legend = `<g class="chart-legend" transform="translate(${width - 245} 15)">
      <circle class="legend-swatch low" cx="0" cy="0" r="5"/><text x="10" y="4">LOW</text>
      <circle class="legend-swatch high" cx="70" cy="0" r="5"/><text x="80" y="4">HIGH</text>
      ${mode === 'multi' ? '<circle class="legend-swatch average" cx="155" cy="0" r="5"/><text x="165" y="4">AVG</text>' : ''}
    </g>`;

    svg.innerHTML = mode === 'radar'
      ? `<title>Mars temperature radar chart</title>${marks}${legend}`
      : `<title>Mars temperature ${mode} chart</title>${gridLines}${xLabels}${marks}${legend}`;
    return svg;
  }

  setupChartTooltips(svg, scrollContainer) {
    const viewport = scrollContainer.parentElement;
    if (!viewport) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-hidden', 'true');
    viewport.appendChild(tooltip);

    const hideTooltip = () => {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    };

    const showTooltip = (target, clientX, clientY) => {
      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const anchorX = clientX ?? targetRect.left + targetRect.width / 2;
      const anchorY = clientY ?? targetRect.top;

      tooltip.textContent = target.dataset.tooltip;
      tooltip.dataset.series = target.dataset.series;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');

      const left = Math.max(8, Math.min(
        anchorX - viewportRect.left - tooltip.offsetWidth / 2,
        viewportRect.width - tooltip.offsetWidth - 8
      ));
      const top = Math.max(8, anchorY - viewportRect.top - tooltip.offsetHeight - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-tooltip]').forEach(target => {
      target.addEventListener('mouseenter', event => showTooltip(target, event.clientX, event.clientY));
      target.addEventListener('mousemove', event => showTooltip(target, event.clientX, event.clientY));
      target.addEventListener('mouseleave', hideTooltip);
      target.addEventListener('focus', () => showTooltip(target));
      target.addEventListener('blur', hideTooltip);
    });
  }

  createRadarMarks(data, width, height, min, range) {
    const radarData = data.slice(-Math.min(12, data.length));
    const centerX = width / 2;
    const centerY = height / 2 + 5;
    const radius = 125;
    const angle = index => -Math.PI / 2 + index * Math.PI * 2 / radarData.length;
    const position = (index, distance) => [centerX + Math.cos(angle(index)) * distance, centerY + Math.sin(angle(index)) * distance];
    const polygon = (type) => radarData.map((day, index) => {
      const normalized = (day[type] - min) / range;
      return position(index, 25 + normalized * (radius - 25)).join(',');
    }).join(' ');
    const rings = [0.25, 0.5, 0.75, 1].map(scale => `<polygon class="radar-grid" points="${radarData.map((_, index) => position(index, radius * scale).join(',')).join(' ')}" />`).join('');
    const axes = radarData.map((day, index) => {
      const [axisX, axisY] = position(index, radius);
      const [labelX, labelY] = position(index, radius + 20);
      return `<line class="chart-grid" x1="${centerX}" y1="${centerY}" x2="${axisX}" y2="${axisY}"/><text class="chart-axis-label" x="${labelX}" y="${labelY + 4}" text-anchor="middle">${day.sol}</text>`;
    }).join('');
    const radarPoints = ['high', 'low'].map(type => radarData.map((day, index) => {
      const normalized = (day[type] - min) / range;
      const [pointX, pointY] = position(index, 25 + normalized * (radius - 25));
      return `<circle class="radar-point ${type}" cx="${pointX}" cy="${pointY}" r="5" tabindex="0" data-series="${type}" data-tooltip="Sol ${day.sol} · ${type.toUpperCase()} ${day[type]}°F"/>`;
    }).join('')).join('');
    return `${rings}${axes}<polygon class="radar-shape high" points="${polygon('high')}"/><polygon class="radar-shape low" points="${polygon('low')}"/>${radarPoints}`;
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
