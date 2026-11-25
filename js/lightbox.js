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

  // Formate dd/mm/yyyy en "d Month yyyy" (Mois en toutes lettres)
  function formatDateForDisplay(dateStr) {
    if (!dateStr) return "";
    const match = dateStr.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = match[3];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${day} ${months[month - 1]} ${year}`;
    }
    return dateStr; 
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

    const formattedDate = formatDateForDisplay(col.date);
    const titleLine = col.series ? `${col.title} (${col.series})` : col.title;
    
    collectionTitle.innerHTML = col.subtitle ? `${titleLine} : ${col.subtitle}` : titleLine;
    
    // On utilise formattedDate pour l'affichage
    collectionMeta.textContent = [col.studio, formattedDate].filter(Boolean).join(", ");
    
    collectionFeatures.innerHTML = `Features : ${joinWithAmpersand([...col.actresses])}`;
    
    // Masquer les tags s'il n'y en a pas
    if (col.tags.size > 0) {
        collectionTags.innerHTML = `Tags : ${[...col.tags].join(", ")}`;
        collectionTags.style.display = "block";
    } else {
        collectionTags.innerHTML = "";
        collectionTags.style.display = "none";
    }
    
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
    collectionPreviewImg.src = previewImg.src;
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
    stageBox.innerHTML = ''; 

    const tag = media.tagName.toLowerCase();

    if (tag === 'video') {
      const video = document.createElement('video');
      video.src = media.src;
      video.controls = false;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.style.cursor = 'pointer';
      video.addEventListener('click', () => {
        if (video.paused) video.play();
        else video.pause();
      });
      stageBox.appendChild(video);
    } else if (tag === 'iframe') {
      const iframe = document.createElement('iframe');
      iframe.src = media.src;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.maxWidth = '900px';
      iframe.style.maxHeight = '75vh';
      iframe.style.border = 'none';
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      stageBox.appendChild(iframe);
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
    allMedia = Array.from(document.querySelectorAll(".img-container img, .img-container video, .img-container iframe"));
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
    
    const activeMedia = stageBox.firstElementChild;
    if (activeMedia && (activeMedia.tagName.toLowerCase() === 'video' || activeMedia.tagName.toLowerCase() === 'iframe')) {
      const pipWindow = document.createElement('div');
      pipWindow.className = 'pip-window';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'pip-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => { e.stopPropagation(); pipWindow.remove(); };
      
      pipWindow.appendChild(activeMedia);
      pipWindow.appendChild(closeBtn);
      
      if (activeMedia.tagName.toLowerCase() === 'iframe') {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'pip-drag-handle';
        pipWindow.appendChild(dragHandle);
        activeMedia.style.pointerEvents = 'auto'; 
      }

      ['tl', 'tr', 'bl', 'br'].forEach(corner => {
        const cornerDiv = document.createElement('div');
        cornerDiv.className = `pip-resize-corner pip-resize-${corner}`;
        cornerDiv.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          initResize(e, corner, pipWindow, activeMedia);
        });
        pipWindow.appendChild(cornerDiv);
      });

      pipContainer.appendChild(pipWindow);

      let isDragging = false;
      let startX, startY, startLeft, startTop;

      pipWindow.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.pip-close') || e.target.closest('.pip-resize-corner')) return;
        if (activeMedia.tagName.toLowerCase() === 'iframe' && !e.target.closest('.pip-drag-handle')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = pipWindow.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        pipWindow.style.left = `${startLeft}px`;
        pipWindow.style.top = `${startTop}px`;
        pipWindow.style.right = 'auto';
        pipWindow.style.bottom = 'auto';

        pipWindow.setPointerCapture(e.pointerId);
      });

      pipWindow.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        pipWindow.style.left = `${startLeft + dx}px`;
        pipWindow.style.top = `${startTop + dy}px`;
      });

      pipWindow.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        pipWindow.releasePointerCapture(e.pointerId);
      });
    }
  }

  function initResize(e, corner, pipWindow, media) {
    let aspectRatio = 16 / 9; 
    
    if (media.tagName.toLowerCase() === 'video') {
      aspectRatio = (media.videoWidth && media.videoHeight) ? (media.videoWidth / media.videoHeight) : (16 / 9);
    } else if (media.tagName.toLowerCase() === 'iframe') {
      const orientation = media.dataset.orientation || 'landscape';
      aspectRatio = (orientation === 'portrait') ? (9 / 16) : (16 / 9);
      pipWindow.style.aspectRatio = aspectRatio;
    }

    let startWidth = pipWindow.offsetWidth;
    let startHeight = pipWindow.offsetHeight;
    const rect = pipWindow.getBoundingClientRect();
    let startLeft = rect.left;
    let startTop = rect.top;
    let startX = e.clientX;
    let startY = e.clientY;

    pipWindow.style.left = `${startLeft}px`;
    pipWindow.style.top = `${startTop}px`;
    pipWindow.style.right = 'auto';
    pipWindow.style.bottom = 'auto';

    const target = e.target;
    target.setPointerCapture(e.pointerId);

    function onPointerMove(moveEvent) {
      let dx = moveEvent.clientX - startX;
      let dy = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newLeft = startLeft;
      let newTop = startTop;

      if (corner.includes('r')) newWidth = startWidth + dx;
      if (corner.includes('l')) newWidth = startWidth - dx;

      if (newWidth < 150) newWidth = 150; 
      let newHeight = newWidth / aspectRatio;

      if (corner.includes('l')) newLeft = startLeft + (startWidth - newWidth);
      if (corner.includes('t')) newTop = startTop + (startHeight - newHeight);

      pipWindow.style.width = `${newWidth}px`;
      pipWindow.style.height = `${newHeight}px`;
      pipWindow.style.left = `${newLeft}px`;
      pipWindow.style.top = `${newTop}px`;
    }

    function onPointerUp() {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
    }

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
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
  
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault(); 
      const pipVideos = document.querySelectorAll('.pip-window video');
      pipVideos.forEach(vid => {
        if (vid.paused) vid.play(); else vid.pause();
      });
    }
  });
  
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });

  document.querySelectorAll(".img-container").forEach((container) => {
    const media = container.querySelector("img, video, iframe");
    
    if (media.tagName.toLowerCase() === 'video' || media.tagName.toLowerCase() === 'iframe') {
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

console.log("lighbox > done");
