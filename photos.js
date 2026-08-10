// Photo Module
export class PhotoManager {
  constructor() {
    this.photos = [];
    this.filteredPhotos = [];
    this.currentPhotoIndex = 0;
    this.currentCameraFilter = 'ALL';
    this.cameraButtonsInitialized = false;
  }

  async initializePhotos(sol, roverName) {
    try {
      this.showPhotoLoadingState(true);
      this.updateSolSearchInfo('INITIALIZING PHOTO SEARCH...');
      this.photos = await this.fetchRoverPhotos(sol, roverName);
      if (this.photos.length > 0) {
        this.filteredPhotos = [...this.photos];
        this.displayRoverPhotos();
        this.initializeCameraButtons();
      }
      this.showPhotoLoadingState(false);
    } catch (error) {
      console.error("Error initializing photos:", error);
      this.showPhotoLoadingState(false);
      this.updateSolSearchInfo('ERROR: PHOTO SEARCH FAILED');
    }
  }

  showPhotoLoadingState(loading = true) {
    const loadingElement = document.querySelector('.image-loading');
    const photoElement = document.getElementById('rover-photos');
    const gallery = document.querySelector('.thumbnail-gallery');
    const cameraButtons = document.querySelector('.camera-buttons');
    
    if (loadingElement) {
      loadingElement.style.display = loading ? 'flex' : 'none';
      if (loading) {
        loadingElement.querySelector('.loading-text').textContent = 'ACQUIRING PHOTOS FROM MARS...';
      }
    }
    
    if (photoElement) {
      photoElement.style.display = loading ? 'none' : 'block';
    }
    
    if (gallery) {
      gallery.style.display = loading ? 'none' : 'flex';
    }
    
    if (cameraButtons) {
      cameraButtons.style.display = loading ? 'none' : 'block';
    }
  }

  async fetchRoverPhotos(sol, roverName, continueFromSol = null) {
    const apiKey = "DB6sVUROk8cG7IvNWDC11xZL5U3NLIHGLEsAK6jo";
    
    let allPhotos = [];
    let currentSol = continueFromSol || sol;
    let solsChecked = 0;
    const maxSolsToCheck = 50; // Check up to 50 sols at a time
    let hasShownInitialPhotos = false;
    const startSol = currentSol;
    const isContinueSearch = continueFromSol !== null;
    
    console.log(`Starting photo collection from sol ${currentSol}${isContinueSearch ? ' (continuing search)' : ''}`);
    
    // Update search indicator
    if (!isContinueSearch) {
      this.updateSolSearchInfo(`SEARCHING FROM SOL ${currentSol}...`);
    }
    
    while (solsChecked < maxSolsToCheck && currentSol > 0) {
      const apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?sol=${currentSol}&api_key=${apiKey}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
          console.log(`Found ${data.photos.length} photos from sol ${currentSol}`);
          
          // Log camera distribution for this sol
          const cameras = [...new Set(data.photos.map(p => p.camera.name))];
          console.log(`Cameras in sol ${currentSol}:`, cameras);
          console.log(`Camera distribution:`, cameras.map(cam => ({
            camera: cam,
            count: data.photos.filter(p => p.camera.name === cam).length
          })));
          
          // Add photos from this sol to our collection
          allPhotos = allPhotos.concat(data.photos);
          
          console.log(`Running total: ${allPhotos.length} photos from sols with data`);
          
          // Update search indicator with progress (only for initial search)
          if (!isContinueSearch) {
            this.updateSolSearchInfo(`FOUND ${allPhotos.length} PHOTOS FROM ${solsChecked + 1} SOLS (CURRENT: SOL ${currentSol})`);
            
            // Show first 15 photos immediately if we haven't shown initial photos yet
            if (!hasShownInitialPhotos && allPhotos.length >= 15) {
              hasShownInitialPhotos = true;
              this.showInitialPhotos(allPhotos.slice(0, 15));
              this.updateSolSearchInfo(`SHOWING FIRST 15 PHOTOS - CONTINUING SEARCH...`);
            }
          }
          
          // If we have enough photos with good camera variety, we can stop
          const uniqueCameras = [...new Set(allPhotos.map(p => p.camera.name))];
          if (allPhotos.length >= 1000 && uniqueCameras.length >= 8) {
            console.log(`Stopping at sol ${currentSol} - have ${allPhotos.length} photos with ${uniqueCameras.length} cameras`);
            break;
          }
        } else {
          console.log(`No photos found for sol ${currentSol}`);
        }
      } catch (error) {
        console.error(`Error fetching photos from sol ${currentSol}:`, error);
      }
      
