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

  // Initialize weather data
  getMarsWeather();
  
  // Initialize modal functionality
  initializeModal();
});

async function getMarsWeather() {
  try {
    const data = await fetchData();
    displayWeatherData(data);
  } catch (error) {
    console.error("Error:", error);
    // Show error state in UI
    showErrorState();
  }
}

function showErrorState() {
  document.getElementById("solDate").innerText = "ERROR";
  document.getElementById("earthDate").innerText = "Unable to connect to Mars";
  document.getElementById("highTemperature").innerText = "--°F";
  document.getElementById("lowTemperature").innerText = "--°F";
  document.getElementById("pressure").innerText = "--- Pa";
  document.getElementById("sunrise").innerText = "--:-- LMST";
  document.getElementById("sunset").innerText = "--:-- LMST";
}

function displayWeatherData(weatherData) {
  if (!weatherData || !weatherData.latestSolData) {
    console.error("Error: Invalid weather data");
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
  const temperatureData = weatherData.solData.map((solData) => {
    const highTemp = parseInt(solData.max_temp);
    const lowTemp = parseInt(solData.min_temp);

    return {
      sol: parseInt(solData.sol),
      high: highTemp,
      low: lowTemp,
    };
  });

  const lastSevenDaysData = temperatureData.slice(0, 7);
  const lastSevenDaysReverseData = lastSevenDaysData.reverse();
  renderTemperatureChart(lastSevenDaysReverseData);
}

function renderTemperatureChart(temperatureData) {
  const ctx = document.getElementById("temperatureChart").getContext("2d");
  
  // Destroy existing chart if it exists
  if (window.temperatureChart instanceof Chart) {
    window.temperatureChart.destroy();
  }
  
  window.temperatureChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: temperatureData.map((data) => {
        const label = data.sol ? `Sol ${data.sol}` : "undefined";
        return label;
      }),

      datasets: [
        {
          label: "High Temperature",
          data: temperatureData.map((data) => data.high),
          backgroundColor: "rgba(255, 107, 53, 0.1)",
          borderColor: "#FF6B35",
          borderWidth: 3,
          pointBackgroundColor: "#FF6B35",
          pointBorderColor: "#FF6B35",
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.3,
        },
        {
          label: "Low Temperature",
          data: temperatureData.map((data) => data.low),
          backgroundColor: "rgba(0, 212, 255, 0.1)",
          borderColor: "#00D4FF",
          borderWidth: 3,
          pointBackgroundColor: "#00D4FF",
          pointBorderColor: "#00D4FF",
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        title: {
          display: true,
          text: "7-DAY TEMPERATURE ANALYSIS",
          font: {
            family: "'Orbitron', monospace",
            size: 16,
            weight: '700'
          },
          color: "#00D4FF",
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 20, 25, 0.95)",
          titleFont: {
            family: "'Share Tech Mono', monospace",
            size: 14,
          },
          bodyFont: {
            family: "'Share Tech Mono', monospace",
            size: 13,
          },
          titleColor: "#00D4FF",
          bodyColor: "#ffffff",
          borderColor: "#2a2a2a",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          cornerRadius: 8,
        },
        legend: {
          display: true,
          position: "bottom",
          labels: {
            font: {
              family: "'Share Tech Mono', monospace",
              size: 12,
            },
            padding: 20,
            color: "#b0b0b0",
            usePointStyle: true,
            pointStyle: 'circle'
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
            borderColor: "#2a2a2a",
          },
          ticks: {
            font: {
              family: "'Share Tech Mono', monospace",
              size: 11,
            },
            color: "#b0b0b0",
            padding: 10,
          },
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
            borderColor: "#2a2a2a",
          },
          ticks: {
            font: {
              family: "'Share Tech Mono', monospace",
              size: 11,
            },
            color: "#b0b0b0",
            padding: 10,
            callback: function (value) {
              return value + "°F";
            },
          },
        },
      },
    },
  });
}

async function fetchRoverPhotos(sol, roverName) {
  const apiKey = "DB6sVUROk8cG7IvNWDC11xZL5U3NLIHGLEsAK6jo";
  const apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?sol=${sol}&api_key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.photos || [];
  } catch (error) {
    console.error("Error fetching rover photos:", error);
    return [];
  }
}

let photos = [];
let currentPhotoIndex = 0;

function displayRoverPhotos(photos) {
  const roverPhotosDiv = document.getElementById("rover-photos");
  roverPhotosDiv.innerHTML = "";

  if (!photos || photos.length === 0) {
    roverPhotosDiv.innerHTML = '<div style="color: #808080; text-align: center; font-family: \'Share Tech Mono\', monospace;">No images available</div>';
    return;
  }

  const img = document.createElement("img");
  img.src = photos[currentPhotoIndex].img_src;
  img.alt = `Rover photo taken on Sol ${photos[currentPhotoIndex].sol}`;
  img.className = "rover-photo";
  
  // Add loading state
  img.addEventListener('load', () => {
    img.style.opacity = '1';
  });
  
  img.addEventListener('error', () => {
    img.alt = 'Image failed to load';
    img.style.opacity = '0.5';
  });
  
  img.style.opacity = '0.7';
  img.style.transition = 'opacity 0.3s ease';

  img.addEventListener("click", () => {
    fullscreenPhoto();
  });

  roverPhotosDiv.appendChild(img);
}

function fullscreenPhoto() {
  if (!photos || photos.length === 0) return;
  
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalImage");
  const captionText = document.getElementById("modalCaption");

  modal.style.display = "block";
  modalImg.src = photos[currentPhotoIndex].img_src;
  
  const photo = photos[currentPhotoIndex];
  captionText.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; text-align: left;">
      <div><strong>ROVER:</strong> ${photo.rover.name.toUpperCase()}</div>
      <div><strong>SOL:</strong> ${photo.sol}</div>
      <div><strong>EARTH DATE:</strong> ${photo.earth_date}</div>
      <div><strong>CAMERA:</strong> ${photo.camera.full_name}</div>
    </div>
  `;
}

function showNextPhoto(photos) {
  if (!photos || photos.length === 0) return;
  currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
  displayRoverPhotos(photos);
}

function showPreviousPhoto(photos) {
  if (!photos || photos.length === 0) return;
  currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
  displayRoverPhotos(photos);
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

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
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
