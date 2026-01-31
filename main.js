document.addEventListener("DOMContentLoaded", () => {

  const gallery = document.getElementById("gallery");
  const galleryImages = Array.from(gallery.querySelectorAll("img"));

// --- Détection et gestion des doublons (à activé de temps en temps) ---
function handleDuplicateImages(images) {
  const srcMap = new Map();
  images.forEach(img => {
    const src = img.src;
    if (!srcMap.has(src)) srcMap.set(src, []);
    srcMap.get(src).push(img);
  });

  const duplicates = [...srcMap.entries()].filter(([_, imgs]) => imgs.length > 1);

  if (duplicates.length === 0) return;

  // Création du conteneur modale
  const modal = document.createElement("div");
  modal.className = "duplicate-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Duplicate images detected</h2>
      <div class="thumbs"></div>
      <p>Click an image to copy its link</p>
    </div>
  `;
  document.body.appendChild(modal);

  const thumbsContainer = modal.querySelector(".thumbs");

  duplicates.forEach(([src]) => {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.className = "duplicate-thumb";
    thumb.loading = "eager"; // priorité de chargement
    thumb.addEventListener("click", () => {
      navigator.clipboard.writeText(src);
      thumb.style.outline = "2px solid #4CAF50";
      setTimeout(() => (thumb.style.outline = ""), 1000);
    });
    thumbsContainer.appendChild(thumb);
  });

  modal.style.display = "flex";

  // Retarde le chargement des autres images
  images.forEach(img => {
    if (!duplicates.flatMap(([_, imgs]) => imgs).includes(img)) {
      img.loading = "lazy";
    }
  });
}

// handleDuplicateImages(galleryImages);

  
  // --- Lazy Loading ---
  function applyLazyLoading(images) {
    images.forEach(img => {
      img.loading = "lazy";
      if (!img.alt || img.alt.trim() === '') {
        img.alt = img.dataset.actress || 'Image';
      }
    });
  }

// --- Zoom, Drag, Reset + Lightbox avec navigation et blocage du scroll ---
function enableZoomDrag() {
  const style = document.createElement("style");
  style.textContent = `
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      justify-content: center;
      align-items: center;
      z-index: 1000;
      transition: opacity 0.3s ease;
    }
    .lightbox.visible {
      display: flex;
      opacity: 1;
    }
    .lightbox img {
      max-width: 90%;
      max-height: 90%;
      transition: transform 0.3s ease;
      cursor: zoom-out;
      user-select: none;
    }
    .lightbox-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 48px;
      color: white;
      cursor: pointer;
      user-select: none;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
    }
    .lightbox-arrow:hover {
      background: rgba(255,255,255,0.2);
    }
    .lightbox-arrow.left { left: 20px; }
    .lightbox-arrow.right { right: 20px; }
  `;
  document.head.appendChild(style);

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <span class="lightbox-arrow left">&#10094;</span>
    <img src="" alt="">
    <span class="lightbox-arrow right">&#10095;</span>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector("img");
  const leftArrow = lightbox.querySelector(".lightbox-arrow.left");
  const rightArrow = lightbox.querySelector(".lightbox-arrow.right");

  let currentIndex = -1;
  let allImages = [];

  const showImage = index => {
    if (index < 0) index = allImages.length - 1;
    if (index >= allImages.length) index = 0;
    currentIndex = index;
    lightboxImg.src = allImages[currentIndex].src;
  };

  const openLightbox = index => {
    showImage(index);
    lightbox.style.display = "flex";
    document.body.style.overflow = "hidden"; // bloque le scroll
  };

  const closeLightbox = () => {
    lightbox.style.display = "none";
    document.body.style.overflow = ""; // rétablit le scroll
  };

  leftArrow.addEventListener("click", e => {
    e.stopPropagation();
    showImage(currentIndex - 1);
  });

  rightArrow.addEventListener("click", e => {
    e.stopPropagation();
    showImage(currentIndex + 1);
  });

  window.addEventListener("keydown", e => {
    if (lightbox.style.display !== "flex") return;
    e.preventDefault(); // empêche les flèches de défiler la page
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "Escape") closeLightbox();
  });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.querySelectorAll(".img-container").forEach((container, idx) => {
    const img = container.querySelector("img");

    const zoomInput = document.createElement("input");
    zoomInput.type = "range";
    zoomInput.min = 1;
    zoomInput.max = 3;
    zoomInput.step = 0.01;
    zoomInput.value = 1;
    zoomInput.classList.add("zoom-bar");
    container.appendChild(zoomInput);

    allImages.push(img);

    let scale = 1, offsetX = 0, offsetY = 0;
    let isDragging = false, startX, startY;

    const updateTransform = () => {
      img.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
    };

    zoomInput.addEventListener("input", () => {
      scale = parseFloat(zoomInput.value);
      updateTransform();
    });

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
      if (scale === 1 && offsetX === 0 && offsetY === 0) {
        openLightbox(idx);
      } else {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        zoomInput.value = 1;
        updateTransform();
      }
    });
  });
}
function enableZoomDrag() {
  const style = document.createElement("style");
  style.textContent = `
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      justify-content: center;
      align-items: center;
      flex-direction: column;
      z-index: 1000;
    }
    .lightbox.visible { display: flex; }
    .lightbox img {
      max-width: 90%;
      max-height: 85%;
      transition: transform 0.3s ease;
      cursor: zoom-out;
      user-select: none;
    }
    .lightbox-desc {
      color: white;
      font-family: sans-serif;
      font-size: 16px;
      margin-top: 10px;
      text-align: center;
    }
    .lightbox-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 48px;
      color: white;
      cursor: pointer;
      user-select: none;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
    }
    .lightbox-arrow:hover { background: rgba(255,255,255,0.2); }
    .lightbox-arrow.left { left: 20px; }
    .lightbox-arrow.right { right: 20px; }
  `;
  document.head.appendChild(style);

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <span class="lightbox-arrow left">&#10094;</span>
    <img src="" alt="">
    <span class="lightbox-arrow right">&#10095;</span>
    <div class="lightbox-desc"></div>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector("img");
  const descBox = lightbox.querySelector(".lightbox-desc");
  const leftArrow = lightbox.querySelector(".lightbox-arrow.left");
  const rightArrow = lightbox.querySelector(".lightbox-arrow.right");

  let currentIndex = -1;
  let allImages = [];

  // Nettoie et trie les noms d'actrices
  function cleanActressNames(raw) {
    if (!raw) return [];
    const names = raw
      .split(",")
      .map(n => n.trim().replace(/[()]/g, ""))
      .map(n => (n.toLowerCase() === "amateur" ? "unknown" : n));
    // place "unknown" en dernier
    names.sort((a, b) => (a === "unknown" ? 1 : b === "unknown" ? -1 : 0));
    return names;
  }

  // Génère la description
function generateDescription(img) {
  const galleryId = img.dataset.gallery || "—";
  let actresses = (img.dataset.actress || img.alt || "")
    .split(",")
    .map(a => a.trim().replace(/[()]/g, ""))
    .filter(Boolean)
    .map(a => a.toLowerCase() === "amateur" ? "unknown" : a);

  // unknown toujours à la fin
  actresses.sort((a, b) => (a === "unknown") - (b === "unknown"));

  const last = actresses.pop();
  const actressText = actresses.length
    ? `${actresses.join(", ")} & ${last}`
    : last || "unknown";

  return `Image n° : ${galleryId}<br>${actressText}`;
}



  function showImage(index) {
    if (index < 0) index = allImages.length - 1;
    if (index >= allImages.length) index = 0;
    currentIndex = index;
    const img = allImages[currentIndex];
    lightboxImg.src = img.src;
    descBox.innerHTML = generateDescription(img);
  }

function openLightbox(clickedImage) {
  const allImages = Array.from(document.querySelectorAll(".img-container img"));
  currentIndex = allImages.indexOf(clickedImage);

  if (currentIndex !== -1) {
    showImage(currentIndex); // réutilise ta fonction existante
    lightbox.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}



  function closeLightbox() {
    lightbox.style.display = "none";
    document.body.style.overflow = "";
  }

  leftArrow.addEventListener("click", e => {
    e.stopPropagation();
    showImage(currentIndex - 1);
  });

  rightArrow.addEventListener("click", e => {
    e.stopPropagation();
    showImage(currentIndex + 1);
  });

  window.addEventListener("keydown", e => {
    if (lightbox.style.display !== "flex") return;
    e.preventDefault();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "Escape") closeLightbox();
  });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.querySelectorAll(".img-container").forEach((container, idx) => {
    const img = container.querySelector("img");

    const zoomInput = document.createElement("input");
    zoomInput.type = "range";
    zoomInput.min = 1;
    zoomInput.max = 3;
    zoomInput.step = 0.01;
    zoomInput.value = 1;
    zoomInput.classList.add("zoom-bar");
    container.appendChild(zoomInput);

    allImages.push(img);

    let scale = 1, offsetX = 0, offsetY = 0;
    let isDragging = false, startX, startY;

    const updateTransform = () => {
      img.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
    };

    zoomInput.addEventListener("input", () => {
      scale = parseFloat(zoomInput.value);
      updateTransform();
    });

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
      if (scale === 1 && offsetX === 0 && offsetY === 0) {
        const img = container.querySelector("img");
        openLightbox(img);
      } else {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        zoomInput.value = 1;
        updateTransform();
      }
    });
  });
}



  // --- Tri des images ---
  function sortImages(images) {
    return images.sort((a, b) => {
      const aData = a.getAttribute("data-gallery") || "";
      const bData = b.getAttribute("data-gallery") || "";
      const aNums = aData.split("-").map(s => parseInt(s, 10) || 0);
      const bNums = bData.split("-").map(s => parseInt(s, 10) || 0);
      const len = Math.max(aNums.length, bNums.length);
      for (let i = 0; i < len; i++) {
        const numA = aNums[i] ?? 0;
        const numB = bNums[i] ?? 0;
        if (numA !== numB) return numA - numB;
      }
      return 0;
    });
  }

  // --- Filtres actrices et tags ---
function createFilterCheckboxes(images) {
  const actressList = document.querySelector('.actress-list');
  const tagList = document.querySelector('.tag-list');
  const modeSelect = document.getElementById('filter-mode');
  images.forEach(img => {
    if (!img.dataset.studio || img.dataset.studio.trim() === '') {
      img.dataset.studio = 'unassigned';
    }
  });
  if (!actressList || !tagList || !modeSelect) return;

  const normalize = n => /^\(.*\)$/.test(n.trim()) ? 'amateur' : n.trim();
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

  const countMap = (items) => {
    const count = new Map();
    items.forEach(arr => arr.forEach(v => count.set(v, (count.get(v) || 0) + 1)));
    return count;
  };

  const imgData = images.map(img => {
    const acts = (img.dataset.actress || '')
      .split(',')
      .map(normalize)
      .filter(Boolean);

    const tags = (img.dataset.tag || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const studios = (img.dataset.studio || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    return { img, acts, tags, studios };
  });

  const actressCount = countMap(imgData.map(d => d.acts));
  const tagCount = countMap(imgData.map(d => d.tags));
  const studioCount = countMap(imgData.map(d => d.studios));

  function buildCheckboxGrid(container, items) {
    const sorted = [...items.keys()].sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );
    const perCol = Math.ceil(sorted.length / 5);
    container.innerHTML = '';
    const checkboxes = [];

    for (let i = 0; i < 5; i++) {
      const col = document.createElement('div');
      col.className = 'column';
      for (const item of sorted.slice(i * perCol, (i + 1) * perCol)) {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${item}"> ${capitalize(item)} (${items.get(item)})`;
        const cb = label.firstChild;
        checkboxes.push(cb);
        col.appendChild(label);
      }
      container.appendChild(col);
    }

    return checkboxes;
  }

  const actressCheckboxes = buildCheckboxGrid(actressList, actressCount);
  const tagCheckboxes = buildCheckboxGrid(tagList, tagCount);

  const prodList = document.querySelector('.prod-list');
  const studioCheckboxes = prodList
    ? buildCheckboxGrid(prodList, studioCount)
    : [];

  const allCheckboxes = [
    ...actressCheckboxes,
    ...tagCheckboxes,
    ...studioCheckboxes
  ];

  const filter = () => {
    const selected = allCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    const inclusive = modeSelect.value === 'inclusive';

    const visibleImages = imgData
    .filter(({ acts, tags, studios }) =>
      selected.length === 0
        ? true
        : inclusive
          ? selected.some(v =>
              acts.includes(v) ||
              tags.includes(v) ||
              studios.includes(v)
            )
          : [...acts, ...tags, ...studios].every(v => selected.includes(v))
    )

      .map(({ img }) => img);

    gallery.innerHTML = '';
    groupImagesByPrefix(visibleImages);
    enableZoomDrag();
  };

  allCheckboxes.forEach(cb => cb.addEventListener('change', filter));
  modeSelect.addEventListener('change', filter);

  filter();
}

