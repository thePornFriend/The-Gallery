// ==========================================
// 1. GRILLE DE CHECKBOXES (Actrices, Tags)
// ==========================================
function buildCheckboxGrid(container, items, displayName = k => k) {
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const sorted = [...items.keys()].sort((a, b) => displayName(a).localeCompare(displayName(b), 'fr', { sensitivity: 'base' }));
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

// ==========================================
// 2. GRILLE DES STUDIOS (avec Hiérarchie)
// ==========================================
function buildStudioFilterGrid(container, studioCount, imgData) {
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const hierarchy = new Map();
    const directCounts = new Map(studioCount);
    const aggregateCounts = new Map();
    
    const allStudios = [...studioCount.keys()].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    allStudios.forEach(s => hierarchy.set(s, { id: s, parent: null, children: [], checkboxes: [] }));
    
    Object.entries(state.STUDIO_GROUPS).forEach(([groupName, members]) => {
        if (!hierarchy.has(groupName)) hierarchy.set(groupName, { id: groupName, parent: null, children: [], checkboxes: [] });
        
        members.forEach(member => {
            if (!hierarchy.has(member)) hierarchy.set(member, { id: member, parent: null, children: [], checkboxes: [] });
            hierarchy.get(member).parent = groupName;
            hierarchy.get(groupName).children.push(member);
        });
    });

    function calcAggregate(nodeId) {
        const node = hierarchy.get(nodeId);
        let count = directCounts.get(nodeId) || 0;
        node.children.forEach(c => count += calcAggregate(c));
        aggregateCounts.set(nodeId, count);
        return count;
    }
    Array.from(hierarchy.keys()).forEach(id => {
        if (!hierarchy.get(id).parent) calcAggregate(id);
    });

    const activeNodes = new Set();
    Array.from(hierarchy.keys()).forEach(id => {
        if (aggregateCounts.get(id) > 0) activeNodes.add(id);
    });
    activeNodes.forEach(id => {
        let p = hierarchy.get(id).parent;
        while (p) { activeNodes.add(p); p = hierarchy.get(p).parent; }
    });

    state.studioHierarchy = hierarchy;

    const states = new Map();
    activeNodes.forEach(id => states.set(id, { checked: false, indeterminate: false }));

    function updateDOM() {
        states.forEach((state, id) => {
            hierarchy.get(id).checkboxes.forEach(cb => {
                cb.checked = state.checked;
                cb.indeterminate = state.indeterminate;
            });
        });
    }

    function setStateDown(id, checked) {
        if (!activeNodes.has(id)) return;
        states.set(id, { checked, indeterminate: false });
        hierarchy.get(id).children.forEach(childId => setStateDown(childId, checked));
    }

    function updateAncestors(id) {
        const parentId = hierarchy.get(id).parent;
        if (!parentId || !activeNodes.has(parentId)) return;

        const parentNode = hierarchy.get(parentId);
        const activeChildren = parentNode.children.filter(c => activeNodes.has(c));
        
        let checkedCount = 0;
        let indeterminateCount = 0;

        activeChildren.forEach(childId => {
            const childState = states.get(childId);
            if (childState.checked) checkedCount++;
            if (childState.indeterminate) indeterminateCount++;
        });

        let newState;
        if (checkedCount === 0 && indeterminateCount === 0) {
            newState = { checked: false, indeterminate: false };
        } else if (checkedCount === activeChildren.length) {
            newState = { checked: true, indeterminate: false };
        } else {
            newState = { checked: false, indeterminate: true };
        }

        states.set(parentId, newState);
        updateAncestors(parentId);
    }

    function handleCheckboxClick(id) {
        const currentState = states.get(id);
        const newChecked = currentState.indeterminate ? true : !currentState.checked;
        setStateDown(id, newChecked);
        updateAncestors(id);
        updateDOM();
    }

    function attachSceneTriggers(label, studioId) {
        label.title = "Double-cliquez (ou appui long) pour voir les scènes";
        label.addEventListener('dblclick', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (typeof showScenesForStudio === 'function') showScenesForStudio(studioId);
        });
        let pressTimer;
        label.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                e.preventDefault();
                if (typeof showScenesForStudio === 'function') showScenesForStudio(studioId);
            }, 600);
        }, { passive: false });
        label.addEventListener('touchend', () => clearTimeout(pressTimer));
        label.addEventListener('touchmove', () => clearTimeout(pressTimer));
    }

    container.innerHTML = '';
    
    function createCheckbox(value) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = value;
        hierarchy.get(value).checkboxes.push(cb);
        cb.addEventListener('change', () => handleCheckboxClick(value));
        return cb;
    }

    const globalList = document.createElement('div');
    globalList.className = 'prod-global-list';
    const NUM_COLS = 4;
    const globalColumns = Array.from({ length: NUM_COLS }, () => { const d = document.createElement('div'); d.className = 'column'; return d; });
    globalColumns.forEach(col => globalList.appendChild(col));
    
    const visibleStudios = allStudios.filter(s => activeNodes.has(s));
    const perCol = Math.ceil(visibleStudios.length / NUM_COLS) || 1;

    visibleStudios.forEach((studioName, idx) => {
        const colIndex = Math.min(Math.floor(idx / perCol), NUM_COLS - 1);
        const label = document.createElement('label');
        const cb = createCheckbox(studioName);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(` ${capitalize(studioName)} (${aggregateCounts.get(studioName) || 0})`));
        attachSceneTriggers(label, studioName);
        globalColumns[colIndex].appendChild(label);
    });
    container.appendChild(globalList);

    const separator = document.createElement('hr');
    separator.className = 'prod-separator';
    container.appendChild(separator);

    const groupedList = document.createElement('div');
    groupedList.className = 'prod-grouped-list';
    
    const groups = {};
    Array.from(hierarchy.keys()).forEach(name => {
        const g = hierarchy.get(name)?.parent;
        if (g && activeNodes.has(name)) {
            if (!groups[g]) groups[g] = [];
            groups[g].push(name);
        }
    });

    const groupEntries = Object.entries(groups)
        .filter(([g]) => activeNodes.has(g))
        .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }));

    groupEntries.forEach(([groupName, members]) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'prod-group';

        const header = document.createElement('label');
        header.className = 'prod-group-header';
        const parentCb = createCheckbox(groupName);
        header.appendChild(parentCb);
        header.appendChild(document.createTextNode(` ${groupName} (${aggregateCounts.get(groupName) || 0})`));
        attachSceneTriggers(header, groupName);
        groupDiv.appendChild(header);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'prod-group-items';

        members.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        members.forEach(studioName => {
            const label = document.createElement('label');
            const cb = createCheckbox(studioName);
            label.appendChild(cb);
            label.appendChild(document.createTextNode(` ${capitalize(studioName)} (${aggregateCounts.get(studioName) || 0})`));
            attachSceneTriggers(label, studioName);
            itemsDiv.appendChild(label);
        });

        groupDiv.appendChild(itemsDiv);
        groupedList.appendChild(groupDiv);
    });

    container.appendChild(groupedList);
    return Array.from(container.querySelectorAll('input[type="checkbox"]'));
}

