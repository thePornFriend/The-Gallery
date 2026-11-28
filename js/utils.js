// ==========================================
// UTILITAIRES DE PARSING ET DE TRI
// ==========================================

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
        // On ne garde QUE les actrices visibles. Si tout le monde est en (-), ça reste vide.
        img.dataset.actress = visible.join(', ');
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

      // ⬇⬇⬇ LOGIQUE D'AUTO-TAGGING ⬇⬇⬇
      if (window.AUTO_TAG_RULES) {
          let currentTags = img.dataset.tag ? img.dataset.tag.split(',').map(t => t.trim()) : [];
          let newTags = new Set(currentTags.filter(Boolean));

          parsed1.actresses.forEach(act => {
              // L'actrice doit être présente sur l'image : ni (-) ni (+)
              if (!act.excluded && !act.cropped) {
                  const nameLower = act.name.toLowerCase();
                  
                  // On parcourt nos règles (Asian, Ebony, etc.)
                  for (const [tagName, actressesList] of Object.entries(window.AUTO_TAG_RULES)) {
                      if (actressesList.some(a => a.toLowerCase() === nameLower)) {
                          newTags.add(tagName);
                      }
                  }
              }
          });

          if (newTags.size > 0) {
              img.dataset.tag = Array.from(newTags).join(', ');
          }
      }
      // ⬆⬆⬆ FIN LOGIQUE D'AUTO-TAGGING ⬆⬆⬆
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

  // Cette fonction ignore les zéros inutiles (ex: 01/03/2026 et 1/3/2026 deviennent 2026-3-1)
  function normalizeDate(dateStr) {
    if (!dateStr) return "no-date";
    // Regex : accepte 1 ou 2 chiffres pour le jour et le mois, et 4 pour l'année
    const match = dateStr.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = match[3];
        return `${year}-${month}-${day}`; // Renvoie "2026-3-1"
    }
    return dateStr.toLowerCase(); // Si ce n'est pas une date, on garde le texte brut
  }

  images.forEach(img => {
    if (!img.dataset.title && !img.dataset.collectionActresses) return;

    const actressKey = (img.dataset.collectionActresses || img.dataset.actress || '')
      .split(',').map(n => n.trim().toLowerCase()).filter(Boolean).sort().join('|');
      
    const dateKey = normalizeDate(img.dataset.date); // <-- On utilise la date nettoyée
    
    // La clé de la collection utilise la date nettoyée (donc 01/03/2026 et 1/3/2026 sont identiques)
    const key = [actressKey, img.dataset.studio || '', img.dataset.series || '', dateKey, img.dataset.title || ''].join('::');

    if (!collections.has(key)) {
      collections.set(key, {
        title: img.dataset.title || '',
        subtitle: img.dataset.subtitle || '',
        series: img.dataset.series || '',
        studio: img.dataset.studio || '',
        date: img.dataset.date || '', // On garde la première date brute rencontrée pour l'affichage
        actresses: new Set(),
        tags: new Set(),
        images: []
      });
    }

    const col = collections.get(key);
    (img.dataset.collectionActresses || img.dataset.actress || '')
      .split(',').map(n => n.trim().replace(/[()]/g, '')).filter(Boolean).forEach(n => col.actresses.add(n));
        // ⬇⬇⬇ MODIFICATION ICI ⬇⬇⬇
    let normalizedTagStr = img.dataset.tag || '';
    if (typeof normalizeTags === 'function') {
        normalizedTagStr = normalizeTags(normalizedTagStr);
    }
    normalizedTagStr.split(',').map(t => t.trim()).filter(Boolean).forEach(t => col.tags.add(t));
    // ⬆⬆⬆ FIN DE LA MODIFICATION ⬆⬆⬆
    col.images.push(img);
  });

  collections.forEach(col => {
    col.images = sortImages(col.images);
    col.images.forEach(i => { i._collection = col; });
  });

  return collections;
}
// ==========================================
// NORMALISATION DES TAGS (100% basée sur lists.js)
// ==========================================
function normalizeTags(tagsString) {
    if (!tagsString) return '';
    
    return tagsString.split(',').map(t => {
        let tag = t.trim();
        if (!tag) return '';

        // On vérifie si le tag est dans notre dictionnaire de lists.js
        if (window.TAG_ABBREVIATIONS) {
            const lowerTag = tag.toLowerCase();
            if (window.TAG_ABBREVIATIONS[lowerTag]) {
                return window.TAG_ABBREVIATIONS[lowerTag];
            }
        }

        // Si ce n'est pas une abréviation connue, on garde le tag tel quel
        return tag;
    }).filter(Boolean).join(', ');
}

