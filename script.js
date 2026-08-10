document.addEventListener("DOMContentLoaded", () => {
  // Initialize event listeners for photo navigation
  const prevBtn = document.getElementById("previous-photo");
  const nextBtn = document.getElementById("next-photo");
  
  if (prevBtn) {
    prevBtn.addEventListener("click", () => showPreviousPhoto(photos));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => showNextPhoto(photos));
  }

  // Initialize interactive controls
  initializeAlertSystem();
  initializeStreamToggle();
  initializeChartModeSelector();
  initializePeriodSelector();

  // Initialize weather data
  getMarsWeather();
  
  // Initialize modal functionality
  initializeModal();
});

// Global variables
let currentChartPeriod = 7;
let temperatureData = [];
let currentChartMode = 'line';
let streamActive = false;
let autoRefreshInterval = null;

// Alert System
function initializeAlertSystem() {
  const alertLeds = document.querySelectorAll('.alert-led');
  
  alertLeds.forEach(led => {
    led.addEventListener('click', () => {
      const alertType = led.getAttribute('data-alert');
      showAlertDetails(alertType);
    });
  });
}

function checkWeatherAlerts(weatherData) {
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

function showAlertDetails(alertType) {
  const alertMessages = {
    dust: 'DUST STORM DETECTED\nHigh atmospheric opacity indicates dust storm conditions. Reduced visibility and potential equipment interference.',
    temp: 'EXTREME TEMPERATURE\nTemperatures outside normal operating range. Equipment may require thermal protection protocols.',
    pressure: 'LOW PRESSURE WARNING\nAtmospheric pressure below normal levels. May indicate weather system or equipment malfunction.',
    wind: 'HIGH WIND ALERT\nWind speeds exceeding safety thresholds. Potential for equipment damage or data interference.'
  };
  
  alert(alertMessages[alertType] || 'Alert details not available.');
}

// Live Data Stream Toggle
function initializeStreamToggle() {
  const streamToggle = document.getElementById('streamToggle');
  
  streamToggle.addEventListener('click', () => {
    streamActive = !streamActive;
    streamToggle.classList.toggle('active');
    
    if (streamActive) {
      // Start auto-refresh every 30 seconds
      autoRefreshInterval = setInterval(() => {
        getMarsWeather();
      }, 30000);
    } else {
      // Stop auto-refresh
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    }
  });
}

// Chart Mode Selector
function initializeChartModeSelector() {
  const rotaryDial = document.querySelector('.rotary-dial');
  const dialPositions = document.querySelectorAll('.dial-position');
  const dialIndicator = document.querySelector('.dial-indicator');
  
  let currentPosition = 0;
  const positions = ['line', 'bar', 'radar', 'multi'];
  
  rotaryDial.addEventListener('click', () => {
    // Rotate to next position
    currentPosition = (currentPosition + 1) % 4;
    const rotation = currentPosition * 90;
    
    // Update indicator position
    dialIndicator.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    
    // Update active position
    dialPositions.forEach((pos, index) => {
      pos.classList.toggle('active', index === currentPosition);
    });
    
    // Update chart mode
    currentChartMode = positions[currentPosition];
    
    // Re-render temperature analysis with new mode
    if (temperatureData.length > 0) {
      renderTemperatureAnalysis(getChartDataForPeriod(temperatureData, currentChartPeriod));
    }
    
    // Play click sound effect (optional)
    playClickSound();
  });
  
  // Set initial position
  dialPositions[0].classList.add('active');
}

// Initialize period selector
function initializePeriodSelector() {
  const periodBtns = document.querySelectorAll('.period-btn');
  
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      periodBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Update chart period
      currentChartPeriod = parseInt(btn.getAttribute('data-period'));
      
      // Re-render temperature analysis with new period
      if (temperatureData.length > 0) {
        renderTemperatureAnalysis(getChartDataForPeriod(temperatureData, currentChartPeriod));
      }
    });
  });
}