// ==========================================
// 3. LOGIQUE PRINCIPALE DES FILTRES
// ==========================================
function createFilterCheckboxes(images) {
  const mainList = document.querySelector('.actress-list-main');
  const moreList = document.querySelector('.actress-list-more');
  const tagList = document.querySelector('.tag-list');
  const modeSelect = document.getElementById('filter-mode');
  const toggleBtn = document.querySelector('.actress-toggle');
  const actressSec = document.querySelector('.actress-section');

  images.forEach(img => { if (!img.dataset.studio || img.dataset.studio.trim() === '') img.dataset.studio = 'unassigned'; });
  if (!mainList || !moreList || !tagList || !modeSelect) return;

  const stripParens = n => n.replace(/^\(|\)$/g, '').trim();
  const isAmateur = n => /^\(.*\)$/.test(n.trim());
  const stripPrefix = k => k.replace(/^(main|am):/, '');
  const isAmateurEntry = n => isAmateur(n) || n.trim().toLowerCase() === 'amateur';
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
    const mainActs = rawActs.filter(n => !isAmateurEntry(n)).map(n => 'main:' + n);
    const amateurActs = rawActs.filter(n => isAmateurEntry(n)).map(n => 'am:' + normalizeAmName(n));
    
    let rawTags = img.dataset.tag || '';
    if (typeof normalizeTags === 'function') {
        rawTags = normalizeTags(rawTags);
    }
    const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    
    const studios = (img.dataset.studio || '').split(',').map(s => s.trim()).filter(Boolean);
    return { img, acts: [...mainActs, ...amateurActs], mainActs, amateurActs, tags, studios };
  });

  const mainCount = countMap(imgData.map(d => d.mainActs));
  const amateurCount = countMap(imgData.map(d => d.amateurActs));
  const tagCount = countMap(imgData.map(d => d.tags));
  const studioCount = countMap(imgData.map(d => d.studios));

  const mainCheckboxes = buildCheckboxGrid(mainList, mainCount, stripPrefix);
  const amateurCheckboxes = buildCheckboxGrid(moreList, amateurCount, stripPrefix);
  const tagCheckboxes = buildCheckboxGrid(tagList, tagCount);

  const amateurImagesCount = imgData.filter(d => d.amateurActs.length > 0).length;
  let amateurCb = null;

  if (amateurImagesCount > 0) {
    const columns = mainList.querySelectorAll('.column');
    const lastCol = columns[columns.length - 1];
    if (lastCol) {
      const label = document.createElement('label');
      label.className = 'amateur-all-label';
      label.innerHTML = `<input type="checkbox" value="am:__all__"> Amateur (${amateurImagesCount})`;
      amateurCb = label.firstChild;
      lastCol.appendChild(label);
      mainCheckboxes.push(amateurCb);

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

  actressCheckboxes.forEach(cb => {
      const label = cb.closest('label');
      if (!label) return;
      label.title = "Double-cliquez (ou appui long) pour voir ses scènes";
      
      label.addEventListener('dblclick', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (typeof showScenesForActress === 'function') showScenesForActress(cb.value);
      });

      let pressTimer;
      label.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => {
              e.preventDefault();
              if (typeof showScenesForActress === 'function') showScenesForActress(cb.value);
          }, 600);
      }, { passive: false });
      label.addEventListener('touchend', () => clearTimeout(pressTimer));
      label.addEventListener('touchmove', () => clearTimeout(pressTimer));
  });
    
  if (toggleBtn && actressSec) {
    if (amateurCount.size === 0) toggleBtn.style.display = 'none';
    else {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actressSec.classList.toggle('more-active');
        toggleBtn.textContent = actressSec.classList.contains('more-active') ? '← See main actresses' : 'See more actresses →';
      });
    }
  }

  const prodList = document.querySelector('.prod-list');
  const studioCheckboxes = prodList ? buildStudioFilterGrid(prodList, studioCount, imgData) : [];
  const allCheckboxes = [...actressCheckboxes, ...tagCheckboxes, ...studioCheckboxes];

  const normalizeActress = n => {
    const t = n.trim();
    if (isAmateurEntry(t)) return 'am:' + normalizeAmName(t);
    return 'main:' + t;
  };

  const rawToDisplay = new Map(), rawCo = new Map(), displayToRaw = new Map(), displayCo = new Map();

  images.forEach(img => {
    const raw = (img.dataset.collectionActresses || img.dataset.actress || '').split(',').map(n => n.trim()).filter(Boolean);
    if (!raw.length) return;
    raw.forEach(n => {
      rawToDisplay.set(n, normalizeActress(n));
      if (!rawCo.has(n)) rawCo.set(n, new Set());
    });
    if (raw.length > 1) raw.forEach(a => raw.forEach(b => { if (a !== b) rawCo.get(a).add(b); }));
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
    const selectedSet = new Set(actressCheckboxes.filter(cb => cb.checked && cb.value !== 'am:__all__').map(cb => cb.value));
    const related = new Set();
    selectedSet.forEach(v => { const s = displayCo.get(v); if (s) s.forEach(x => related.add(x)); });
    actressLabelMap.forEach((label, value) => {
      if (value === 'am:__all__') return;
      label.classList.toggle('related-actress', !selectedSet.has(value) && related.has(value));
    });
  };

  const filter = () => {
    const selected = [...new Set(allCheckboxes.filter(cb => cb.checked).map(cb => cb.value))];
    const inclusive = modeSelect.value === 'inclusive';
    const selectedAll = selected.includes('am:__all__');
    const selectedRest = selected.filter(v => v !== 'am:__all__');

    const isCoveredByParent = (val) => {
        if (!state.studioHierarchy || !state.studioHierarchy.has(val)) return false;
        let parent = state.studioHierarchy.get(val).parent;
        while (parent) {
            if (selectedRest.includes(parent)) return true;
            parent = state.studioHierarchy.get(parent)?.parent;
        }
        return false;
    };

    const isGroupMatch = (val, studiosArr) => {
        if (!state.studioHierarchy || !state.studioHierarchy.has(val)) return false;
        const node = state.studioHierarchy.get(val);
        const checkChildren = (n) => {
            if (n.children.some(c => studiosArr.includes(c))) return true;
            return n.children.some(c => state.studioHierarchy.has(c) && checkChildren(state.studioHierarchy.get(c)));
        };
        return checkChildren(node);
    };

    const visibleImages = imgData.filter(({ acts, tags, studios, amateurActs, img }) => {
      let passesCheckboxFilter;
      if (selected.length === 0) passesCheckboxFilter = true;
      else if (inclusive) {
        const matchAll = selectedAll && amateurActs.length > 0;
        const matchRest = selectedRest.some(v => {
            if (acts.includes(v) || tags.includes(v)) return true;
            if (studios.includes(v)) return true;
            if (isGroupMatch(v, studios)) return true;
            return false;
        });
        passesCheckboxFilter = matchAll || matchRest;
      } else {
        const allVals = [...acts, ...tags, ...studios];
        const allCovered = allVals.every(v => {
            if (selectedRest.includes(v)) return true;
            if (selectedAll && v.startsWith('am:')) return true;
            if (isCoveredByParent(v)) return true;
            return false;
        });
        const allReq = !selectedAll || amateurActs.length > 0;
        passesCheckboxFilter = allReq && allCovered;
      }
      const passesGalleryFilter = state.selectedGalleryValues.size === 0 || state.selectedGalleryValues.has(img.dataset.gallery);
      
      let passesColor = true;
      if (state.colorFilter.active) {
        if (state.colorFilter.colorActive) {
          const match = getImageColors(img).some(c => c.chroma >= 0.08 && hueSimilarity(c.h, state.colorFilter.hue) >= state.colorFilter.minSimilarity);
          if (!match) passesColor = false;
        }
        if (passesColor && state.colorFilter.lumActive) {
          const lum = getImageLuminance(img);
          if (lum === null) passesColor = false;
          else {
            const tolerance = (100 - state.colorFilter.minSimilarity) / 100;
            if (Math.abs(lum - state.colorFilter.luminance) > tolerance) passesColor = false;
          }
        }
      }
      return passesCheckboxFilter && passesGalleryFilter && passesColor;
    }).map(({ img }) => img);

    const gallery = document.getElementById("gallery");
    
    // ⬇⬇⬇ LOGIQUE POUR IGNORER LES IMAGES LOURDES ⬇⬇⬇
    let renderImages = visibleImages;
    if (window.isHeavyLoaded === false) {
        renderImages = visibleImages.filter(img => !img.hasAttribute('data-src'));
    }
    // ⬆⬆⬆ FIN DE LA LOGIQUE ⬆⬆⬆

    gallery.innerHTML = '';
    groupImagesByPrefix(renderImages);
    enableZoomDrag();
    updateRelatedActresses();
  };

  let filterTimer = null;
  const debouncedFilter = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(filter, 0);
  };

  allCheckboxes.forEach(cb => cb.addEventListener('change', debouncedFilter));
  modeSelect.addEventListener('change', debouncedFilter);
  state.triggerFilter = filter;
  filter();
}