function autoPopulateDatasets(images) {
  images.forEach(img => {
    applyCombinedData(img);
    if (!img.dataset.gallery || !img.dataset.actress) {
      extractDataFromURL(img);
    }
    
    // ⬇⬇⬇ AJOUT ICI : On normalise le tag dès le chargement ⬇⬇⬇
    if (img.dataset.tag) {
        img.dataset.tag = normalizeTags(img.dataset.tag);
    }
    // ⬆⬆⬆ FIN DE L'AJOUT ⬆⬆⬆
  });
}

function extractDataFromURL(img) {
  const src = img.src;
  if (!src.startsWith("https://ik.imagekit.io/")) return;
  try {
    const url = new URL(src);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const folder = pathParts[pathParts.length - 2];
    const file = pathParts[pathParts.length - 1];
    const blocks = file.split("-");
    
    let galleryParts = [];
    const folderClean = folder === "0" ? "0" : String(parseInt(folder, 10));
    galleryParts.push(folderClean);
    const firstBlock = blocks[0];
    const nums = firstBlock.match(/\d+/g);

    if (nums) {
      nums.forEach(n => galleryParts.push(n === "0" ? "0" : String(parseInt(n, 10))));
    }

    if (!img.dataset.gallery) {
      img.dataset.gallery = galleryParts.join("-");
      const sec = parseInt(img.dataset.gallerySecondary, 10);
      if (!isNaN(sec)) img.dataset.gallery += "-" + sec;
    }

    blocks.slice(1).forEach(block => {
      if (/^\d+$/.test(block)) return;
      const parts = block.split("_");
      const key = parts[0]?.toLowerCase();
      const value = parts.slice(1).join("_");
      if (!value) return;

      if (key === "name" && !img.dataset.actress) img.dataset.actress = decodeURIComponent(value).trim();
      if (key === "studio" && !img.dataset.studio) img.dataset.studio = decodeURIComponent(value).trim();
      
      if (!img.dataset.orientation) {
        const match = file.match(/-(p|l|s|o)(\d+)?(?=\.|$)/i);
        if (match) {
          const map = { p: "portrait", l: "landscape", s: "square", o: "other" };
          img.dataset.orientation = map[match[1].toLowerCase()];
        }
      }
    });
    if (!img.dataset.orientation) img.dataset.orientation = "landscape";
  } catch (e) {
    console.warn("Erreur parsing URL:", src);
  }
}

function applyLazyLoading(images) {
  images.forEach(img => {
    img.loading = "lazy";
    if (!img.alt || img.alt.trim() === '') {
      img.alt = img.dataset.actress || 'Image';
    }
  });
}

// ==========================================
// UTILITAIRES DE COULEURS (HSL)
// ==========================================

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

function parseClr(img) {
  if (img._clrData) return img._clrData;
  const raw = (img.dataset.clr || '').trim();
  const data = { colors: [], hexes: [], luminance: null };
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);

  parts.forEach(part => {
    if (part.startsWith('#')) {
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(part)) data.hexes.push(part);
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

function getImageColors(img) { return parseClr(img).colors; }
function getImageLuminance(img) { return parseClr(img).luminance; }
function hueSimilarity(h1, h2) {
  const diff = Math.abs(h1 - h2);
  const d = Math.min(diff, 360 - diff);
  return 100 * (1 - d / 180);
}

console.log("");
