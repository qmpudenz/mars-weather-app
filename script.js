document.addEventListener('DOMContentLoaded', () => {
document.getElementById('previous-photo').addEventListener('click', () => showPreviousPhoto(photos));
document.getElementById('next-photo').addEventListener('click', () => showNextPhoto(photos));
  });
  
async function getMarsWeather() {
try {
    const data = await fetchData();
    displayWeatherData(data);
} catch (error) {
    console.error('Error:', error);
}
}
  
function displayWeatherData(weatherData) {
    if (!weatherData || !weatherData.latestSolData) {
        console.error('Error: Invalid weather data');
        return;
    }

    const {
        sol: solDate,
        terrestrial_date: earthDate,
        max_temp: highTemperature,
        min_temp: lowTemperature,
        pressure,
        sunrise,
        sunset
    } = weatherData.latestSolData;

    function addDaySuffix(day) {
        switch (day % 10) {
        case 1:
            return day + 'st';
        case 2:
            return day + 'nd';
        case 3:
            return day + 'rd';
        default:
            return day + 'th';
        }
    }
        
    function formattedDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const formatted = date.toLocaleDateString('en-US', options);

        const day = date.getDate();
        let suffix = 'th';

        if (day < 10 || day > 20) {
        switch (day % 10) {
            case 1:
            suffix = 'st';
            break;
            case 2:
            suffix = 'nd';
            break;
            case 3:
            suffix = 'rd';
            break;
            default:
            suffix = 'th';
            break;
        }
        }

        return formatted.replace(/\d{1,2}/, day + suffix);
    }
    
    document.getElementById('solDate').innerText = 'Sol ' + solDate;
    document.getElementById('earthDate').innerText = formattedDate(earthDate);
    document.getElementById('highTemperature').innerText = highTemperature + '°F';
    document.getElementById('lowTemperature').innerText = lowTemperature + '°F';
    document.getElementById('pressure').innerText = pressure;
    document.getElementById('sunrise').innerText = sunrise;
    document.getElementById('sunset').innerText = sunset;

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
    const chart = new Chart(ctx, {
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
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 4,
            },
            {
            label: "Low Temperature",
            data: temperatureData.map((data) => data.low),
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 4,
            },
        ],
        },
        options: {
        scales: {
            x: {
            ticks: {
                font: {
                size: 24
                },
                color: 'white'
            }
            },
            y: {
            beginAtZero: true,
            ticks: {
                font: {
                size: 20,
                weight: 'lighter'
                },
                color: 'white',
                callback: function(value) {
                return value + '°F';
                }
            }
            }
        },
        plugins: {
            title: {
            display: true,
            text: 'Weekly Temperatures',
            font: {
                size: 48
            },
            padding: 20,
            color: 'white'
            },
            tooltip: {
            callbacks: {
                label: function(context) {
                const dataset = context.dataset;
                const currentValue = context.parsed.y;
                return dataset.label + ': ' + currentValue + '°F';
                }
            }
            },
            legend: {
            position: 'bottom',
            labels: {
                font: {
                size: 24,
                weight: 'lighter'
                },
                padding: 20,
                color: 'white',
            }
            },
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
            size: 50
            },
            bodyFont: {
            size: 50
            },
            footerFont: {
            size: 50
            },
            padding: 10,
            displayColors: false
        },
        }
    });
}

async function fetchRoverPhotos(sol, roverName) {
    const apiKey = 'DB6sVUROk8cG7IvNWDC11xZL5U3NLIHGLEsAK6jo';
    const apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?sol=${sol}&api_key=${apiKey}`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.photos;
}

let currentPhotoIndex = 0;

function displayRoverPhotos(photos) {
    const roverPhotosDiv = document.getElementById('rover-photos');
    roverPhotosDiv.innerHTML = '';

    const img = document.createElement('img');
    img.src = photos[currentPhotoIndex].img_src;
    img.alt = `Rover photo taken on Sol ${photos[currentPhotoIndex].sol}`;
    img.className = 'rover-photo';
    roverPhotosDiv.appendChild(img);

    img.addEventListener('click', () => {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImage');
    const captionText = document.getElementById('modalCaption');

    modal.style.display = 'block';
    modalImg.src = photos[currentPhotoIndex].img_src;
    captionText.innerHTML = `Rover: ${photos[currentPhotoIndex].rover.name}<br>Date: ${photos[currentPhotoIndex].earth_date}<br>Camera: ${photos[currentPhotoIndex].camera.full_name}`;
    });

    roverPhotosDiv.appendChild(img);
}

function showNextPhoto(photos) {
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    displayRoverPhotos(photos);
}

function showPreviousPhoto(photos) {
    currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    displayRoverPhotos(photos);
}


const sol = 1000;
const roverName = 'curiosity';

let photos = [];

fetchRoverPhotos(sol, roverName).then(fetchedPhotos => {
    photos = fetchedPhotos.reverse();
    displayRoverPhotos(photos);
});




document.addEventListener('DOMContentLoaded', () => {
    getMarsWeather();
});

document.addEventListener('DOMContentLoaded', () => {
const modal = document.getElementById('photoModal');
const closeModal = document.querySelector('.close-modal');

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
    modal.style.display = 'none';
    }
    });
});

document.addEventListener('DOMContentLoaded', fetchData);