// ==========================================
// 4. RECHERCHE DE GALERIE
// ==========================================
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
      const numA = aNums[i] ?? 0, numB = bNums[i] ?? 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  };
  galleryValues.sort(compareGallery);

  const renderLabels = () => {
    labelsBox.innerHTML = '';
    [...state.selectedGalleryValues].sort(compareGallery).forEach(value => {
      const label = document.createElement('span');
      label.className = 'gallery-label';
      label.innerHTML = `${value} <button type="button" aria-label="Retirer">&times;</button>`;
      label.querySelector('button').addEventListener('click', () => {
        state.selectedGalleryValues.delete(value);
        renderLabels();
        state.triggerFilter();
      });
      labelsBox.appendChild(label);
    });
  };

  const renderSuggestions = (query) => {
    suggestionsBox.innerHTML = '';
    if (!query) { suggestionsBox.style.display = 'none'; return; }
    const matches = galleryValues.filter(v => v.startsWith(query) && !state.selectedGalleryValues.has(v)).slice(0, 30);
    if (matches.length === 0) { suggestionsBox.style.display = 'none'; return; }
    matches.forEach(value => {
      const item = document.createElement('div');
      item.className = 'gallery-suggestion-item';
      item.textContent = value;
      item.addEventListener('click', () => {
        state.selectedGalleryValues.add(value);
        input.value = '';
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        renderLabels();
        state.triggerFilter();
      });
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = 'block';
  };

  input.addEventListener('input', () => renderSuggestions(input.value.trim()));
  input.addEventListener('focus', () => renderSuggestions(input.value.trim()));
  document.addEventListener('click', (e) => { if (!suggestionsBox.contains(e.target) && e.target !== input) suggestionsBox.style.display = 'none'; });
}

// ==========================================
// 5. FILTRES REPLIABLES
// ==========================================
function enableCollapsibleFilters() {
  document.querySelectorAll('.filter-sections h3').forEach(title => {
    let list = title.nextElementSibling;
    if (title.closest('.actress-header')) list = title.closest('.actress-section')?.querySelector('.actress-slider');
    if (!list) return;
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      const isHidden = list.style.display === 'none';
      list.style.display = isHidden ? '' : 'none';
      title.classList.toggle('collapsed', !isHidden);
    });
  });
}