function enableCollapsibleFilters() {
  document.querySelectorAll('.filter-sections h3').forEach(title => {
    const list = title.nextElementSibling;
    if (!list) return;

    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      const isHidden = list.style.display === 'none';
      list.style.display = isHidden ? '' : 'none';
      title.classList.toggle('collapsed', !isHidden);
    });
  });
}

  // --- Background intelligent ---
function enableTagBackgroundChange() {
  const tagCheckboxes = document.querySelectorAll('.tag-list input[type="checkbox"]');
  if (!tagCheckboxes.length) return;

  const baseColors = {
    blue: '#2323FF',
    red: '#FF0000',
    yellow: '#FFEB3B',
    purple: '#9C27B0',
    green: '#4CAF50',
    orange: '#FF9800',
    pink: '#E91E63'
  };

  function getColorsFromTag(tag) {
  const lower = tag.toLowerCase();
  return Object.keys(baseColors).filter(color => lower.includes(color));
}

  function generateGradient(colors) {
    if (!colors.length) return '';
    if (colors.length === 1) return baseColors[colors[0]]; // couleur unie
    const validColors = colors.map(c => baseColors[c]);
    // gradient horizontal gauche→droite
    return `linear-gradient(to right, ${validColors.join(', ')})`;
  }

  const updateBackground = () => {
    const selectedTags = Array.from(tagCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value.toLowerCase());

    if (selectedTags.length === 0) {
      document.body.style.background = '';
      return;
    }

    const allColors = [];
    selectedTags.forEach(tag => {
      allColors.push(...getColorsFromTag(tag));
    });

    const uniqueColors = [...new Set(allColors)];
    document.body.style.background = generateGradient(uniqueColors);
  };

  tagCheckboxes.forEach(cb => cb.addEventListener('change', updateBackground));
  updateBackground();
}

  // --- Groupement d’images ---
  function groupImagesByPrefix(images) {
    const groups = new Map();

    images.forEach(img => {
      const data = img.getAttribute("data-gallery") || "";
      const prefix = parseInt(data.split("-")[0], 10) || 0;
      if (!groups.has(prefix)) groups.set(prefix, []);
      groups.get(prefix).push(img);
    });

    gallery.innerHTML = "";

    groups.forEach((imgs, prefix) => {
      const groupDiv = document.createElement("div");
      groupDiv.classList.add("group");
      groupDiv.dataset.group = prefix;
      buildGalleryLayout(imgs, groupDiv);
      gallery.appendChild(groupDiv);
    });
  }

  // --- Construction galerie ---
  function buildGalleryLayout(images, container = gallery) {
    const createDiv = className => {
      const div = document.createElement("div");
      div.className = className;
      return div;
    };

    const createColumn = (imgs, type) => {
      if (!imgs.length) return null;
      const column = createDiv("column");
      column.dataset.columntype = type;
      imgs.forEach(img => {
        const container = createDiv("img-container");
        container.dataset.orientation = img.dataset.orientation;
        container.appendChild(img);
        column.appendChild(container);
      });
      return column;
    };

    const createMixedColumn = imgs => {
      const column = createDiv("column");
      column.dataset.columntype = "12-mixed";
      let unprocessed = [...imgs];

      while (unprocessed.length) {
        const first = unprocessed[0];
        const type = first.dataset.orientation;
        const maxCount = type === "portrait" ? 3 : 2;
        const lineImgs = [];

        let count = 0;
        for (let img of unprocessed) {
          if (img.dataset.orientation === type && count < maxCount) {
            lineImgs.push(img);
            count++;
          }
        }

        unprocessed = unprocessed.filter(img => !lineImgs.includes(img));

        const lineDiv = createDiv(`line ${type}-line`);
        lineImgs.forEach(img => {
          const container = createDiv("img-container");
          container.dataset.orientation = img.dataset.orientation;
          container.appendChild(img);
          lineDiv.appendChild(container);
        });

        column.appendChild(lineDiv);
      }

      return column;
    };

    let remainingImages = [...images];
    let leftover = [];

    container.innerHTML = "";
    const galleryLine = createDiv("line");

    while (remainingImages.length) {
      const batch = [...leftover, ...remainingImages.splice(0, 12)];
      leftover = [];

      const portraits = batch.filter(img => img.dataset.orientation === "portrait");
      const landscapes = batch.filter(img => img.dataset.orientation === "landscape");
      let unused = [...batch];

      if (portraits.length === landscapes.length && batch.length === 12) {
        const col = createMixedColumn(batch);
        galleryLine.appendChild(col);
      } else {
        while (unused.filter(img => img.dataset.orientation === "portrait").length >= 4) {
          const fourP = unused.filter(img => img.dataset.orientation === "portrait").slice(0, 4);
          const col = createColumn(fourP, "4P");
          galleryLine.appendChild(col);
          unused = unused.filter(img => !fourP.includes(img));
        }

        while (unused.filter(img => img.dataset.orientation === "landscape").length >= 6) {
          const sixL = unused.filter(img => img.dataset.orientation === "landscape").slice(0, 6);
          const col = createColumn(sixL, "6L");
          galleryLine.appendChild(col);
          unused = unused.filter(img => !sixL.includes(img));
        }

        leftover = [...unused];
      }
    }

    leftover.forEach(img => {
      const col = createColumn([img], "last-columntype");
      galleryLine.appendChild(col);
    });

    container.appendChild(galleryLine);
  }

  // --- Vérification et rechargement ---
  function retryUnloadedImages(images) {
    let intervalId;

    function checkAndReload() {
      console.log("🔄 Vérification des images non chargées...");

      let unloaded = images.filter(img => !img.complete || img.naturalWidth === 0);

      if (unloaded.length === 0) {
        clearInterval(intervalId);
        console.log("✅ Toutes les images sont correctement chargées.");
        return;
      }

      console.log(`⚠️ ${unloaded.length} images non chargées, tentative de rechargement...`);

      unloaded.forEach(img => {
        const oldSrc = img.src;
        img.src = "";
        img.src = oldSrc + (oldSrc.includes("?") ? "&" : "?") + "reload=" + Date.now();
      });
    }

    setTimeout(() => {
      console.log("⏱ 4 minutes écoulées, démarrage de la vérification périodique des images...");
      intervalId = setInterval(checkAndReload, 45 * 1000);
      checkAndReload();
    }, 4 * 60 * 1000);
  }

  // --- Exécution ---
  const sortedImages = 
  sortImages(galleryImages);
  applyLazyLoading(sortedImages);
  createFilterCheckboxes(sortedImages);
  enableCollapsibleFilters(); 
  enableTagBackgroundChange();
  groupImagesByPrefix(sortedImages);
  enableZoomDrag();
  retryUnloadedImages(sortedImages);

});