function playClickSound() {
  // Create a simple click sound effect
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

function getChartDataForPeriod(data, period) {
  const daysToShow = Math.min(period, data.length);
  return data.slice(0, daysToShow);
}

async function getMarsWeather() {
  try {
    const data = await fetchData();
    await displayWeatherData(data);
    
    // Update data freshness timestamp
    updateDataFreshness();
  } catch (error) {
    console.error("Error:", error);
    // Show error state in UI
    showErrorState();
  }
}

function updateDataFreshness() {
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

function showErrorState() {
  document.getElementById("solDate").innerText = "ERROR";
  document.getElementById("earthDate").innerText = "Unable to connect to Mars";
  document.getElementById("highTemperature").innerText = "--°F";
  document.getElementById("lowTemperature").innerText = "--°F";
  document.getElementById("pressure").innerText = "--- Pa";
  document.getElementById("sunrise").innerText = "--:-- LMST";
  document.getElementById("sunset").innerText = "--:-- LMST";
  document.getElementById("lastUpdateTime").innerText = "ERROR";
}

async function displayWeatherData(weatherData) {
  if (!weatherData || !weatherData.latestSolData) {
    showErrorState();
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

  function formattedDate(dateString) {
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

  // Update UI with weather data
  document.getElementById("solDate").innerText = solDate;
  document.getElementById("earthDate").innerText = formattedDate(earthDate);
  document.getElementById("highTemperature").innerText = highTemperature + "°F";
  document.getElementById("lowTemperature").innerText = lowTemperature + "°F";
  document.getElementById("pressure").innerText = pressure;
  document.getElementById("sunrise").innerText = sunrise;
  document.getElementById("sunset").innerText = sunset;

  // Prepare temperature chart data
  temperatureData = weatherData.solData.map((solData) => {
    const highTemp = parseInt(solData.max_temp);
    const lowTemp = parseInt(solData.min_temp);
    return {
      sol: solData.sol,
      high: highTemp,
      low: lowTemp,
    };
  });

  // Render temperature analysis
  const chartData = getChartDataForPeriod(temperatureData, currentChartPeriod);
  renderTemperatureAnalysis(chartData);

  // Check for weather alerts
  checkWeatherAlerts(weatherData);

  // Initialize rover photos
  const sol = weatherData.latestSolData.sol;
  const roverName = "curiosity";
  
  try {
    const fetchedPhotos = await fetchRoverPhotos(sol, roverName);
    photos = fetchedPhotos;
    console.log('Fetched photos:', photos.length); // Debug log
    
    // Initialize camera buttons after all photos are fetched
    initializeCameraButtons();
    // Reset camera buttons initialization flag and display photos
    window.cameraButtonsInitialized = false;
    displayRoverPhotos(photos);
  } catch (error) {
    console.error("Error loading rover photos:", error);
    displayRoverPhotos([]);
  }
}

function renderTemperatureAnalysis(data) {
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
  document.getElementById('avgHigh').textContent = `${avgHigh}°F`;
  document.getElementById('avgLow').textContent = `${avgLow}°F`;
  document.getElementById('tempRange').textContent = `${tempRange}°F`;
  document.getElementById('highestTemp').textContent = `${highestTemp}°F`;
  document.getElementById('lowestTemp').textContent = `${lowestTemp}°F`;
  
  // Update trend
  const trendElement = document.getElementById('trendValue');
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
    const dayElement = createTemperatureDay(day, reversedData.length - index - 1, periodMin, periodMax, periodRange);
    scrollContainer.appendChild(dayElement);
  });
  
  // Scroll to bottom (most recent) after a short delay
  setTimeout(() => {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, 100);
}

function createTemperatureDay(day, index, periodMin, periodMax, periodRange) {
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

async function fetchRoverPhotos(sol, roverName) {
  const apiKey = "DB6sVUROk8cG7IvNWDC11xZL5U3NLIHGLEsAK6jo";
  
  // Try multiple sols to find one with good photo diversity
  const solsToTry = [sol, sol - 1, sol - 2, sol - 3, sol - 4, sol - 5];
  
  for (const currentSol of solsToTry) {
    if (currentSol < 0) continue; // Skip negative sols
    
    const apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?sol=${currentSol}&api_key=${apiKey}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.photos && data.photos.length > 0) {
        console.log(`Found ${data.photos.length} photos from sol ${currentSol}`);
        return data.photos;
      }
    } catch (error) {
      console.error(`Error fetching photos from sol ${currentSol}:`, error);
    }
  }
  
  console.log('No photos found from any sol');
  return [];
}

let photos = [];
let currentPhotoIndex = 0;
let filteredPhotos = [];
let currentCameraFilter = 'ALL';

function displayRoverPhotos(photos) {
  const roverPhotosDiv = document.getElementById("rover-photos");
  const imageLoading = document.getElementById("imageLoading");
  const thumbnailGallery = document.getElementById("thumbnailGallery");
  
  // Clear previous content
  roverPhotosDiv.innerHTML = "";
  thumbnailGallery.innerHTML = "";
  
  if (!photos || photos.length === 0) {
    roverPhotosDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-family: \'Share Tech Mono\', monospace; padding: 20px;">No images available</div>';
    updateImageCounter(0, 0);
    updateImageInfo(null);
    return;
  }
  
  // Apply camera filter
  filteredPhotos = currentCameraFilter === 'ALL' 
    ? photos 
    : photos.filter(photo => photo.camera.name.toUpperCase() === currentCameraFilter);
  
  // Reset to first image if current index is out of bounds
  if (currentPhotoIndex >= filteredPhotos.length) {
    currentPhotoIndex = 0;
  }
  
  // Update image counter
  updateImageCounter(currentPhotoIndex + 1, filteredPhotos.length);
  
  // Show loading state
  imageLoading.style.display = 'flex';
  
  if (filteredPhotos.length === 0) {
    roverPhotosDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-family: \'Share Tech Mono\', monospace; padding: 20px;">No images for selected camera</div>';
    imageLoading.style.display = 'none';
    updateImageInfo(null);
    return;
  }
  
  // Create main image
  const img = document.createElement("img");
  img.src = filteredPhotos[currentPhotoIndex].img_src;
  img.alt = `Rover photo taken on Sol ${filteredPhotos[currentPhotoIndex].sol}`;
  img.className = "rover-photo";
  
  // Add loading state
  img.addEventListener('load', () => {
    img.style.opacity = '1';
    imageLoading.style.display = 'none';
    updateImageInfo(filteredPhotos[currentPhotoIndex]);
  });
  
  img.addEventListener('error', () => {
    img.alt = 'Image failed to load';
    img.style.opacity = '0.5';
    imageLoading.style.display = 'none';
    updateImageInfo(filteredPhotos[currentPhotoIndex]);
  });
  
  img.style.opacity = '0.7';
  img.style.transition = 'opacity 0.3s ease';

  img.addEventListener("click", () => {
    fullscreenPhoto();
  });

  roverPhotosDiv.appendChild(img);
  
  // Create thumbnail gallery with filtered photos
  createThumbnailGallery(filteredPhotos);
}

function createThumbnailGallery(photos) {
  const thumbnailGallery = document.getElementById("thumbnailGallery");
  
  photos.forEach((photo, index) => {
    const thumbnailItem = document.createElement("div");
    thumbnailItem.className = `thumbnail-item ${index === currentPhotoIndex ? 'active' : ''}`;
    
    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = photo.img_src;
    thumbnailImg.alt = `Thumbnail ${index + 1}`;
    thumbnailImg.loading = "lazy";
    
    thumbnailItem.appendChild(thumbnailImg);
    
    thumbnailItem.addEventListener("click", () => {
      currentPhotoIndex = index;
      // Re-display with the same filtered photos array
      displayRoverPhotosWithFilter(photos);
    });
    
    thumbnailGallery.appendChild(thumbnailItem);
  });
}

function displayRoverPhotosWithFilter(photos) {
  const roverPhotosDiv = document.getElementById("rover-photos");
  const imageLoading = document.getElementById("imageLoading");
  
  // Clear previous content
  roverPhotosDiv.innerHTML = "";
  
  if (!photos || photos.length === 0) {
    roverPhotosDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-family: \'Share Tech Mono\', monospace; padding: 20px;">No images available</div>';
    updateImageCounter(0, 0);
    updateImageInfo(null);
    return;
  }
  
  // Update image counter
  updateImageCounter(currentPhotoIndex + 1, photos.length);
  
  // Show loading state
  imageLoading.style.display = 'flex';
  
  if (photos.length === 0) {
    roverPhotosDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-family: \'Share Tech Mono\', monospace; padding: 20px;">No images for selected camera</div>';
    imageLoading.style.display = 'none';
    updateImageInfo(null);
    return;
  }
  
  // Create main image
  const img = document.createElement("img");
  img.src = photos[currentPhotoIndex].img_src;
  img.alt = `Rover photo taken on Sol ${photos[currentPhotoIndex].sol}`;
  img.className = "rover-photo";
  
  // Add loading state
  img.addEventListener('load', () => {
    img.style.opacity = '1';
    imageLoading.style.display = 'none';
    updateImageInfo(photos[currentPhotoIndex]);
  });
  
  img.addEventListener('error', () => {
    img.alt = 'Image failed to load';
    img.style.opacity = '0.5';
    imageLoading.style.display = 'none';
    updateImageInfo(photos[currentPhotoIndex]);
  });
  
  img.style.opacity = '0.7';
  img.style.transition = 'opacity 0.3s ease';

  img.addEventListener("click", () => {
    fullscreenPhoto();
  });

  roverPhotosDiv.appendChild(img);
}

function updateImageCounter(current, total) {
  document.getElementById("currentImage").textContent = current;
  document.getElementById("totalImages").textContent = total;
}

function updateImageInfo(photo) {
  if (!photo) {
    document.getElementById("cameraInfo").textContent = "--";
    return;
  }
  
  // Format camera name (show full name if available, otherwise short name)
  const cameraName = photo.camera.full_name || photo.camera.name;
  document.getElementById("cameraInfo").textContent = cameraName.toUpperCase();
}

function fullscreenPhoto() {
  if (!filteredPhotos || filteredPhotos.length === 0) return;
  
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalImage");
  const captionText = document.getElementById("modalCaption");

  modal.style.display = "block";
  modalImg.src = filteredPhotos[currentPhotoIndex].img_src;
  
  const photo = filteredPhotos[currentPhotoIndex];
  captionText.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; text-align: left;">
      <div><strong>ROVER:</strong> ${photo.rover.name.toUpperCase()}</div>
      <div><strong>SOL:</strong> ${photo.sol}</div>
      <div><strong>EARTH DATE:</strong> ${photo.earth_date}</div>
      <div><strong>CAMERA:</strong> ${photo.camera.full_name || photo.camera.name}</div>
    </div>
  `;
}

function showNextPhoto() {
  if (!filteredPhotos || filteredPhotos.length === 0) return;
  currentPhotoIndex = (currentPhotoIndex + 1) % filteredPhotos.length;
  displayRoverPhotosWithFilter(filteredPhotos);
}

function showPreviousPhoto() {
  if (!filteredPhotos || filteredPhotos.length === 0) return;
  currentPhotoIndex = (currentPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
  displayRoverPhotosWithFilter(filteredPhotos);
}

function initializeModal() {
  const modal = document.getElementById("photoModal");
  const closeModal = document.querySelector(".close-modal");

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // Close modal on escape key or clicking outside
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.style.display === "block") {
      modal.style.display = "none";
    }
  });

  // Close modal when clicking outside the modal content
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Navigation buttons
  const prevBtn = document.getElementById("previous-photo");
  const nextBtn = document.getElementById("next-photo");

  if (prevBtn) {
    prevBtn.addEventListener("click", showPreviousPhoto);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", showNextPhoto);
  }
}

function initializeRoverFilter() {
  const roverParts = document.querySelectorAll('.rover-part');
  const activeFilterElement = document.getElementById('activeFilter');
  
  roverParts.forEach(part => {
    part.addEventListener('click', () => {
      const camera = part.getAttribute('data-camera');
      
      // Update active state
      roverParts.forEach(p => p.classList.remove('active'));
      part.classList.add('active');
      
      // Update filter
      currentCameraFilter = camera;
      activeFilterElement.textContent = camera;
      
      // Reset to first image and redisplay
      currentPhotoIndex = 0;
      displayRoverPhotos(photos);
    });
    
    part.addEventListener('mouseenter', () => {
      const camera = part.getAttribute('data-camera');
      activeFilterElement.textContent = camera;
    });
    
    part.addEventListener('mouseleave', () => {
      activeFilterElement.textContent = currentCameraFilter;
    });
  });
  
  // Add "All Cameras" functionality
  const roverBody = document.querySelector('.rover-body');
  roverBody.addEventListener('click', (e) => {
    if (e.target === roverBody) {
      roverParts.forEach(p => p.classList.remove('active'));
      currentCameraFilter = 'ALL';
      activeFilterElement.textContent = 'ALL CAMERAS';
      currentPhotoIndex = 0;
      displayRoverPhotos(photos);
    }
  });
}

function updateCameraFilterButtons(availableCameras) {
  const cameraButtonsContainer = document.querySelector('.camera-buttons');
  
  // Clear existing buttons
  cameraButtonsContainer.innerHTML = '';
  
  // Always add ALL button
  const allButton = document.createElement('button');
  allButton.className = 'camera-btn active';
  allButton.setAttribute('data-camera', 'ALL');
  allButton.textContent = 'ALL';
  cameraButtonsContainer.appendChild(allButton);
  
  // Add buttons for available cameras
  availableCameras.forEach(camera => {
    const button = document.createElement('button');
    button.className = 'camera-btn';
    button.setAttribute('data-camera', camera);
    button.textContent = camera;
    cameraButtonsContainer.appendChild(button);
  });
  
  // Initialize event listeners (only once)
  initializeCameraFilter();
}

function initializeCameraFilter() {
  const cameraButtons = document.querySelectorAll('.camera-btn');
  const activeFilterElement = document.getElementById('activeFilter');
  
  // Remove existing event listeners to prevent duplicates
  cameraButtons.forEach(button => {
    button.removeEventListener('click', handleCameraFilterClick);
  });
  
  // Add new event listeners
  cameraButtons.forEach(button => {
    button.addEventListener('click', handleCameraFilterClick);
  });
}

function handleCameraFilterClick(event) {
  const button = event.currentTarget;
  const camera = button.getAttribute('data-camera');
  
  // Update active state
  const cameraButtons = document.querySelectorAll('.camera-btn');
  cameraButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  
  // Update filter
  currentCameraFilter = camera;
  const activeFilterElement = document.getElementById('activeFilter');
  activeFilterElement.textContent = camera === 'ALL' ? 'ALL CAMERAS' : camera;
  
  // Reset to first image and redisplay with filtered photos
  currentPhotoIndex = 0;
  
  // Apply camera filter
  filteredPhotos = currentCameraFilter === 'ALL' 
    ? photos 
    : photos.filter(photo => photo.camera.name.toUpperCase() === currentCameraFilter);
  
  // Display filtered photos
  displayRoverPhotosWithFilter(filteredPhotos);
}

function initializeCameraButtons() {
  if (!photos || photos.length === 0) return;
  
  const availableCameras = [...new Set(photos.map(photo => photo.camera.name.toUpperCase()))];
  console.log('Available cameras:', availableCameras);
  console.log('Camera counts:', availableCameras.map(cam => ({
    camera: cam,
    count: photos.filter(p => p.camera.name.toUpperCase() === cam).length
  })));
  
  // Also log a few sample photos to see the camera name structure
  console.log('Sample photos:', photos.slice(0, 3).map(p => ({
    camera: p.camera.name,
    camera_upper: p.camera.name.toUpperCase()
  })));
  
  // Update camera filter buttons based on available cameras
  updateCameraFilterButtons(availableCameras);
}

// Initialize rover photos
const sol = 1000;
const roverName = "curiosity";

fetchRoverPhotos(sol, roverName).then((fetchedPhotos) => {
  photos = fetchedPhotos.reverse();
  displayRoverPhotos(photos);
}).catch(error => {
  console.error("Error loading rover photos:", error);
  photos = [];
  displayRoverPhotos([]);
});
