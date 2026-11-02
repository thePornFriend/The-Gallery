document.addEventListener("DOMContentLoaded", () => {

  const gallery = document.getElementById("gallery");
  const galleryImages = Array.from(gallery.querySelectorAll("img"));

  // --- État du filtre "Gallery" (recherche par data-gallery) ---
  let selectedGalleryValues = new Set();
  let triggerFilter = () => {};

  // --- État du filtre couleur/luminosité ---
  let colorFilter = {
    active: false,
    colorActive: false,
    hue: 0,
    lumActive: false,
    luminance: 0.5,
    minSimilarity: 90
  };

  // --- Coordination du fond de page ---
  let chiaroscuroActive = false;
  let currentNeonColor = '#FF0080';
  let neonController = null;
  const CHIARO_YELLOW = '#7A6500';

  // --- Groupes de studios ---
  const STUDIO_GROUPS = {
    'Aylo (aka. MindGeek)' : ['Brazzers', 'Digital Playground', 'Letsdoit', 'Mofos', 'Reality Kings', 'Twistys'],
    'Vixen Media Group': ['Blacked', 'Deeper', 'MILFY', 'Slayed', 'Tushy', 'Vixen','Wifey'],
    'MetArt Network':    ['MetArt', 'SexArt', 'Straplez', 'Viv Thomas', 'Domai', 'TLE|The Life Erotic', 'Stunning 18'],
    'Nubiles Porn': ['Bratty Sis', 'Cheating Sis', 'Cum Swapping Sis', 'Family Swap', 'Moms Teach Sex', 'My Family Pies', 'Step Siblings Caught'],
    'New Sensations' : ['Hotwife XXX', 'Family XXX' ],
    'Letsdoit Channels' : ['A Girl Knows', 'Her Limit', 'Horny Hostel', 'Latina Milf', 'The White Boxxx'],
    'Adult Time' : ['21Naturals', 'Girlsway', 'Lez Be Bad' ]
  };

  // --- Calque noir→transparent (Chiaroscuro) ---
  function getOrCreateChiaroLayer() {
    let el = document.getElementById('chiaro-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'chiaro-layer';
      el.style.cssText =
        'position:fixed;inset:0;z-index:-1;pointer-events:none;' +
        'background:linear-gradient(to bottom right, #000 0%, transparent 100%);' +
        'opacity:0;transition:opacity 0.6s ease;';
      document.body.appendChild(el);
    }
    return el;
  }

  function updateBodyBackground() {
    const chiaroLayer = getOrCreateChiaroLayer();

    let bgColor = '';
    let bgTransition = '0.3s ease';

    if (colorFilter.colorActive || colorFilter.lumActive) {
      const hue   = colorFilter.colorActive ? colorFilter.hue : 0;
      const sat   = colorFilter.colorActive ? 100 : 0;
      const light = colorFilter.lumActive
        ? Math.round(colorFilter.luminance * 100)
        : 50;
      bgColor = `hsl(${hue}, ${sat}%, ${light}%)`;
      bgTransition = '0.15s ease';
    } else if (neonController && neonController.isActive()) {
      bgColor = currentNeonColor;
      bgTransition = '3s linear';
    } else if (chiaroscuroActive) {
      bgColor = CHIARO_YELLOW;
      bgTransition = '0.6s ease';
    }

    document.body.style.transition = `background-color ${bgTransition}`;
    document.body.style.backgroundColor = bgColor;

    chiaroLayer.style.opacity =
      (chiaroscuroActive && !(colorFilter.colorActive || colorFilter.lumActive))
        ? '1' : '0';
  }

  // --- Détection et gestion des doublons ---
  function handleDuplicateImages(images) {
    const srcMap = new Map();
    images.forEach(img => {
      const src = img.src;
      if (!srcMap.has(src)) srcMap.set(src, []);
      srcMap.get(src).push(img);
    });

    const duplicates = [...srcMap.entries()].filter(([_, imgs]) => imgs.length > 1);
    if (duplicates.length === 0) return;

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
      thumb.loading = "eager";
      thumb.addEventListener("click", () => {
        navigator.clipboard.writeText(src);
        thumb.style.outline = "2px solid #4CAF50";
        setTimeout(() => (thumb.style.outline = ""), 1000);
      });
      thumbsContainer.appendChild(thumb);
    });

    modal.style.display = "flex";

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
    if (!src.startsWith("https://ik.imagekit.io/")) return;

    try {
      const url = new URL(src);
      const pathParts = url.pathname.split("/").filter(Boolean);

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

        if (!img.dataset.orientation) {
          const match = file.match(/-(p|l|s|o)(\d+)?(?=\.|$)/i);
          if (match) {
            const map = { p: "portrait", l: "landscape", s: "square", o: "other" };
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
    if (/^\d{4}$/.test(b)) return true;
    if (/^\d{1,2}\s+[a-zà-ÿ]+\s+\d{4}$/i.test(b)) return true;
    if (/^[a-zà-ÿ]+\s+\d{4}$/i.test(b)) return true;
    return false;
  }

  function parseActressField(raw) {
    return raw.split(',').map(part => {
      const trimmed = part.trim();
      const excluded = trimmed.startsWith('(-)');
      const cropped  = trimmed.startsWith('(+)');
      const name = unescapeDash(
        (excluded || cropped ? trimmed.slice(3) : trimmed).trim()
      );
      return { name, excluded, cropped };
    }).filter(a => a.name);
  }

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

    if (!actressFound && remaining.length && remaining[0].i === 0) {
      data.actresses = parseActressField(remaining.shift().block);
    }
    if (!studioFound && remaining.length && remaining[0].i === 1) {
      data.studio = remaining.shift().block;
    }

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

  function applyCombinedData(img) {
    const raw1 = img.getAttribute('data-1');
    const raw2 = img.getAttribute('data-2');

    if (raw1) {
      const parsed1 = parseData1(raw1);
      if (parsed1) {
        img.dataset.collectionActresses = parsed1.actresses.map(a => a.name).join(', ');
        const visible = parsed1.actresses.filter(a => !a.excluded).map(a => a.name);
        if (!img.dataset.actress) {
          img.dataset.actress = (visible.length ? visible : parsed1.actresses.map(a => a.name)).join(', ');
        }
        const cropped = parsed1.actresses.filter(a => a.cropped).map(a => a.name);
        if (cropped.length && !img.dataset.croppedActresses) {
          img.dataset.croppedActresses = cropped.join(', ');
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

  function buildCollections(images) {
    const collections = new Map();

    images.forEach(img => {
      if (!img.dataset.title && !img.dataset.collectionActresses) return;

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

  function autoPopulateDatasets(images) {
    images.forEach(img => {
      applyCombinedData(img);
      if (!img.dataset.gallery || !img.dataset.actress) {
        extractDataFromURL(img);
      }
    });
  }

  // --- Zoom, Drag, Reset + Lightbox ---
  function enableZoomDrag() {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = `
      <span class="lightbox-arrow left">&#10094;</span>
      <div class="lightbox-main">
        <div class="lightbox-stage">
          <img src="" alt="">
        </div>
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

    const lightboxImg = lightbox.querySelector(".lightbox-main img");
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
      const cropped = new Set(
        cleanActressNames(img.dataset.croppedActresses || "").map(n => n.toLowerCase())
      );
      const labeled = actresses.map(n =>
        cropped.has(n.toLowerCase()) ? `${n} (<i>cropped</i>)` : n
      );
      return `Image n° : ${galleryId}<br>${joinWithAmpersand(labeled)}`;
    }

    function applyColorFilterFromHex(hex) {
      const active = document.getElementById('color-active');
      const hue    = document.getElementById('color-hue');
      if (!active || !hue) {
        console.warn("Filtre couleur non initialisé");
        return;
      }

      const hsl = hexToHsl(hex);
      const hueValue = Math.round(hsl.h);

      active.checked = true;
      hue.value = hueValue;

      active.dispatchEvent(new Event('input'));
      hue.dispatchEvent(new Event('input'));
    }

    function renderColors(img) {
      colorsBox.innerHTML = "";

      const { hexes } = parseClr(img);

      if (!hexes.length) {
        colorsBox.style.display = "none";
        return;
      }
      colorsBox.style.display = "flex";

      hexes.forEach(hex => {
        const item = document.createElement("div");
        item.className = "lightbox-color-item";
        item.title = "Filtrer par cette couleur";
        item.addEventListener("click", e => {
          e.stopPropagation();
          applyColorFilterFromHex(hex);
        });

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
      renderColors(img);
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

      // Double-clic pour ordinateur
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

      // Double-tap pour mobile (tactile)
      let lastTap = 0;
      container.addEventListener("touchend", (e) => {
        if (e.target.closest('.zoom-bar')) return;

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
          e.preventDefault(); // Empêche le zoom natif du navigateur
          if (scale === 1 && offsetX === 0 && offsetY === 0) {
            openLightbox(img);
          } else {
            scale = 1;
            offsetX = 0;
            offsetY = 0;
            zoomInput.value = 1;
            updateTransform();
          }
        }
        lastTap = currentTime;
      }, { passive: false });
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

  // --- Filtre couleur + luminance ---
  function hexToHsl(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let hue = 0, s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue = (hue * 60 + 360) % 360;
    }
    const chroma = s * (1 - Math.abs(2 * l - 1));
    return { h: hue, s, l, chroma };
  }

  // parse data-clr : couleurs (#hex) + luminance optionnelle (nombre 0-1 ou 0-100)
  function parseClr(img) {
    if (img._clrData) return img._clrData;

    const raw = (img.dataset.clr || '').trim();
    const data = { colors: [], hexes: [], luminance: null };

    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);

    parts.forEach(part => {
      if (part.startsWith('#')) {
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(part)) {
          data.hexes.push(part);
        }
      } else if (data.luminance === null) {
        const v = parseFloat(part);
        if (!isNaN(v) && /^\d+(?:\.\d+)?$/.test(part)) {
          const normalized = v > 1 ? v / 100 : v;
          data.luminance = Math.max(0, Math.min(1, normalized));
        }
      }
    });

    data.colors = data.hexes.map(hexToHsl);

    img._clrData = data;
    return data;
  }

  function getImageColors(img) {
    return parseClr(img).colors;
  }

  function getImageLuminance(img) {
    return parseClr(img).luminance;
  }

  function hueSimilarity(h1, h2) {
    const diff = Math.abs(h1 - h2);
    const d = Math.min(diff, 360 - diff);
    return 100 * (1 - d / 180);
  }

  function matchesColor(img) {
    if (!colorFilter.active) return true;

    if (colorFilter.colorActive) {
      const match = getImageColors(img).some(c =>
        c.chroma >= 0.08 &&
        hueSimilarity(c.h, colorFilter.hue) >= colorFilter.minSimilarity
      );
      if (!match) return false;
    }

    if (colorFilter.lumActive) {
      const lum = getImageLuminance(img);
      if (lum === null) return false;
      const tolerance = (100 - colorFilter.minSimilarity) / 100;
      if (Math.abs(lum - colorFilter.luminance) > tolerance) return false;
    }

    return true;
  }

  function initColorFilter() {
    const sections = document.querySelector('.filter-sections');
    if (!sections) return;

    const style = document.createElement('style');
    style.textContent = `
      .color-filter-box { padding: 6px 0 12px; }
      .color-filter-box .row { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
      .color-filter-box input[type=range] { -webkit-appearance: none; appearance: none; height: 14px; border-radius: 7px; outline: none; flex: 1; }
      .color-filter-box input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 22px; border-radius: 4px; background: #fff; border: 2px solid #333; cursor: pointer; }
      .color-filter-box input[type=range]::-moz-range-thumb { width: 12px; height: 22px; border-radius: 4px; background: #fff; border: 2px solid #333; cursor: pointer; }
      .color-filter-box input[type=range]:disabled { opacity: 0.35; cursor: not-allowed; }
      .color-filter-box input[type=range]:disabled::-webkit-slider-thumb { cursor: not-allowed; }
      .color-filter-box input[type=range]:disabled::-moz-range-thumb { cursor: not-allowed; }
      #color-hue { background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%); }
      #luminance-slider { background: linear-gradient(to right, #000, #fff); }
      #color-sim { background: #ccc; }
      .color-filter-box .filter-toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; font-weight: 600; min-width: 110px; }
      .color-filter-box .filter-toggle input[type=checkbox] { cursor: pointer; }
    `;
    document.head.appendChild(style);

    const title = document.createElement('h3');
    title.textContent = 'Colour';
    const box = document.createElement('div');
    box.className = 'color-filter-box';
    box.innerHTML = `
      <div class="row">
        <label class="filter-toggle">
          <input type="checkbox" id="color-active"> Couleur
        </label>
        <input type="range" id="color-hue" min="0" max="360" step="1" value="0" disabled>
        <span id="color-hue-val">0°</span>
      </div>
      <div class="row">
        <label class="filter-toggle">
          <input type="checkbox" id="luminance-active"> Luminosité
        </label>
        <input type="range" id="luminance-slider" min="0" max="100" step="1" value="50" disabled>
        <span id="luminance-val">50 %</span>
      </div>
      <div class="row">
        <span>Ressemblance min.</span>
        <input type="range" id="color-sim" min="50" max="100" step="1" value="90">
        <span id="color-sim-val">90 %</span>
      </div>
    `;
    sections.appendChild(title);
    sections.appendChild(box);

    const active    = box.querySelector('#color-active');
    const hue       = box.querySelector('#color-hue');
    const lumActive = box.querySelector('#luminance-active');
    const lumSlider = box.querySelector('#luminance-slider');
    const sim       = box.querySelector('#color-sim');
    const hueVal    = box.querySelector('#color-hue-val');
    const lumVal    = box.querySelector('#luminance-val');
    const simVal    = box.querySelector('#color-sim-val');

    let timer = null;
    const update = () => {
      colorFilter.colorActive = active.checked;
      colorFilter.hue = parseInt(hue.value, 10);
      colorFilter.lumActive = lumActive.checked;
      colorFilter.luminance = parseInt(lumSlider.value, 10) / 100;
      colorFilter.minSimilarity = parseInt(sim.value, 10);
      colorFilter.active = colorFilter.colorActive || colorFilter.lumActive;

      hue.disabled = !active.checked;
      lumSlider.disabled = !lumActive.checked;

      hueVal.textContent = `${colorFilter.hue}°`;
      lumVal.textContent = `${parseInt(lumSlider.value, 10)} %`;
      simVal.textContent = `${colorFilter.minSimilarity} %`;

      updateBodyBackground();

      clearTimeout(timer);
      timer = setTimeout(() => triggerFilter(), 150);
    };

    [active, hue, lumActive, lumSlider, sim].forEach(el =>
      el.addEventListener('input', update)
    );
  }

  // --- Grille checkbox générique (actrices, tags) ---
  function buildCheckboxGrid(container, items, displayName = k => k) {
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const sorted = [...items.keys()].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), 'fr', { sensitivity: 'base' })
    );
    const perCol = Math.ceil(sorted.length / 5);
    container.innerHTML = '';
    const checkboxes = [];

    for (let i = 0; i < 5; i++) {
      const col = document.createElement('div');
      col.className = 'column';
      for (const item of sorted.slice(i * perCol, (i + 1) * perCol)) {
        const label = document.createElement('label');
        const display = capitalize(displayName(item));
        label.innerHTML = `<input type="checkbox" value="${item}"> ${display} (${items.get(item)})`;
        const cb = label.firstChild;
        checkboxes.push(cb);
        col.appendChild(label);
      }
      container.appendChild(col);
    }

    return checkboxes;
  }

  // --- Grille studios avec groupes ---
  function buildStudioFilterGrid(container, studioCount, imgData) {
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

    const studioToGroup = {};
    const groupCounts = {};
    Object.entries(STUDIO_GROUPS).forEach(([groupName, members]) => {
      const memberSet = new Set(members.map(m => m.toLowerCase()));
      let count = 0;
      imgData.forEach(({ studios }) => {
        if (studios.some(s => memberSet.has(s.toLowerCase()))) count++;
      });
      groupCounts[groupName] = count;
    });
    Object.entries(STUDIO_GROUPS).forEach(([groupName, members]) => {
      members.forEach(m => { studioToGroup[m.toLowerCase()] = groupName; });
    });

    const allStudios = [...studioCount.keys()].sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );

    const checkboxRegistry = new Map();
    let syncingStudioSiblings = false;

    function createCheckbox(value) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = value;

      if (!checkboxRegistry.has(value)) checkboxRegistry.set(value, []);
      checkboxRegistry.get(value).push(cb);

      cb.addEventListener('change', () => {
        if (syncingStudioSiblings) return;

        const siblings = checkboxRegistry.get(value);
        const master = siblings[0];

        syncingStudioSiblings = true;
        try {
          siblings.forEach(s => {
            if (s !== cb) s.checked = cb.checked;
          });

          if (cb !== master) {
            master.dispatchEvent(new Event('change'));
          } else {
            siblings.forEach(s => {
              if (s !== cb) s.dispatchEvent(new Event('change'));
            });
          }
        } finally {
          syncingStudioSiblings = false;
        }
      });

      return cb;
    }

    const createColumn = () => {
      const col = document.createElement('div');
      col.className = 'column';
      return col;
    };

    container.innerHTML = '';

    const globalList = document.createElement('div');
    globalList.className = 'prod-global-list';

    const NUM_COLS = 4;
    const globalColumns = Array.from({ length: NUM_COLS }, createColumn);
    globalColumns.forEach(col => globalList.appendChild(col));

    const perCol = Math.ceil(allStudios.length / NUM_COLS);

    allStudios.forEach((studioName, idx) => {
      const colIndex = Math.min(Math.floor(idx / perCol), NUM_COLS - 1);
      const col = globalColumns[colIndex];

      const label = document.createElement('label');
      const cb = createCheckbox(studioName);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(
        ` ${capitalize(studioName)} (${studioCount.get(studioName)})`
      ));
      col.appendChild(label);
    });

    container.appendChild(globalList);

    const separator = document.createElement('hr');
    separator.className = 'prod-separator';
    container.appendChild(separator);

    const groupedList = document.createElement('div');
    groupedList.className = 'prod-grouped-list';

    const groups = {};
    allStudios.forEach(name => {
      const g = studioToGroup[name.toLowerCase()];
      if (g) {
        if (!groups[g]) groups[g] = [];
        groups[g].push(name);
      }
    });

    const groupEntries = Object.entries(groups).sort((a, b) =>
      a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' })
    );

    groupEntries.forEach(([groupName, members]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'prod-group';

      const header = document.createElement('label');
      header.className = 'prod-group-header';
      const parentCb = document.createElement('input');
      parentCb.type = 'checkbox';
      header.appendChild(parentCb);
      header.appendChild(document.createTextNode(
        ` ${groupName} (${groupCounts[groupName] || 0})`
      ));
      groupDiv.appendChild(header);

      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'prod-group-items';
      const childCbs = [];

      members.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

      members.forEach(studioName => {
        const label = document.createElement('label');
        const cb = createCheckbox(studioName);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(
          ` ${capitalize(studioName)} (${studioCount.get(studioName)})`
        ));
        itemsDiv.appendChild(label);
        childCbs.push(cb);
      });

      const syncParent = () => {
        const checked = childCbs.filter(c => c.checked).length;
        if (checked === 0) {
          parentCb.checked = false;
          parentCb.indeterminate = false;
        } else if (checked === childCbs.length) {
          parentCb.checked = true;
          parentCb.indeterminate = false;
        } else {
          parentCb.checked = false;
          parentCb.indeterminate = true;
        }
      };

      parentCb.addEventListener('change', () => {
        const target = parentCb.checked;
        childCbs.forEach(c => {
          c.checked = target;
          c.dispatchEvent(new Event('change'));
        });
        syncParent();
      });

      childCbs.forEach(c => c.addEventListener('change', syncParent));

      groupDiv.appendChild(itemsDiv);
      groupedList.appendChild(groupDiv);
    });

    container.appendChild(groupedList);

    const uniqueCheckboxes = allStudios.map(s => checkboxRegistry.get(s)[0]);
    return uniqueCheckboxes;
  }

  // --- Filtres actrices, tags, studios ---
  function createFilterCheckboxes(images) {
    const mainList     = document.querySelector('.actress-list-main');
    const moreList     = document.querySelector('.actress-list-more');
    const tagList      = document.querySelector('.tag-list');
    const modeSelect   = document.getElementById('filter-mode');
    const toggleBtn    = document.querySelector('.actress-toggle');
    const actressSec   = document.querySelector('.actress-section');

    images.forEach(img => {
      if (!img.dataset.studio || img.dataset.studio.trim() === '') {
        img.dataset.studio = 'unassigned';
      }
    });

    if (!mainList || !moreList || !tagList || !modeSelect) return;

    // --- Helpers de normalisation ---
    const stripParens  = n => n.replace(/^\(|\)$/g, '').trim();
    const isAmateur    = n => /^\(.*\)$/.test(n.trim());
    const stripPrefix  = k => k.replace(/^(main|am):/, '');

    const isAmateurEntry = n =>
      isAmateur(n) || n.trim().toLowerCase() === 'amateur';

    const normalizeAmName = n => {
      const stripped = stripParens(n);
      const lower = stripped.toLowerCase();
      if (lower === 'amateur' || lower === 'unknown') return 'Unknown';
      return stripped;
    };

    const countMap = (items) => {
      const count = new Map();
      items.forEach(arr => arr.forEach(v => count.set(v, (count.get(v) || 0) + 1)));
      return count;
    };

    const imgData = images.map(img => {
      const rawActs = (img.dataset.actress || '').split(',').map(n => n.trim()).filter(Boolean);
      const mainActs    = rawActs.filter(n => !isAmateurEntry(n)).map(n => 'main:' + n);
      const amateurActs = rawActs.filter(n => isAmateurEntry(n)).map(n => 'am:' + normalizeAmName(n));
      const tags = (img.dataset.tag || '').split(',').map(t => t.trim()).filter(Boolean);
      const studios = (img.dataset.studio || '').split(',').map(s => s.trim()).filter(Boolean);
      return { img, acts: [...mainActs, ...amateurActs], mainActs, amateurActs, tags, studios };
    });

    const mainCount    = countMap(imgData.map(d => d.mainActs));
    const amateurCount = countMap(imgData.map(d => d.amateurActs));
    const tagCount     = countMap(imgData.map(d => d.tags));
    const studioCount  = countMap(imgData.map(d => d.studios));

    const mainCheckboxes    = buildCheckboxGrid(mainList, mainCount, stripPrefix);
    const amateurCheckboxes = buildCheckboxGrid(moreList, amateurCount, stripPrefix);
    const tagCheckboxes     = buildCheckboxGrid(tagList, tagCount);

        // --- Raccourci "Amateur (N)" en fin du panneau 1 ---
    const amateurImagesCount = imgData.filter(d => d.amateurActs.length > 0).length;
    let amateurCb = null;

    if (amateurImagesCount > 0) {
      const columns = mainList.querySelectorAll('.column');
      const lastCol = columns[columns.length - 1]; // On cible la dernière colonne
      
      if (lastCol) {
        const label = document.createElement('label');
        label.className = 'amateur-all-label';
        label.innerHTML = `<input type="checkbox" value="am:__all__"> Amateur (${amateurImagesCount})`;
        amateurCb = label.firstChild;
        
        lastCol.appendChild(label);        // Ajout à la fin de la colonne
        mainCheckboxes.push(amateurCb);    // Ajout à la fin du tableau de checkboxes

        // Pulse sur le toggle : au survol OU quand la case est cochée
        if (toggleBtn) {
          const updatePulse = () => {
            const isHovered = label.matches(':hover');
            toggleBtn.classList.toggle('pulse-hint', isHovered || amateurCb.checked);
          };
          label.addEventListener('mouseenter', updatePulse);
          label.addEventListener('mouseleave', updatePulse);
          amateurCb.addEventListener('change', updatePulse);
        }
      }
    }
    const actressCheckboxes = [...mainCheckboxes, ...amateurCheckboxes];

    // --- Toggle panneau 1 / panneau 2 ---
    if (toggleBtn && actressSec) {
      if (amateurCount.size === 0) {
        toggleBtn.style.display = 'none';
      } else {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          actressSec.classList.toggle('more-active');
          toggleBtn.textContent = actressSec.classList.contains('more-active')
            ? '← See main actresses'
            : 'See more actresses →';
        });
      }
    }

    const prodList = document.querySelector('.prod-list');
    const studioCheckboxes = prodList
      ? buildStudioFilterGrid(prodList, studioCount, imgData)
      : [];

    const allCheckboxes = [...actressCheckboxes, ...tagCheckboxes, ...studioCheckboxes];

    // --- Co-occurrence des actrices (am:__all__ exclu) ---
    const normalizeActress = n => {
      const t = n.trim();
      if (isAmateurEntry(t)) return 'am:' + normalizeAmName(t);
      return 'main:' + t;
    };

    const rawToDisplay = new Map();
    const rawCo         = new Map();
    const displayToRaw  = new Map();
    const displayCo     = new Map();

    images.forEach(img => {
      const raw = (img.dataset.collectionActresses || img.dataset.actress || '')
        .split(',').map(n => n.trim()).filter(Boolean);
      if (!raw.length) return;
      raw.forEach(n => {
        rawToDisplay.set(n, normalizeActress(n));
        if (!rawCo.has(n)) rawCo.set(n, new Set());
      });
      if (raw.length > 1) {
        raw.forEach(a => raw.forEach(b => {
          if (a !== b) rawCo.get(a).add(b);
        }));
      }
    });

    rawToDisplay.forEach((display, raw) => {
      if (!displayToRaw.has(display)) displayToRaw.set(display, new Set());
      displayToRaw.get(display).add(raw);
    });

    displayToRaw.forEach((rawSet, display) => {
      const coSet = new Set();
      rawSet.forEach(raw => {
        const s = rawCo.get(raw);
        if (!s) return;
        s.forEach(other => {
          const d = rawToDisplay.get(other);
          if (d && d !== display) coSet.add(d);
        });
      });
      displayCo.set(display, coSet);
    });

    const actressLabelMap = new Map();
    actressCheckboxes.forEach(cb => {
      const label = cb.closest('label');
      if (label) actressLabelMap.set(cb.value, label);
    });

    const updateRelatedActresses = () => {
      const selectedSet = new Set(
        actressCheckboxes
          .filter(cb => cb.checked && cb.value !== 'am:__all__')
          .map(cb => cb.value)
      );
      const related = new Set();
      selectedSet.forEach(v => {
        const s = displayCo.get(v);
        if (s) s.forEach(x => related.add(x));
      });
      actressLabelMap.forEach((label, value) => {
        if (value === 'am:__all__') return;
        const isRelated = !selectedSet.has(value) && related.has(value);
        label.classList.toggle('related-actress', isRelated);
      });
    };

    // --- filter() avec gestion de am:__all__ ---
    const filter = () => {
      const selected = [...new Set(allCheckboxes.filter(cb => cb.checked).map(cb => cb.value))];
      const inclusive = modeSelect.value === 'inclusive';

      const selectedAll  = selected.includes('am:__all__');
      const selectedRest = selected.filter(v => v !== 'am:__all__');

      const visibleImages = imgData
        .filter(({ acts, tags, studios, amateurActs, img }) => {
          let passesCheckboxFilter;

          if (selected.length === 0) {
            passesCheckboxFilter = true;
          } else if (inclusive) {
            const matchAll  = selectedAll && amateurActs.length > 0;
            const matchRest = selectedRest.some(v =>
              acts.includes(v) || tags.includes(v) || studios.includes(v)
            );
            passesCheckboxFilter = matchAll || matchRest;
          } else {
            const allVals = [...acts, ...tags, ...studios];
            const allCovered = allVals.every(v =>
              selectedRest.includes(v) || (selectedAll && v.startsWith('am:'))
            );
            const allReq = !selectedAll || amateurActs.length > 0;
            passesCheckboxFilter = allReq && allCovered;
          }

          const passesGalleryFilter = selectedGalleryValues.size === 0
            || selectedGalleryValues.has(img.dataset.gallery);

          return passesCheckboxFilter && passesGalleryFilter && matchesColor(img);
        })
        .map(({ img }) => img);

      gallery.innerHTML = '';
      groupImagesByPrefix(visibleImages);
      enableZoomDrag();
      updateRelatedActresses();
    };

    // Debounce pour éviter les appels redondants lors des cascades
    let filterTimer = null;
    const debouncedFilter = () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(filter, 0);
    };

    allCheckboxes.forEach(cb => cb.addEventListener('change', debouncedFilter));
    modeSelect.addEventListener('change', debouncedFilter);

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
      if (!query) { suggestionsBox.style.display = 'none'; return; }

      const matches = galleryValues
        .filter(v => v.startsWith(query) && !selectedGalleryValues.has(v))
        .slice(0, 30);

      if (matches.length === 0) { suggestionsBox.style.display = 'none'; return; }

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
      let list = title.nextElementSibling;

      // Cas spécial : h3 dans .actress-header → on cible le slider entier
      if (title.closest('.actress-header')) {
        list = title.closest('.actress-section')?.querySelector('.actress-slider');
      }

      if (!list) return;

      title.style.cursor = 'pointer';
      title.addEventListener('click', () => {
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? '' : 'none';
        title.classList.toggle('collapsed', !isHidden);
      });
    });
  }

  // --- Background piloté par les tags ---
  function enableTagBackgroundChange() {
    const tagCheckboxes = document.querySelectorAll('.tag-list input[type="checkbox"]');
    if (!tagCheckboxes.length) return;

    const NEON_TAG   = 'rgb led/neon';
    const CHIARO_TAG = 'chiaroscuro';

    const neonColors = [
      '#FF0080', '#FF8C00', '#FFEE00', '#00FF88',
      '#00E5FF', '#7A00FF', '#FF00C8'
    ];

    let neonInterval = null;
    let neonIndex = 0;

    const applyNeonColor = () => {
      currentNeonColor = neonColors[neonIndex];
      neonIndex = (neonIndex + 1) % neonColors.length;
      updateBodyBackground();
    };

    const startNeon = () => {
      if (neonInterval) return;
      applyNeonColor();
      neonInterval = setInterval(applyNeonColor, 3000);
    };

    const stopNeon = () => {
      if (neonInterval) {
        clearInterval(neonInterval);
        neonInterval = null;
      }
      neonIndex = 0;
    };

    const isChecked = (val) => Array.from(tagCheckboxes).some(
      cb => cb.checked && cb.value.trim().toLowerCase() === val
    );
    const isNeonChecked   = () => isChecked(NEON_TAG);
    const isChiaroChecked = () => isChecked(CHIARO_TAG);

    const updateFromTags = () => {
      chiaroscuroActive = isChiaroChecked();
      if (isNeonChecked()) startNeon();
      else stopNeon();
      updateBodyBackground();
    };

    neonController = {
      isActive: isNeonChecked,
      update:   updateFromTags
    };

    [...tagCheckboxes].forEach(cb => {
      const v = cb.value.trim().toLowerCase();
      if (v === NEON_TAG || v === CHIARO_TAG) {
        cb.addEventListener('change', updateFromTags);
      }
    });

    updateFromTags();
  }

  // --- Groupement d'images (avec fusion des groupes trop petits) ---

  function computeColumns(images) {
    const cols = [];
    let remaining = [...images];
    let leftover = [];

    while (remaining.length) {
      const batch = [...leftover, ...remaining.splice(0, 12)];
      leftover = [];

      const portraits  = batch.filter(img => img.dataset.orientation === "portrait");
      const landscapes = batch.filter(img => img.dataset.orientation === "landscape");
      let unused = [...batch];

      if (portraits.length === landscapes.length && batch.length === 12) {
        cols.push({ type: '12-mixed', imgs: batch });
      } else {
        while (unused.filter(img => img.dataset.orientation === "portrait").length >= 4) {
          const fourP = unused.filter(img => img.dataset.orientation === "portrait").slice(0, 4);
          cols.push({ type: '4P', imgs: fourP });
          unused = unused.filter(img => !fourP.includes(img));
        }
        while (unused.filter(img => img.dataset.orientation === "landscape").length >= 6) {
          const sixL = unused.filter(img => img.dataset.orientation === "landscape").slice(0, 6);
          cols.push({ type: '6L', imgs: sixL });
          unused = unused.filter(img => !sixL.includes(img));
        }
        leftover = [...unused];
      }
    }

    leftover.forEach(img => cols.push({ type: 'last', imgs: [img] }));
    return cols;
  }

  function hasVisibleIncompleteColumns(images) {
    const cols = computeColumns(images);

    const L_W = 99.5 / 3.2 / 100;   // ≈ 0.3109
    const P_W = L_W * 2 / 3;        // ≈ 0.2073

    let x = 0;
    for (const col of cols) {
      if (col.type === 'last') return x < 1;
      if (col.type === '4P')         x += P_W;
      else if (col.type === '6L')    x += L_W;
      else if (col.type === '12-mixed') x += 2 * L_W;
    }
    return false;
  }

  function groupImagesByPrefix(images) {
    const prefixGroups = new Map();
    images.forEach(img => {
      const data = img.getAttribute("data-gallery") || "";
      const prefix = parseInt(data.split("-")[0], 10) || 0;
      if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
      prefixGroups.get(prefix).push(img);
    });

    const sortedPrefixes = [...prefixGroups.keys()].sort((a, b) => a - b);
    const batches = [];

    let i = 0;
    while (i < sortedPrefixes.length) {
      const start = i;
      let acc = [...prefixGroups.get(sortedPrefixes[i])];
      acc = sortImages(acc);
      i++;

      while (i < sortedPrefixes.length && hasVisibleIncompleteColumns(acc)) {
        acc = acc.concat(prefixGroups.get(sortedPrefixes[i]));
        acc = sortImages(acc);
        i++;
      }

      batches.push({ images: acc, prefixes: sortedPrefixes.slice(start, i) });
    }

    gallery.innerHTML = "";
    batches.forEach(({ images: imgs, prefixes }) => {
      const groupDiv = document.createElement("div");
      groupDiv.classList.add("group");
      groupDiv.dataset.group = prefixes.join("-");
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

    const cols = computeColumns(images);
    container.innerHTML = "";
    const galleryLine = createDiv("line");

    cols.forEach(col => {
      if (col.type === '12-mixed') {
        const column = createDiv("column");
        column.dataset.columntype = "12-mixed";
        let unprocessed = [...col.imgs];

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
            const ic = createDiv("img-container");
            ic.dataset.orientation = img.dataset.orientation;
            ic.appendChild(img);
            lineDiv.appendChild(ic);
          });
          column.appendChild(lineDiv);
        }
        galleryLine.appendChild(column);
      } else {
        const column = createDiv("column");
        column.dataset.columntype = col.type === 'last' ? 'last-columntype' : col.type;
        col.imgs.forEach(img => {
          const ic = createDiv("img-container");
          ic.dataset.orientation = img.dataset.orientation;
          ic.appendChild(img);
          column.appendChild(ic);
        });
        galleryLine.appendChild(column);
      }
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

  // --- Séquence d'initialisation ---
  const sortedImages = sortImages(galleryImages);
  autoPopulateDatasets(sortedImages);
  buildCollections(sortedImages);
  applyLazyLoading(sortedImages);
  createFilterCheckboxes(sortedImages);
  initGallerySearchFilter(sortedImages);
  initColorFilter();
  enableCollapsibleFilters();
  enableTagBackgroundChange();
  groupImagesByPrefix(sortedImages);
  enableZoomDrag();
  retryUnloadedImages(sortedImages);

});
