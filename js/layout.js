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

  // NOUVELLE LOGIQUE : On met TOUS les restes dans une seule colonne "leftover-mixed"
  if (leftover.length > 0) {
    cols.push({ type: 'leftover-mixed', imgs: leftover });
  }
  
  return cols;
}

function hasVisibleIncompleteColumns(images) {
  const cols = computeColumns(images);
  const L_W = 99.5 / 3.2 / 100;
  const P_W = L_W * 2 / 3;
  let x = 0;
  for (const col of cols) {
    if (col.type === 'leftover-mixed') return x < 1;
    if (col.type === '4P')         x += P_W;
    else if (col.type === '6L')    x += L_W;
    else if (col.type === '12-mixed') x += 2 * L_W;
  }
  return false;
}

function groupImagesByPrefix(mediaItems) {
  const gallery = document.getElementById("gallery");
  
  // 1. On sépare les images des vidéos ET des iframes
  const images = mediaItems.filter(el => {
    const tag = el.tagName.toLowerCase();
    return tag !== 'video' && tag !== 'iframe';
  });
  
  const videos = mediaItems.filter(el => {
    const tag = el.tagName.toLowerCase();
    return tag === 'video' || tag === 'iframe';
  });

  // 2. On fait le tri habituel UNIQUEMENT pour les images
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
  
  // 3. On affiche les groupes d'images
  batches.forEach(({ images: imgs, prefixes }) => {
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group");
    groupDiv.dataset.group = prefixes.join("-");
    buildGalleryLayout(imgs, groupDiv);
    gallery.appendChild(groupDiv);
  });

  // 4. On affiche le groupe Vidéo/Iframe à la toute fin
  if (videos.length > 0) {
    const videoGroupDiv = document.createElement("div");
    videoGroupDiv.classList.add("group");
    videoGroupDiv.dataset.group = "videos"; 
    buildGalleryLayout(videos, videoGroupDiv);
    gallery.appendChild(videoGroupDiv);
  }
}

function buildGalleryLayout(images, container = document.getElementById("gallery")) {
  const createDiv = className => { const div = document.createElement("div"); div.className = className; return div; };
  const cols = computeColumns(images);
  container.innerHTML = "";
  const galleryLine = createDiv("line");

  cols.forEach(col => {
    if (col.type === '12-mixed') {
      const column = createDiv("column");
      column.dataset.columntype = col.type;
      let unprocessed = [...col.imgs];

      while (unprocessed.length) {
        const first = unprocessed[0];
        const type = first.dataset.orientation;
        const maxCount = type === "portrait" ? 3 : 2;
        const lineImgs = [];
        let count = 0;
        for (let img of unprocessed) {
          if (img.dataset.orientation === type && count < maxCount) { lineImgs.push(img); count++; }
        }
        unprocessed = unprocessed.filter(img => !lineImgs.includes(img));

        const lineDiv = createDiv(`line ${type}-line`);
        lineImgs.forEach(img => {
          const ic = createDiv("img-container");
          ic.dataset.orientation = img.dataset.orientation;
          const tag = img.tagName.toLowerCase();
          if (tag === 'video' || tag === 'iframe') ic.dataset.isVideo = "true";
          ic.appendChild(img);
          lineDiv.appendChild(ic);
        });
        column.appendChild(lineDiv);
      }
      galleryLine.appendChild(column);
    } 
    else if (col.type === 'leftover-mixed') {
      const column = createDiv("column");
      column.dataset.columntype = "leftover-mixed";

      // 1. On sépare les P et les L
      const leftoversP = col.imgs.filter(img => img.dataset.orientation === "portrait");
      const leftoversL = col.imgs.filter(img => img.dataset.orientation !== "portrait");

      // 2. On empile les lignes de 3 Portraits
      for (let i = 0; i < leftoversP.length; i += 3) {
        const chunk = leftoversP.slice(i, i + 3);
        const lineDiv = createDiv("line portrait-line");
        chunk.forEach(img => {
          const ic = createDiv("img-container");
          ic.dataset.orientation = img.dataset.orientation;
          const tag = img.tagName.toLowerCase();
          if (tag === 'video' || tag === 'iframe') ic.dataset.isVideo = "true";
          ic.appendChild(img);
          lineDiv.appendChild(ic);
        });
        column.appendChild(lineDiv);
      }

      // 3. On empile les lignes de 2 Paysages
      for (let i = 0; i < leftoversL.length; i += 2) {
        const chunk = leftoversL.slice(i, i + 2);
        const lineDiv = createDiv("line landscape-line");
        chunk.forEach(img => {
          const ic = createDiv("img-container");
          ic.dataset.orientation = img.dataset.orientation;
          const tag = img.tagName.toLowerCase();
          if (tag === 'video' || tag === 'iframe') ic.dataset.isVideo = "true";
          ic.appendChild(img);
          lineDiv.appendChild(ic);
        });
        column.appendChild(lineDiv);
      }

      galleryLine.appendChild(column);
    } 
    else {
      // Colonnes complètes classiques (4P, 6L)
      const column = createDiv("column");
      column.dataset.columntype = col.type;
      col.imgs.forEach(img => {
        const ic = createDiv("img-container");
        ic.dataset.orientation = img.dataset.orientation;
        const tag = img.tagName.toLowerCase();
        if (tag === 'video' || tag === 'iframe') ic.dataset.isVideo = "true";
        ic.appendChild(img);
        column.appendChild(ic);
      });
      galleryLine.appendChild(column);
    }
  });
  container.appendChild(galleryLine);
}

console.log("layout= nouvelle logique de fin de groupe");
