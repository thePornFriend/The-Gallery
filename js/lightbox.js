function enableZoomDrag() {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <span class="lightbox-arrow left">&#10094;</span>
    <div class="lightbox-main">
      <div class="lightbox-stage" id="lightbox-stage"></div>
      <div class="lightbox-desc"></div>
      <div class="lightbox-colors"></div>
    </div>
    <span class="lightbox-arrow right">&#10095;</span>
    <div class="lightbox-collection">
      <div class="collection-title"></div>
      <div class="collection-meta"></div>
      <div class="collection-features"></div>
      <div class="collection-tags"></div>
      <div class="collection-count"></div>
      <div class="collection-preview">
        <span class="collection-arrow left">&#10094;</span>
        <img class="collection-preview-img" src="" alt="">
        <span class="collection-arrow right">&#10095;</span>
      </div>
      <div class="collection-preview-caption"></div>
    </div>
  `;
  document.body.appendChild(lightbox);

  // Création du conteneur PiP s'il n'existe pas
  let pipContainer = document.getElementById('pip-container');
  if (!pipContainer) {
    pipContainer = document.createElement('div');
    pipContainer.id = 'pip-container';
    document.body.appendChild(pipContainer);
  }

  const stageBox = lightbox.querySelector("#lightbox-stage");
  const descBox = lightbox.querySelector(".lightbox-desc");
  // ... (Garde tes autres variables : colorsBox, leftArrow, etc.)
  const colorsBox = lightbox.querySelector(".lightbox-colors");
  const leftArrow = lightbox.querySelector(".lightbox-arrow.left");
  const rightArrow = lightbox.querySelector(".lightbox-arrow.right");

  let currentIndex = -1;
  let allMedia = [];
  let currentMedia = null; // Stocke l'élément img ou video actif

  function cleanActressNames(raw) { /* ... garde ton code ... */ }
  function joinWithAmpersand(list) { /* ... garde ton code ... */ }
  function generateDescription(img) { /* ... garde ton code ... */ }
  function applyColorFilterFromHex(hex) { /* ... garde ton code ... */ }
  function renderColors(img) { /* ... garde ton code ... */ }
  
  // ... (Garde updateCollectionPanel et showCollectionPreview en remplaçant 
  // img.dataset.gallery par currentMedia.dataset.gallery)

  function showImage(index) {
    if (index < 0) index = allMedia.length - 1;
    if (index >= allMedia.length) index = 0;
    currentIndex = index;
    
    currentMedia = allMedia[currentIndex];
    stageBox.innerHTML = ''; // On vide le stage

    if (currentMedia.tagName.toLowerCase() === 'video') {
      // C'est une vidéo
      const video = document.createElement('video');
      video.src = currentMedia.src;
      video.controls = false;
      video.classList.add('lightbox-video');
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.style.cursor = 'pointer';
      
      // Clic pour Play/Pause
      video.addEventListener('click', () => {
        if (video.paused) video.play();
        else video.pause();
      });
      
      stageBox.appendChild(video);
    } else {
      // C'est une image
      const img = document.createElement('img');
      img.src = currentMedia.src;
      stageBox.appendChild(img);
    }

    descBox.innerHTML = generateDescription(currentMedia);
    renderColors(currentMedia);
    // updateCollectionPanel(currentMedia); // Décommente si tu gères la collection
  }

  function openLightbox(clickedMedia) {
    allMedia = Array.from(document.querySelectorAll(".img-container img, .img-container video"));
    currentIndex = allMedia.indexOf(clickedMedia);
    if (currentIndex !== -1) {
      showImage(currentIndex);
      lightbox.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  }

  function closeLightbox() {
    lightbox.classList.remove("visible");
    document.body.style.overflow = "";
    
    // GESTION DU PIP
    if (currentMedia && currentMedia.tagName.toLowerCase() === 'video') {
      const activeVideoInLightbox = stageBox.querySelector('video');
      if (activeVideoInLightbox) {
        // On crée la fenêtre PiP
        const pipWindow = document.createElement('div');
        pipWindow.className = 'pip-window';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'pip-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => pipWindow.remove();
        
        // On déplace la vidéo de la lightbox vers le PiP
        activeVideoInLightbox.controls = true;
        pipWindow.appendChild(activeVideoInLightbox);
        pipWindow.appendChild(closeBtn);
        
        // Ajoute le PiP au conteneur
        pipContainer.prepend(pipWindow);
      }
    }
  }

  leftArrow.addEventListener("click", e => { e.stopPropagation(); showImage(currentIndex - 1); });
  rightArrow.addEventListener("click", e => { e.stopPropagation(); showImage(currentIndex + 1); });
  window.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("visible")) return;
    e.preventDefault();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "Escape") closeLightbox();
  });
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });

  // Le zoom sur les images dans la grille
  document.querySelectorAll(".img-container").forEach((container) => {
    const media = container.querySelector("img, video");
    
    // Si c'est une vidéo, on ne met pas la barre de zoom
    if (media.tagName.toLowerCase() === 'video') {
      container.addEventListener("dblclick", () => openLightbox(media));
      let lastTap = 0;
      container.addEventListener("touchend", (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) { e.preventDefault(); openLightbox(media); }
        lastTap = currentTime;
      });
      return; // On arrête là pour les vidéos
    }

    // Sinon, on garde ta logique de zoom pour les images
    const zoomInput = document.createElement("input");
    // ... (Garde toute ta logique de zoom existante : zoomInput, scale, offsetX, etc.)
  });
}
