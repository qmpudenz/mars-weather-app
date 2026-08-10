// UI Controls Module
export class UIControls {
  constructor() {
    this.weatherManager = null;
    this.photoManager = null;
  }

  setManagers(weatherManager, photoManager) {
    this.weatherManager = weatherManager;
    this.photoManager = photoManager;
  }

  initializeAllControls() {
    this.initializeAlertSystem();
    this.initializeStreamToggle();
    this.initializeChartModeSelector();
    this.initializePeriodSelector();
    this.initializeModal();
    this.initializePhotoControls();
  }

  initializeAlertSystem() {
    const alertToggle = document.getElementById('alertToggle');
    if (!alertToggle) return;

    alertToggle.addEventListener('change', () => {
      const isEnabled = alertToggle.checked;
      const alertPanel = document.querySelector('.alert-panel');
      
      if (alertPanel) {
        alertPanel.style.display = isEnabled ? 'flex' : 'none';
      }
      
      // Play sound effect
      this.playClickSound();
    });
  }

  initializeStreamToggle() {
    const streamToggle = document.getElementById('streamToggle');
    if (!streamToggle) return;

    streamToggle.addEventListener('change', () => {
      const isEnabled = streamToggle.checked;
      const statusElement = document.getElementById('streamStatus');
      
      if (statusElement) {
        statusElement.textContent = isEnabled ? 'LIVE' : 'STANDBY';
        statusElement.style.color = isEnabled ? 'var(--accent-green)' : 'var(--text-muted)';
      }
      
      // Play sound effect
      this.playClickSound();
      
      // If enabled, start auto-refresh
      if (isEnabled) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });
  }

  initializeChartModeSelector() {
    const chartModeSelector = document.getElementById('chartModeSelector');
    if (!chartModeSelector) return;
    const positions = [...chartModeSelector.querySelectorAll('.flight-mode-button')];
    const modes = positions.map(position => position.dataset.mode);
    const readout = document.getElementById('chartModeReadout');

    const selectMode = (mode) => {
      const selectedIndex = modes.indexOf(mode);
      if (selectedIndex < 0) return;

      positions.forEach(position => {
        const isActive = position.dataset.mode === mode;
        position.classList.toggle('active', isActive);
        position.setAttribute('aria-checked', String(isActive));
      });
      if (readout) readout.textContent = positions[selectedIndex].dataset.label;

      if (this.weatherManager) {
        this.weatherManager.setChartMode(mode);
      }
    };

    positions.forEach(position => {
      position.addEventListener('click', event => {
        event.stopPropagation();
        selectMode(position.dataset.mode);
        this.playClickSound();
      });
    });

    selectMode(this.weatherManager?.currentChartMode || 'line');
  }

  initializePeriodSelector() {
    const periodButtons = document.querySelectorAll('.period-btn');
    if (!periodButtons.length) return;

    periodButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        periodButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get the period value
        const period = parseInt(button.dataset.period);
        
        // Update weather manager
        if (this.weatherManager) {
          this.weatherManager.currentChartPeriod = period;
          const chartData = this.weatherManager.getChartDataForPeriod(
            this.weatherManager.temperatureData, 
            period
          );
          this.weatherManager.renderTemperatureAnalysis(chartData);
        }
        
        // Play sound effect
        this.playClickSound();
      });
    });
  }

  initializeModal() {
    if (this.photoManager) {
      this.photoManager.initializeModal();
    }
  }

  initializePhotoControls() {
    // Photo navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (prevBtn && this.photoManager) {
      prevBtn.addEventListener('click', () => {
        this.photoManager.showPreviousPhoto();
        this.playClickSound();
      });
    }
    
    if (nextBtn && this.photoManager) {
      nextBtn.addEventListener('click', () => {
        this.photoManager.showNextPhoto();
        this.playClickSound();
      });
    }
    
    if (fullscreenBtn && this.photoManager) {
      fullscreenBtn.addEventListener('click', () => {
        this.photoManager.fullscreenPhoto();
        this.playClickSound();
      });
    }
  }

  playClickSound() {
    try {
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
    } catch (error) {
      // Silently fail if audio is not supported
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh(); // Clear any existing interval
    
    this.autoRefreshInterval = setInterval(() => {
      if (this.weatherManager) {
        this.weatherManager.getMarsWeather();
      }
    }, 30000); // Refresh every 30 seconds
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  // Method to update UI elements based on data
  updateUIElements(weatherData) {
    // Update data freshness indicator
    this.updateDataFreshnessIndicator(weatherData);
    
    // Update alert system
    this.updateAlertSystem(weatherData);
  }

  updateDataFreshnessIndicator(weatherData) {
    if (!weatherData || !weatherData.latestSolData) return;
    
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (!lastUpdateTime) return;
    
    const now = new Date();
    const dataDate = new Date(weatherData.latestSolData.terrestrial_date);
    const daysDiff = Math.floor((now - dataDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      lastUpdateTime.style.color = 'var(--accent-orange)';
      lastUpdateTime.title = `Data is ${daysDiff} days old`;
    } else if (daysDiff > 3) {
      lastUpdateTime.style.color = 'var(--accent-yellow)';
      lastUpdateTime.title = `Data is ${daysDiff} days old`;
    } else {
      lastUpdateTime.style.color = 'var(--accent-green)';
      lastUpdateTime.title = 'Data is current';
    }
  }

  updateAlertSystem(weatherData) {
    if (!weatherData || !weatherData.latestSolData) return;
    
    const { max_temp, min_temp, pressure, atmo_opacity, wind_speed } = weatherData.latestSolData;
    
    // Clear all alerts
    document.querySelectorAll('.alert-led').forEach(led => led.classList.remove('active'));
    
    let activeAlerts = 0;
    
    // Check for dust storm (high atmospheric opacity)
    if (atmo_opacity && parseFloat(atmo_opacity) > 0.8) {
      document.getElementById('dustAlert')?.classList.add('active');
      activeAlerts++;
    }
    
    // Check for extreme temperatures
    const maxTemp = parseFloat(max_temp);
    const minTemp = parseFloat(min_temp);
    if (maxTemp > 50 || minTemp < -100) {
      document.getElementById('tempAlert')?.classList.add('active');
      activeAlerts++;
    }
    
    // Check for low pressure
    if (pressure && parseFloat(pressure) < 700) {
      document.getElementById('pressureAlert')?.classList.add('active');
      activeAlerts++;
    }
    
    // Check for high winds
    if (wind_speed && parseFloat(wind_speed) > 20) {
      document.getElementById('windAlert')?.classList.add('active');
      activeAlerts++;
    }
    
    // Update alert status
    const alertStatus = document.getElementById('alertStatus');
    if (alertStatus) {
      if (activeAlerts > 0) {
        alertStatus.textContent = `${activeAlerts} ALERT${activeAlerts > 1 ? 'S' : ''}`;
        alertStatus.style.color = 'var(--accent-orange)';
      } else {
        alertStatus.textContent = 'STANDBY';
        alertStatus.style.color = 'var(--accent-green)';
      }
    }
  }
}