// ==========================================
// 6. BACKGROUND (Néon & Chiaroscuro)
// ==========================================
function enableTagBackgroundChange(updateBodyBackground) {
  const tagCheckboxes = document.querySelectorAll('.tag-list input[type="checkbox"]');
  if (!tagCheckboxes.length) return;

  const NEON_TAG = 'rgb led/neon', CHIARO_TAG = 'chiaroscuro';
  const neonColors = ['#FF0080', '#FF8C00', '#FFEE00', '#00FF88', '#00E5FF', '#7A00FF', '#FF00C8'];
  let neonInterval = null, neonIndex = 0;

  const applyNeonColor = () => { 
    state.currentNeonColor = neonColors[neonIndex]; 
    neonIndex = (neonIndex + 1) % neonColors.length; 
    document.documentElement.style.setProperty('--neon-color', state.currentNeonColor);
    updateBodyBackground(); 
  };
  
  const startNeon = () => { if (neonInterval) return; applyNeonColor(); neonInterval = setInterval(applyNeonColor, 3000); };
  const stopNeon = () => { if (neonInterval) { clearInterval(neonInterval); neonInterval = null; } neonIndex = 0; document.documentElement.style.setProperty('--neon-color', 'transparent'); };

  const isChecked = (val) => Array.from(tagCheckboxes).some(cb => cb.checked && cb.value.trim().toLowerCase() === val);
  const isNeonChecked = () => isChecked(NEON_TAG);
  const isChiaroChecked = () => isChecked(CHIARO_TAG);

  const updateFromTags = () => {
    state.chiaroscuroActive = isChiaroChecked();
    if (isNeonChecked()) startNeon(); else stopNeon();
    updateBodyBackground();
  };

  state.neonController = { isActive: isNeonChecked, update: updateFromTags };

  [...tagCheckboxes].forEach(cb => {
    const v = cb.value.trim().toLowerCase();
    if (v === NEON_TAG || v === CHIARO_TAG) cb.addEventListener('change', updateFromTags);
  });
  updateFromTags();
}

