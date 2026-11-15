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
  const colorsBox = lightbox.querySelector(".lightbox-colors");
  const leftArrow = lightbox.querySelector(".lightbox-arrow.left");
  const rightArrow = lightbox.querySelector(".lightbox-arrow.right");

  const collectionPanel = lightbox.querySelector(".lightbox-collection");
  const collectionTitle = lightbox.querySelector(".collection-title");
  const collectionMeta = lightbox.querySelector(".collection-meta");
  const collectionFeatures = lightbox.querySelector(".collection-features");
  const collectionTags = lightbox.querySelector(".collection-tags");
  const collectionCount = lightbox.querySelector(".collection-count");
  const collectionPreviewImg = lightbox.querySelector(".collection-preview-img");
  const collectionPreviewCaption = lightbox.querySelector(".collection-preview-caption");
  const collectionArrowLeft = lightbox.querySelector(".collection-arrow.left");
  const collectionArrowRight = lightbox.querySelector(".collection-arrow.right");

  let currentIndex = -1;
  let allMedia = [];
  let currentCollection = null;
  let collectionPreviewIndex = 0;

  function cleanActressNames(raw) {
    if (!raw) return [];
    const names = raw.split(",").map(n => n.trim().replace(/[()]/g, "")).map(n => (n.toLowerCase() === "amateur" ? "unknown" : n));
    names.sort((a, b) => (a === "unknown" ? 1 : b === "unknown" ? -1 : 0));
    return names;
  }

  function joinWithAmpersand(list) {
    if (!list.length) return "unknown";
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
  }

  function generateDescription(media) {
    const galleryId = media.dataset.gallery || "—";
    const actresses = cleanActressNames(media.dataset.actress || media.alt || "");
    const cropped = new Set(cleanActressNames(media.dataset.croppedActresses || "").map(n => n.toLowerCase()));
    const labeled = actresses.map(n => cropped.has(n.toLowerCase()) ? `${n} (<i>cropped</i>)` : n);
    return `Image n° : ${galleryId}<br>${joinWithAmpersand(labeled)}`;
  }

  function applyColorFilterFromHex(hex) {
    const active = document.getElementById('color-active');
    const hue    = document.getElementById('color-hue');
    if (!active || !hue) return;

    const hsl = hexToHsl(hex);
    const hueValue = Math.round(hsl.h);
    active.checked = true;
    hue.value = hueValue;
    active.dispatchEvent(new Event('input'));
    hue.dispatchEvent(new Event('input'));
  }

  function renderColors(media) {
    colorsBox.innerHTML = "";
    const { hexes } = parseClr(media);
    if (!hexes.length) {
      colorsBox.style.display = "none";
      return;
    }
    colorsBox.style.display = "flex";

    hexes.forEach(hex => {
      const item = document.createElement("div");
      item.className = "lightbox-color-item";
      item.title = "Filtrer par cette couleur";
      item.addEventListener("click", e => { e.stopPropagation(); applyColorFilterFromHex(hex); });
      
      const swatch = document.createElement("span");
      swatch.className = "lightbox-color-swatch";
      swatch.style.background = hex;
      
      const code = document.createElement("span");
      code.className = "lightbox-color-code";
      code.textContent = hex.toUpperCase();
      
      item.appendChild(swatch);
      item.appendChild(code);
      colorsBox.appendChild(item);
    });
  }

  function updateCollectionPanel(media) {
    const col = media._collection;
    if (!col) {
      currentCollection = null;
      collectionPanel.classList.remove("visible");
      return;
    }
    if (col !== currentCollection) {
      currentCollection = col;
      collectionPreviewIndex = 0;
    }
    const titleLine = col.series ? `${col.title} (${col.series})` : col.title;
    collectionTitle.innerHTML = col.subtitle ? `${titleLine} : ${col.subtitle}` : titleLine;
    collectionMeta.textContent = [col.studio, col.date].filter(Boolean).join(", ");
    collectionFeatures.innerHTML = `Features : ${joinWithAmpersand([...col.actresses])}`;
    collectionTags.innerHTML = `Tags : ${[...col.tags].join(", ") || "—"}`;
    collectionCount.textContent = `Images : ${col.images.length}`;
    collectionPanel.classList.add("visible");
    showCollectionPreview();
  }

  function showCollectionPreview() {
    if (!currentCollection) return;
    const imgs = currentCollection.images;
    if (collectionPreviewIndex < 0) collectionPreviewIndex = imgs.length - 1;
    if (collectionPreviewIndex >= imgs.length) collectionPreviewIndex = 0;
    const previewImg = imgs[collectionPreviewIndex];
    collectionPreviewImg.src = previewImg.src; // Si c'est une vidéo ça peut être bizarre, mais on garde ta logique
    collectionPreviewCaption.textContent = `Image n° : ${previewImg.dataset.gallery || "—"}`;
  }

  collectionArrowLeft.addEventListener("click", e => { e.stopPropagation(); collectionPreviewIndex--; showCollectionPreview(); });
  collectionArrowRight.addEventListener("click", e => { e.stopPropagation(); collectionPreviewIndex++; showCollectionPreview(); });
  collectionPreviewImg.addEventListener("click", e => {
    e.stopPropagation();
    if (!currentCollection) return;
    const target = currentCollection.images[collectionPreviewIndex];
    const idx = allMedia.indexOf(target);
    if (idx !== -1) showImage(idx);
  });

  function showImage(index) {
    if (index < 0) index = allMedia.length - 1;
    if (index >= allMedia.length) index = 0;
    currentIndex = index;
    
    const media = allMedia[currentIndex];
    stageBox.innerHTML = ''; // On vide la scène

    if (media.tagName.toLowerCase() === 'video') {
      const video = document.createElement('video');
      video.src = media.src;
      video.controls = false;
      video.classList.add('lightbox-video');
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.style.cursor = 'pointer';
      video.addEventListener('click', () => {
        if (video.paused) video.play();
        else video.pause();
      });
      stageBox.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = media.src;
      stageBox.appendChild(img);
    }

    descBox.innerHTML = generateDescription(media);
    renderColors(media);
    updateCollectionPanel(media);
  }

  function openLightbox(clickedMedia) {
    // On récupère TOUTES les images et vidéos de la galerie
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
    
    const activeVideo = stageBox.querySelector('video');
    if (activeVideo) {
      const pipWindow = document.createElement('div');
      pipWindow.className = 'pip-window';
      
      const dragBar = document.createElement('div');
      dragBar.className = 'pip-drag-bar';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'pip-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => pipWindow.remove();
      
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'pip-resize-handle';
      
      activeVideo.controls = true;
      
      dragBar.appendChild(closeBtn);
      pipWindow.appendChild(dragBar);
      pipWindow.appendChild(activeVideo);
      pipWindow.appendChild(resizeHandle);
      pipContainer.appendChild(pipWindow);

      // --- LOGIQUE DE DÉPLACEMENT (DRAG) ---
      let isDragging = false;
      let startX, startY, startLeft, startTop;

      dragBar.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = pipWindow.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        // On passe en left/top pour faciliter le calcul
        pipWindow.style.left = `${startLeft}px`;
        pipWindow.style.top = `${startTop}px`;
        pipWindow.style.right = 'auto';
        pipWindow.style.bottom = 'auto';
        
        dragBar.setPointerCapture(e.pointerId);
      });

      dragBar.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        pipWindow.style.left = `${startLeft + dx}px`;
        pipWindow.style.top = `${startTop + dy}px`;
      });

      dragBar.addEventListener('pointerup', (e) => {
        isDragging = false;
        dragBar.releasePointerCapture(e.pointerId);
      });

      // --- LOGIQUE DE REDIMENSIONNEMENT (RESIZE) ---
      let isResizing = false;
      let startWidth, startXResize, aspectRatio = 16 / 9; // Ratio par défaut

      // On récupère les vraies dimensions de la vidéo pour bloquer le ratio
      if (activeVideo.videoWidth && activeVideo.videoHeight) {
        aspectRatio = activeVideo.videoWidth / activeVideo.videoHeight;
        pipWindow.style.aspectRatio = aspectRatio;
      } else {
        activeVideo.addEventListener('loadedmetadata', () => {
          aspectRatio = activeVideo.videoWidth / activeVideo.videoHeight;
          pipWindow.style.aspectRatio = aspectRatio;
        });
      }

      resizeHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isResizing = true;
        startWidth = pipWindow.offsetWidth;
        startXResize = e.clientX;
        resizeHandle.setPointerCapture(e.pointerId);
      });

      resizeHandle.addEventListener('pointermove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - startXResize;
        const newWidth = Math.max(150, startWidth + dx); // Empêche de réduire trop
        const newHeight = newWidth / aspectRatio; // Calcul mathématique du ratio
        
        pipWindow.style.width = `${newWidth}px`;
        pipWindow.style.height = `${newHeight}px`;
      });

      resizeHandle.addEventListener('pointerup', (e) => {
        isResizing = false;
        resizeHandle.releasePointerCapture(e.pointerId);
      });
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

  // GESTION DE LA GRILLE (Zoom pour images, clic pour vidéos)
  document.querySelectorAll(".img-container").forEach((container) => {
    const media = container.querySelector("img, video");
    
    // Si c'est une vidéo, pas de zoom, juste l'ouverture
    if (media.tagName.toLowerCase() === 'video') {
      container.addEventListener("dblclick", () => openLightbox(media));
      let lastTap = 0;
      container.addEventListener("touchend", (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) { e.preventDefault(); openLightbox(media); }
        lastTap = currentTime;
      });
      return; 
    }

    // Logique de zoom conservée pour les images
    const zoomInput = document.createElement("input");
    zoomInput.type = "range";
    zoomInput.min = 1;
    zoomInput.max = 3;
    zoomInput.step = 0.01;
    zoomInput.value = 1;
    zoomInput.classList.add("zoom-bar");
    container.appendChild(zoomInput);

    let scale = 1, offsetX = 0, offsetY = 0;
    let isDragging = false, startX, startY;

    const updateTransform = () => { media.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`; };
    zoomInput.addEventListener("input", () => { scale = parseFloat(zoomInput.value); updateTransform(); });

    container.addEventListener("mousedown", e => {
      if (scale <= 1) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      container.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      offsetX += dx;
      offsetY += dy;
      startX = e.clientX;
      startY = e.clientY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = "grab";
      }
    });

    container.addEventListener("dblclick", () => {
      if (scale === 1 && offsetX === 0 && offsetY === 0) openLightbox(media);
      else { scale = 1; offsetX = 0; offsetY = 0; zoomInput.value = 1; updateTransform(); }
    });

    let lastTap = 0;
    container.addEventListener("touchend", (e) => {
      if (e.target.closest('.zoom-bar')) return;
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        if (scale === 1 && offsetX === 0 && offsetY === 0) openLightbox(media);
        else { scale = 1; offsetX = 0; offsetY = 0; zoomInput.value = 1; updateTransform(); }
      }
      lastTap = currentTime;
    }, { passive: false });
  });
}