      // Check consecutive sols (not jumping by 50)
      currentSol -= 1;
      solsChecked++;
    }
    
    if (allPhotos.length > 0) {
      // Sort photos to prioritize NAVCAM images first
      allPhotos.sort((a, b) => {
        const aIsNavcam = a.camera.name.includes('NAV') || a.camera.name === 'NAVCAM';
        const bIsNavcam = b.camera.name.includes('NAV') || b.camera.name === 'NAVCAM';
        
        if (aIsNavcam && !bIsNavcam) return -1;
        if (!aIsNavcam && bIsNavcam) return 1;
        
        // Within same camera type, sort by sol (newest first)
        return b.sol - a.sol;
      });
      
      console.log(`Total photos collected: ${allPhotos.length}`);
      console.log(`Total unique cameras: ${[...new Set(allPhotos.map(p => p.camera.name))].length}`);
      
      // Update final search result (only for initial search)
      if (!isContinueSearch) {
        const uniqueSols = [...new Set(allPhotos.map(p => p.sol))];
        const solsWithPhotos = uniqueSols.length;
        const solsBack = sol - Math.min(...uniqueSols);
        this.updateSolSearchInfo(`COMPLETE: ${allPhotos.length} PHOTOS FROM ${solsWithPhotos} SOLS (${solsBack} SOLS BACK)`);
        
        // Update search range display
        this.updateSearchRange(startSol, currentSol + 1);
      }
      
      // Store the last sol checked for potential continuation
      this.lastSolChecked = currentSol;
      
      return allPhotos;
    }
    
    console.log('No photos found from any sol');
    if (!isContinueSearch) {
      this.updateSolSearchInfo('NO PHOTOS FOUND');
    }
    return [];
  }

  displayRoverPhotos() {
    if (!this.photos || this.photos.length === 0) {
      this.showLoadingState(false);
      this.showNoPhotosMessage();
      return;
    }

    this.showLoadingState(false);
    this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
    this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
    this.displayMainImage();
    this.createThumbnailGallery();
    this.updateActiveThumbnail();
  }

  showNoPhotosMessage() {
    const photoElement = document.getElementById('rover-photos');
    if (photoElement) {
      photoElement.innerHTML = '<div class="no-photos">No photos available for this sol</div>';
    }
    
    const gallery = document.querySelector('.thumbnail-gallery');
    if (gallery) {
      gallery.innerHTML = '';
    }
    
    this.updateImageCounter(0, 0);
  }

  displayMainImage() {
    const photoElement = document.getElementById('rover-photos');
    if (!photoElement || !this.filteredPhotos[this.currentPhotoIndex]) return;

    const currentPhoto = this.filteredPhotos[this.currentPhotoIndex];
    photoElement.innerHTML = `
      <img src="${currentPhoto.img_src}" alt="Mars surface" class="rover-photo">
    `;
    
    // Add click event listener for fullscreen
    const img = photoElement.querySelector('.rover-photo');
    if (img) {
      img.addEventListener('click', () => this.fullscreenPhoto());
    }
  }

  displayRoverPhotosWithFilter(photos) {
    if (!photos || photos.length === 0) {
      this.showLoadingState(false);
      return;
    }

    this.filteredPhotos = photos;
    this.currentPhotoIndex = 0;
    this.displayRoverPhotos();
  }

  createThumbnailGallery() {
    const gallery = document.querySelector('.thumbnail-gallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    
    this.filteredPhotos.forEach((photo, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail-item';
      
      thumbnail.innerHTML = `
        <img src="${photo.img_src}" alt="Mars surface" loading="lazy">
      `;
      
      thumbnail.addEventListener('click', () => {
        this.currentPhotoIndex = index;
        this.displayMainImage();
        this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
        this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
        this.updateActiveThumbnail();
      });
      
      gallery.appendChild(thumbnail);
    });
    
    // Update active thumbnail after creating all thumbnails
    this.updateActiveThumbnail();
  }

  updateActiveThumbnail() {
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, index) => {
      thumb.classList.remove('active');
      if (index === this.currentPhotoIndex) {
        thumb.classList.add('active');
      }
    });
  }

  updateImageCounter(current, total) {
    const currentElement = document.getElementById('currentImage');
    const totalElement = document.getElementById('totalImages');
    
    if (currentElement) currentElement.textContent = current;
    if (totalElement) totalElement.textContent = total;
  }

  updateImageInfo(photo) {
    if (!photo) return;

    const cameraInfo = document.getElementById('cameraInfo');
    if (!cameraInfo) return;

    // Format camera name
    let cameraName = photo.camera.name;
    const cameraNameMap = {
      'FHAZ': 'Front Hazard Avoidance Camera',
      'RHAZ': 'Rear Hazard Avoidance Camera',
      'MAST': 'Mast Camera',
      'CHEMCAM': 'Chemistry and Camera Complex',
      'MAHLI': 'Mars Hand Lens Imager',
      'NAVCAM': 'Navigation Camera',
      'PANCAM': 'Panoramic Camera',
      'MINITES': 'Miniature Thermal Emission Spectrometer'
    };

    if (cameraNameMap[cameraName]) {
      cameraName = cameraNameMap[cameraName];
    }

    // Add sol information
    const solInfo = photo.sol ? ` | Sol ${photo.sol}` : '';
    cameraInfo.textContent = cameraName + solInfo;
  }

  updateSolSearchInfo(message) {
    const searchInfo = document.getElementById('solSearchInfo');
    if (searchInfo) {
      searchInfo.textContent = message;
    }
  }

  updateSearchRange(startSol, endSol) {
    const searchRange = document.getElementById('searchRange');
    if (searchRange) {
      searchRange.textContent = `SOL ${endSol} TO SOL ${startSol}`;
    }
  }

  showInitialPhotos(photos) {
    // Sort photos to prioritize NAVCAM images first
    photos.sort((a, b) => {
      const aIsNavcam = a.camera.name.includes('NAV') || a.camera.name === 'NAVCAM';
      const bIsNavcam = b.camera.name.includes('NAV') || b.camera.name === 'NAVCAM';
      
      if (aIsNavcam && !bIsNavcam) return -1;
      if (!aIsNavcam && bIsNavcam) return 1;
      
      // Within same camera type, sort by sol (newest first)
      return b.sol - a.sol;
    });

    this.photos = photos;
    this.filteredPhotos = [...photos];
    this.currentPhotoIndex = 0;
    this.currentCameraFilter = 'ALL';
    
    // Show loading state false to display photos
    this.showPhotoLoadingState(false);
    
    // Display the photos
    this.displayMainImage();
    this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
    this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
    this.createThumbnailGallery();
    this.updateActiveThumbnail();
    
    // Initialize camera buttons (but don't show them yet)
    this.initializeCameraButtons();
    this.showContinueSearchButton();
  }

  showContinueSearchButton() {
    const searchIndicator = document.querySelector('.sol-search-indicator');
    if (!searchIndicator) return;

    // Remove existing continue button if it exists
    const existingButton = searchIndicator.querySelector('.continue-search-btn');
    if (existingButton) {
      existingButton.remove();
    }

    // Add continue search button
    const continueButton = document.createElement('button');
    continueButton.className = 'continue-search-btn';
    continueButton.textContent = 'SEARCH 50 MORE SOLS';
    continueButton.addEventListener('click', () => this.continueSearch());
    
    searchIndicator.appendChild(continueButton);
  }

  async continueSearch() {
    if (!this.lastSolChecked) return;
    
    const continueButton = document.querySelector('.continue-search-btn');
    if (continueButton) {
      continueButton.textContent = 'SEARCHING...';
      continueButton.disabled = true;
    }

    this.updateSolSearchInfo('CONTINUING SEARCH FROM PREVIOUS SOL...');
    
    try {
      // Store current photos before fetching more
      const existingPhotos = [...this.photos];
      
      // Fetch additional photos starting from the last sol checked
      const additionalPhotos = await this.fetchRoverPhotos(this.lastSolChecked, "curiosity", this.lastSolChecked);
      
      if (additionalPhotos.length > 0) {
        // Combine existing photos with new ones
        this.photos = [...existingPhotos, ...additionalPhotos];
        this.filteredPhotos = [...this.photos];
        this.currentPhotoIndex = 0;
        
        // Update display
        this.displayMainImage();
        this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
        this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
        this.createThumbnailGallery();
        this.updateActiveThumbnail();
        
        // Re-initialize camera buttons with new total
        this.initializeCameraButtons();
        this.showContinueSearchButton();
        
        // Update search range to show cumulative range
        const allSols = [...new Set(this.photos.map(p => p.sol))];
        const minSol = Math.min(...allSols);
        const maxSol = Math.max(...allSols);
        this.updateSearchRange(maxSol, minSol);
        
        // Update search info to show total
        this.updateSolSearchInfo(`TOTAL: ${this.photos.length} PHOTOS FROM ${allSols.length} SOLS`);
      }
    } catch (error) {
      console.error('Error continuing search:', error);
      this.updateSolSearchInfo('ERROR: SEARCH FAILED');
    }
  }

  showLoadingState(loading = true) {
    const loadingElement = document.querySelector('.image-loading');
    const photoElement = document.getElementById('rover-photos');
    
    if (loadingElement) {
      loadingElement.style.display = loading ? 'flex' : 'none';
    }
    
    if (photoElement) {
      photoElement.style.display = loading ? 'none' : 'block';
    }
  }

  initializeCameraButtons() {
    if (!this.photos || this.photos.length === 0) return;
    
    const availableCameras = [...new Set(this.photos.map(photo => photo.camera.name.toUpperCase()))];
    console.log('Available cameras:', availableCameras);
    console.log('Total photos:', this.photos.length);
    console.log('Camera counts:', availableCameras.map(cam => ({
      camera: cam,
      count: this.photos.filter(p => p.camera.name.toUpperCase() === cam).length
    })));
    
    // Log a few sample photos to see the camera name structure
    console.log('Sample photos:', this.photos.slice(0, 5).map(p => ({
      camera: p.camera.name,
      camera_upper: p.camera.name.toUpperCase(),
      sol: p.sol
    })));
    
    // Sort cameras by photo count (most photos first)
    const cameraCounts = availableCameras.map(cam => ({
      camera: cam,
      count: this.photos.filter(p => p.camera.name.toUpperCase() === cam).length
    }));
    cameraCounts.sort((a, b) => b.count - a.count);
    
    console.log('Cameras sorted by photo count:', cameraCounts);
    
    this.updateCameraFilterButtons(availableCameras);
  }

  updateCameraFilterButtons(availableCameras) {
    const cameraButtonsContainer = document.querySelector('.camera-buttons');
    if (!cameraButtonsContainer) return;

    cameraButtonsContainer.innerHTML = '';
    
    // Add ALL button
    const allButton = document.createElement('button');
    allButton.className = 'camera-btn active';
    allButton.textContent = `ALL (${this.photos.length})`;
    allButton.addEventListener('click', (e) => this.handleCameraFilterClick(e, 'ALL'));
    cameraButtonsContainer.appendChild(allButton);
    
    // Add camera-specific buttons with photo counts
    availableCameras.forEach(camera => {
      const photoCount = this.photos.filter(p => p.camera.name.toUpperCase() === camera).length;
      const button = document.createElement('button');
      button.className = 'camera-btn';
      button.textContent = `${camera} (${photoCount})`;
      button.addEventListener('click', (e) => this.handleCameraFilterClick(e, camera));
      cameraButtonsContainer.appendChild(button);
    });
  }

  handleCameraFilterClick(event, camera) {
    // Update active button
    document.querySelectorAll('.camera-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    this.currentCameraFilter = camera;
    
    // Filter photos
    if (camera === 'ALL') {
      this.filteredPhotos = [...this.photos];
    } else {
      this.filteredPhotos = this.photos.filter(photo => 
        photo.camera.name.toUpperCase() === camera
      );
    }
    
    this.currentPhotoIndex = 0;
    this.displayMainImage();
    this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
    this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
    this.createThumbnailGallery();
  }

  showNextPhoto() {
    if (this.filteredPhotos.length === 0) return;
    
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.filteredPhotos.length;
    this.displayMainImage();
    this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
    this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
    this.updateActiveThumbnail();
  }

  showPreviousPhoto() {
    if (this.filteredPhotos.length === 0) return;
    
    this.currentPhotoIndex = this.currentPhotoIndex === 0 
      ? this.filteredPhotos.length - 1 
      : this.currentPhotoIndex - 1;
    this.displayMainImage();
    this.updateImageCounter(this.currentPhotoIndex + 1, this.filteredPhotos.length);
    this.updateImageInfo(this.filteredPhotos[this.currentPhotoIndex]);
    this.updateActiveThumbnail();
  }

  fullscreenPhoto() {
    if (!this.filteredPhotos || this.filteredPhotos.length === 0) return;
    
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImg');
    const modalCaption = document.getElementById('modalCaption');
    
    if (modal && modalImg && modalCaption) {
      const currentPhoto = this.filteredPhotos[this.currentPhotoIndex];
      modalImg.src = currentPhoto.img_src;
      modalCaption.textContent = `Camera: ${currentPhoto.camera.name}`;
      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  initializeModal() {
    const modal = document.getElementById('photoModal');
    const closeBtn = document.querySelector('.close');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.showPreviousPhoto());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.showNextPhoto());
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  }
} 