// ==========================================
// 7. FILTRE COULEUR & LUMINOSITÉ
// ==========================================
function initColorFilter(updateBodyBackground) {
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
      <label class="filter-toggle"><input type="checkbox" id="color-active"> Couleur</label>
      <input type="range" id="color-hue" min="0" max="360" step="1" value="0" disabled>
      <span id="color-hue-val">0°</span>
    </div>
    <div class="row">
      <label class="filter-toggle"><input type="checkbox" id="luminance-active"> Luminosité</label>
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

  const active = box.querySelector('#color-active'), hue = box.querySelector('#color-hue');
  const lumActive = box.querySelector('#luminance-active'), lumSlider = box.querySelector('#luminance-slider');
  const sim = box.querySelector('#color-sim'), hueVal = box.querySelector('#color-hue-val');
  const lumVal = box.querySelector('#luminance-val'), simVal = box.querySelector('#color-sim-val');

  let timer = null;
  const update = () => {
    state.colorFilter.colorActive = active.checked;
    state.colorFilter.hue = parseInt(hue.value, 10);
    state.colorFilter.lumActive = lumActive.checked;
    state.colorFilter.luminance = parseInt(lumSlider.value, 10) / 100;
    state.colorFilter.minSimilarity = parseInt(sim.value, 10);
    state.colorFilter.active = state.colorFilter.colorActive || state.colorFilter.lumActive;

    hue.disabled = !active.checked;
    lumSlider.disabled = !lumActive.checked;

    hueVal.textContent = `${state.colorFilter.hue}°`;
    lumVal.textContent = `${parseInt(lumSlider.value, 10)} %`;
    simVal.textContent = `${state.colorFilter.minSimilarity} %`;

    updateBodyBackground();

    clearTimeout(timer);
    timer = setTimeout(() => state.triggerFilter(), 150);
  };
  [active, hue, lumActive, lumSlider, sim].forEach(el => el.addEventListener('input', update));
}


console.log("Filter > Filter content");
