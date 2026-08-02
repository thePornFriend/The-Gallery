document.addEventListener("DOMContentLoaded", () => {

const gallery = document.getElementById("gallery");
  const galleryImages = Array.from(gallery.querySelectorAll("img"));

  // --- État du filtre "Gallery" (recherche par data-gallery) ---
  let selectedGalleryValues = new Set();
  let triggerFilter = () => {};

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

// Extraction de data depuis liens ImageKit
function extractDataFromURL(img) {
  const src = img.src;

  // Étape 1 : vérifier le domaine
  if (!src.startsWith("https://ik.imagekit.io/")) return;

  try {
    const url = new URL(src);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Étape 2 : récupérer dossier + nom fichier
    // ex: /adamtnfr/105/999_14110464-name_Alyx%20Star-Studio_Blacked-l.jpg
    const folder = pathParts[pathParts.length - 2];
    const file = pathParts[pathParts.length - 1];

    const blocks = file.split("-");

    // --- GALLERY ---
    let galleryParts = [];

    const folderClean = folder === "0" ? "0" : String(parseInt(folder, 10));
    galleryParts.push(folderClean);

    const firstBlock = blocks[0];
    const nums = firstBlock.match(/\d+/g);

    if (nums) {
      nums.forEach(n => {
        galleryParts.push(n === "0" ? "0" : String(parseInt(n, 10)));
      });
    }

    if (!img.dataset.gallery) {
      img.dataset.gallery = galleryParts.join("-");
      const sec = parseInt(img.dataset.gallerySecondary, 10);
      if (!isNaN(sec)) {
        img.dataset.gallery += "-" + sec;
      }
    }

    // --- AUTRES BLOCS ---
    blocks.slice(1).forEach(block => {

      if (/^\d+$/.test(block)) return;

      const parts = block.split("_");
      const key = parts[0]?.toLowerCase();
      const value = parts.slice(1).join("_");

      if (!value) return;

      if (key === "name" && !img.dataset.actress) {
        img.dataset.actress = decodeURIComponent(value).trim();
      }

      if (key === "studio" && !img.dataset.studio) {
      img.dataset.studio = decodeURIComponent(value).trim();
    }

      // --- Orientation (nouvelle règle basée sur préfixe) ---
      if (!img.dataset.orientation) {
        const match = file.match(/-(p|l|s|o)(\d+)?(?=\.|$)/i);

        if (match) {
          const map = {
            p: "portrait",
            l: "landscape",
            s: "square",
            o: "other"
          };
          img.dataset.orientation = map[match[1].toLowerCase()];
        }
      }
    });
    if (!img.dataset.orientation) {
      img.dataset.orientation = "landscape";
    }

  } catch (e) {
    console.warn("Erreur parsing URL:", src);
  }
}

// === Parsing du nouveau format combiné data-1 / data-2 ===

function looksLikeDate(block) {
  const b = block.trim();
  if (/^\d{4}$/.test(b)) return true;                          // "2022"
  if (/^\d{1,2}\s+[a-zà-ÿ]+\s+\d{4}$/i.test(b)) return true;    // "16 june 2022"
  if (/^[a-zà-ÿ]+\s+\d{4}$/i.test(b)) return true;              // "june 2022"
  return false;
}

function parseActressField(raw) {
  return raw.split(',').map(part => {
    const trimmed = part.trim();
    const excluded = trimmed.startsWith('(-)');
    const name = unescapeDash((excluded ? trimmed.slice(3) : trimmed).trim());
    return { name, excluded };
  }).filter(a => a.name);
}

// Découpe "top-level" : ignore les tirets situés à l'intérieur de parenthèses
// (protège "(-)" et tout contenu type "(X-Art)")
function splitTopLevel(raw, sep) {
  const blocks = [];
  let depth = 0;
  let current = '';
  for (const ch of raw) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      blocks.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  blocks.push(current);
  return blocks.map(b => b.trim()).filter(Boolean);
}

// Remplace le jeton d'échappement &dash (sans point-virgule, pour ne pas être
// interprété comme une entité HTML) par un vrai tiret, une fois le découpage
// en blocs terminé — permet d'écrire un "-" littéral dans un titre, un studio,
// un tag... sans qu'il soit pris pour un séparateur de data.
function unescapeDash(s) {
  return typeof s === 'string' ? s.replace(/&dash/g, '-') : s;
}

function parseData1(raw) {
  if (!raw) return null;
  const blocks = splitTopLevel(raw, '-');
  const data = { actresses: [], studio: '', series: '', date: '', title: '', subtitle: '' };
  const remaining = [];

  const actressPrefix = /^(name_|n_)/i;
  const studioPrefix  = /^(studio_|st_)/i;
  const seriesPrefix  = /^(series_|se_|°)/i;
  const datePrefix    = /^(date_|d_|y_)/i;
  const titlePrefix   = /^(title_|t_)/i;

  let actressFound = false, studioFound = false;

  blocks.forEach((block, i) => {
    if (actressPrefix.test(block)) {
      data.actresses = parseActressField(block.replace(actressPrefix, ''));
      actressFound = true;
    } else if (studioPrefix.test(block)) {
      data.studio = block.replace(studioPrefix, '').trim();
      studioFound = true;
    } else if (seriesPrefix.test(block)) {
      data.series = block.replace(seriesPrefix, '').trim();
    } else if (datePrefix.test(block)) {
      data.date = block.replace(datePrefix, '').trim();
    } else if (titlePrefix.test(block)) {
      remaining.push({ i, block: block.replace(titlePrefix, '').trim(), forcedTitle: true });
    } else {
      remaining.push({ i, block, forcedTitle: false });
    }
  });

  // Position 0 sans préfixe = actrices
  if (!actressFound && remaining.length && remaining[0].i === 0) {
    data.actresses = parseActressField(remaining.shift().block);
  }
  // Position 1 sans préfixe = studio
  if (!studioFound && remaining.length && remaining[0].i === 1) {
    data.studio = remaining.shift().block;
  }

  // Ce qui reste : date détectée par motif, sinon titre
  const leftover = [];
  remaining.forEach(r => {
    if (r.forcedTitle) {
      leftover.push(r.block);
    } else if (!data.date && looksLikeDate(r.block)) {
      data.date = r.block;
    } else {
      leftover.push(r.block);
    }
  });

if (leftover.length) {
    const titleFull = leftover.join('-');
    const [title, subtitle] = titleFull.split('_');
    data.title = title.trim();
    data.subtitle = subtitle ? subtitle.trim() : '';
  }

  data.studio = unescapeDash(data.studio);
  data.series = unescapeDash(data.series);
  data.date = unescapeDash(data.date);
  data.title = unescapeDash(data.title);
  data.subtitle = unescapeDash(data.subtitle);

  return data;
}

function parseData2(raw) {
  if (!raw) return null;
  const blocks = raw.split('-').map(b => b.trim()).filter(Boolean);
  const data = { gallery: '', orientation: '', tag: '' };

  const galleryPrefix     = /^(gallery_|g_)/i;
  const orientationPrefix = /^(orientation_|o_)/i;
  const tagPrefix         = /^(tag_|#_)/i;
  const orientationMap = { p: 'portrait', portrait: 'portrait', l: 'landscape', landscape: 'landscape', s: 'square', square: 'square' };

  let galleryFound = false, orientationFound = false;
  const remaining = [];

  blocks.forEach((block, i) => {
    if (galleryPrefix.test(block)) {
      data.gallery = block.replace(galleryPrefix, '').replace(/_/g, '-').trim();
      galleryFound = true;
    } else if (orientationPrefix.test(block)) {
      const v = block.replace(orientationPrefix, '').trim().toLowerCase();
      data.orientation = orientationMap[v] || v;
      orientationFound = true;
    } else if (tagPrefix.test(block)) {
      data.tag = block.replace(tagPrefix, '').trim();
    } else {
      remaining.push({ i, block });
    }
  });

  if (!galleryFound && remaining.length && remaining[0].i === 0) {
    data.gallery = remaining.shift().block.replace(/_/g, '-');
  }
if (!orientationFound && remaining.length && remaining[0].i === 1) {
    const v = remaining.shift().block.trim().toLowerCase();
    data.orientation = orientationMap[v] || v;
  }
  if (remaining.length) {
    data.tag = remaining.map(r => r.block).join('-');
  }

  data.gallery = unescapeDash(data.gallery);
  data.tag = unescapeDash(data.tag);

  return data;
}

// Applique data-1 / data-2 sur une image (ne touche pas aux datasets déjà remplis à la main)
function applyCombinedData(img) {
  const raw1 = img.getAttribute('data-1');
  const raw2 = img.getAttribute('data-2');

  if (raw1) {
    const parsed1 = parseData1(raw1);
    if (parsed1) {
      // Toutes les actrices de la collection (pour "Features")
      img.dataset.collectionActresses = parsed1.actresses.map(a => a.name).join(', ');
      // Actrices visibles sur CETTE image (celles sans (-)) -> pour les filtres/checkbox
      const visible = parsed1.actresses.filter(a => !a.excluded).map(a => a.name);
      if (!img.dataset.actress) {
        img.dataset.actress = (visible.length ? visible : parsed1.actresses.map(a => a.name)).join(', ');
      }
      if (!img.dataset.studio && parsed1.studio) img.dataset.studio = parsed1.studio;
      if (!img.dataset.series && parsed1.series) img.dataset.series = parsed1.series;
      if (!img.dataset.date && parsed1.date) img.dataset.date = parsed1.date;
      if (!img.dataset.title && parsed1.title) img.dataset.title = parsed1.title;
      if (!img.dataset.subtitle && parsed1.subtitle) img.dataset.subtitle = parsed1.subtitle;
    }
  }

  if (raw2) {
    const parsed2 = parseData2(raw2);
    if (parsed2) {
      if (!img.dataset.gallery && parsed2.gallery) img.dataset.gallery = parsed2.gallery;
      if (!img.dataset.orientation && parsed2.orientation) img.dataset.orientation = parsed2.orientation;
      if (!img.dataset.tag && parsed2.tag) img.dataset.tag = parsed2.tag;
    }
  }
}

// Regroupe les images en collections (uniquement celles utilisant le nouveau format)
function buildCollections(images) {
  const collections = new Map();

  images.forEach(img => {
    if (!img.dataset.title && !img.dataset.collectionActresses) return; // pas de collection ici

    const actressKey = (img.dataset.collectionActresses || img.dataset.actress || '')
      .split(',').map(n => n.trim().toLowerCase()).filter(Boolean).sort().join('|');
    const key = [actressKey, img.dataset.studio || '', img.dataset.series || '', img.dataset.date || '', img.dataset.title || ''].join('::');

    if (!collections.has(key)) {
      collections.set(key, {
        title: img.dataset.title || '',
        subtitle: img.dataset.subtitle || '',
        series: img.dataset.series || '',
        studio: img.dataset.studio || '',
        date: img.dataset.date || '',
        actresses: new Set(),
        tags: new Set(),
        images: []
      });
    }

const col = collections.get(key);
    (img.dataset.collectionActresses || img.dataset.actress || '')
      .split(',').map(n => n.trim().replace(/[()]/g, '')).filter(Boolean).forEach(n => col.actresses.add(n));
    (img.dataset.tag || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => col.tags.add(t));
    col.images.push(img);
  });

  collections.forEach(col => {
    col.images = sortImages(col.images);
    col.images.forEach(i => { i._collection = col; });
  });

  return collections;
}

// Application globale AVANT tout traitement
function autoPopulateDatasets(images) {
  images.forEach(img => {
    applyCombinedData(img); // priorité au nouveau format data-1 / data-2
    if (!img.dataset.gallery || !img.dataset.actress) {
      extractDataFromURL(img); // ancien système en secours
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
      z-index: 1000;
    }
    .lightbox.visible { display: flex; }
    .lightbox-main {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 60vw;
      max-width: 900px;
      flex-shrink: 0;
    }
    .lightbox-stage {
      width: 100%;
      height: 75vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-stage img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
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
      font-size: 48px;
      color: white;
      cursor: pointer;
      user-select: none;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
      flex-shrink: 0;
    }
    .lightbox-arrow:hover { background: rgba(255,255,255,0.2); }
    .lightbox-collection {
      display: none;
      width: 260px;
      margin-left: 30px;
      color: white;
      font-family: sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }
    .lightbox-collection.visible { display: block; }
    .collection-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .collection-meta { opacity: 0.8; margin-bottom: 14px; }
    .collection-features, .collection-tags, .collection-count { margin-bottom: 10px; }
    .collection-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 16px;
    }
.collection-preview-img {
      width: 180px;
      height: 180px;
      object-fit: cover;
      cursor: pointer;
      border-radius: 4px;
    }
    .collection-arrow { font-size: 24px; cursor: pointer; user-select: none; }
    .collection-preview-caption { text-align: center; font-size: 12px; opacity: 0.7; margin-top: 6px; }
  `;
  document.head.appendChild(style);

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
lightbox.innerHTML = `
    <span class="lightbox-arrow left">&#10094;</span>
    <div class="lightbox-main">
      <div class="lightbox-stage">
        <img src="" alt="">
      </div>
      <div class="lightbox-desc"></div>
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

  const lightboxImg = lightbox.querySelector(".lightbox-main img");
  const descBox = lightbox.querySelector(".lightbox-desc");
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
  let allImages = [];
  let currentCollection = null;
  let collectionPreviewIndex = 0;

  function cleanActressNames(raw) {
    if (!raw) return [];
    const names = raw
      .split(",")
      .map(n => n.trim().replace(/[()]/g, ""))
      .map(n => (n.toLowerCase() === "amateur" ? "unknown" : n));
    names.sort((a, b) => (a === "unknown" ? 1 : b === "unknown" ? -1 : 0));
    return names;
  }

  function joinWithAmpersand(list) {
    if (!list.length) return "unknown";
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
  }

  function generateDescription(img) {
    const galleryId = img.dataset.gallery || "—";
    const actresses = cleanActressNames(img.dataset.actress || img.alt || "");
    return `Image n° : ${galleryId}<br>${joinWithAmpersand(actresses)}`;
  }

  function updateCollectionPanel(img) {
    const col = img._collection;
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
    collectionPreviewImg.src = previewImg.src;
    collectionPreviewCaption.textContent = `Image n° : ${previewImg.dataset.gallery || "—"}`;
  }

  collectionArrowLeft.addEventListener("click", e => {
    e.stopPropagation();
    collectionPreviewIndex--;
    showCollectionPreview();
  });

  collectionArrowRight.addEventListener("click", e => {
    e.stopPropagation();
    collectionPreviewIndex++;
    showCollectionPreview();
  });

  collectionPreviewImg.addEventListener("click", e => {
    e.stopPropagation();
    if (!currentCollection) return;
    const target = currentCollection.images[collectionPreviewIndex];
    const idx = allImages.indexOf(target);
    if (idx !== -1) showImage(idx);
  });

  function showImage(index) {
    if (index < 0) index = allImages.length - 1;
    if (index >= allImages.length) index = 0;
    currentIndex = index;
    const img = allImages[currentIndex];
    lightboxImg.src = img.src;
    descBox.innerHTML = generateDescription(img);
    updateCollectionPanel(img);
  }

  function openLightbox(clickedImage) {
    allImages = Array.from(document.querySelectorAll(".img-container img"));
    currentIndex = allImages.indexOf(clickedImage);
    if (currentIndex !== -1) {
      showImage(currentIndex);
      lightbox.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  }

  function closeLightbox() {
    lightbox.classList.remove("visible");
    document.body.style.overflow = "";
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

  document.querySelectorAll(".img-container").forEach((container) => {
    const img = container.querySelector("img");
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
    .filter(({ acts, tags, studios, img }) => {
      const passesCheckboxFilter = selected.length === 0
        ? true
        : inclusive
          ? selected.some(v =>
              acts.includes(v) ||
              tags.includes(v) ||
              studios.includes(v)
            )
          : [...acts, ...tags, ...studios].every(v => selected.includes(v));

      const passesGalleryFilter = selectedGalleryValues.size === 0
        || selectedGalleryValues.has(img.dataset.gallery);

      return passesCheckboxFilter && passesGalleryFilter;
    })
      .map(({ img }) => img);

    gallery.innerHTML = '';
    groupImagesByPrefix(visibleImages);
    enableZoomDrag();
  };

  allCheckboxes.forEach(cb => cb.addEventListener('change', filter));
  modeSelect.addEventListener('change', filter);

  triggerFilter = filter;
  filter();
}

function initGallerySearchFilter(images) {
  const input = document.getElementById('gallery-search-input');
  const suggestionsBox = document.getElementById('gallery-suggestions');
  const labelsBox = document.getElementById('gallery-labels');
  if (!input || !suggestionsBox || !labelsBox) return;

  const galleryValues = [...new Set(images.map(img => img.dataset.gallery).filter(Boolean))];

  const compareGallery = (a, b) => {
    const aNums = a.split('-').map(s => parseInt(s, 10) || 0);
    const bNums = b.split('-').map(s => parseInt(s, 10) || 0);
    const len = Math.max(aNums.length, bNums.length);
    for (let i = 0; i < len; i++) {
      const numA = aNums[i] ?? 0;
      const numB = bNums[i] ?? 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  };

  galleryValues.sort(compareGallery);

  const renderLabels = () => {
    labelsBox.innerHTML = '';
    [...selectedGalleryValues].sort(compareGallery).forEach(value => {
      const label = document.createElement('span');
      label.className = 'gallery-label';
      label.innerHTML = `${value} <button type="button" aria-label="Retirer">&times;</button>`;
      label.querySelector('button').addEventListener('click', () => {
        selectedGalleryValues.delete(value);
        renderLabels();
        triggerFilter();
      });
      labelsBox.appendChild(label);
    });
  };

  const renderSuggestions = (query) => {
    suggestionsBox.innerHTML = '';
    if (!query) {
      suggestionsBox.style.display = 'none';
      return;
    }
    const matches = galleryValues
      .filter(v => v.startsWith(query) && !selectedGalleryValues.has(v))
      .slice(0, 30); // limite d'affichage, modifiable

    if (matches.length === 0) {
      suggestionsBox.style.display = 'none';
      return;
    }

    matches.forEach(value => {
      const item = document.createElement('div');
      item.className = 'gallery-suggestion-item';
      item.textContent = value;
      item.addEventListener('click', () => {
        selectedGalleryValues.add(value);
        input.value = '';
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        renderLabels();
        triggerFilter();
      });
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = 'block';
  };

  input.addEventListener('input', () => renderSuggestions(input.value.trim()));
  input.addEventListener('focus', () => renderSuggestions(input.value.trim()));
  document.addEventListener('click', (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== input) {
      suggestionsBox.style.display = 'none';
    }
  });
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

      [...groups.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([prefix, imgs]) => {
      const groupDiv = document.createElement("div");
      groupDiv.classList.add("group");
      groupDiv.dataset.group = prefix;
      const sortedGroup = sortImages(imgs);
      buildGalleryLayout(sortedGroup, groupDiv);
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

const sortedImages = 
  sortImages(galleryImages);
  autoPopulateDatasets(sortedImages);
  buildCollections(sortedImages);
  applyLazyLoading(sortedImages);
  createFilterCheckboxes(sortedImages);
  initGallerySearchFilter(sortedImages);
  enableCollapsibleFilters(); 
  enableTagBackgroundChange();
  groupImagesByPrefix(sortedImages);
  enableZoomDrag();
  retryUnloadedImages(sortedImages);

});
