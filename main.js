// Main Application Script
import { WeatherManager } from './weather.js?v=3';
import { PhotoManager } from './photos.js?v=3';
import { UIControls } from './ui-controls.js?v=3';

class MarsWeatherApp {
  constructor() {
    this.weatherManager = new WeatherManager();
    this.photoManager = new PhotoManager();
    this.uiControls = new UIControls();
    
    // Set up cross-module communication
    this.uiControls.setManagers(this.weatherManager, this.photoManager);
  }

  async initialize() {
    try {
      // Initialize UI controls
      this.uiControls.initializeAllControls();
      
      // Load initial weather data and photos
      await this.weatherManager.getMarsWeather();
      
      // Get the sol from the weather data and initialize photos
      const weatherData = await this.weatherManager.fetchData();
      if (weatherData && weatherData.latestSolData) {
        const sol = weatherData.latestSolData.sol;
        console.log(`Initializing photos for sol ${sol}`);
        await this.photoManager.initializePhotos(sol, "curiosity");
      }
      
      console.log('Mars Weather App initialized successfully');
    } catch (error) {
      console.error('Error initializing Mars Weather App:', error);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new MarsWeatherApp();
  app.initialize();
});
