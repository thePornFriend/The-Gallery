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
    if (col.type === 'leftover-mixed' || col.type === 'last') return x < 1;
    if (col.type === '4P')         x += P_W;
    else if (col.type === '6L')    x += L_W;
    else if (col.type === '12-mixed') x += 2 * L_W;
  }
  return false;
}

function groupImagesByPrefix(mediaItems) {
  const gallery = document.getElementById("gallery");
  
  // 1. SÉPARATION : On isole les images et les vidéos
  const images = mediaItems.filter(el => el.tagName.toLowerCase() !== 'video');
  const videos = mediaItems.filter(el => el.tagName.toLowerCase() === 'video');

  // 2. LOGIQUE POUR LES IMAGES (Ta logique actuelle)
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
  
  // 3. AFFICHAGE DES GROUPES D'IMAGES
  batches.forEach(({ images: imgs, prefixes }) => {
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group");
    groupDiv.dataset.group = prefixes.join("-");
    buildGalleryLayout(imgs, groupDiv);
    gallery.appendChild(groupDiv);
  });

  // 4. AFFICHAGE DU GROUPE VIDÉO (Toujours à la fin)
  if (videos.length > 0) {
    const videoGroupDiv = document.createElement("div");
    videoGroupDiv.classList.add("group");
    videoGroupDiv.dataset.group = "videos"; // Un ID spécial pour identifier le groupe vidéo
    buildGalleryLayout(videos, videoGroupDiv);
    gallery.appendChild(videoGroupDiv);
  }
}

function buildGalleryLayout(images, container = document.getElementById("gallery")) {
  const createDiv = className => {
    const div = document.createElement("div");
    div.className = className;
    return div;
  };

  const cols = computeColumns(images);
  container.innerHTML = "";
  const galleryLine = createDiv("line");

  cols.forEach(col => {
    if (col.type === '12-mixed' || col.type === 'leftover-mixed') {
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
          if (img.tagName.toLowerCase() === 'video') ic.dataset.isVideo = "true"; // DÉTECTION VIDÉO ICI
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
        if (img.tagName.toLowerCase() === 'video') ic.dataset.isVideo = "true"; // DÉTECTION VIDÉO ICI
        ic.appendChild(img);
        column.appendChild(ic);
      });
      galleryLine.appendChild(column);
    }
  });

  container.appendChild(galleryLine);
}
