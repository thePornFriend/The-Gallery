document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");
  
  // Variables globales pour la gestion des images lourdes
  window.allMediaData = [];
  window.heavyMediaData = [];
  window.lightMediaData = [];
  window.isHeavyLoaded = false;

  // ==========================================
  // PARSEUR POUR LE FORMAT TEXTE BRUT (RÉSILIENT)
  // ==========================================
  function parseRawTxtToHtml(rawText) {
      const lines = rawText.split('\n');
      let htmlOutput = '';
      let currentData1 = '';
      
      lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          try {
              if (trimmed.startsWith('<')) {
                  htmlOutput += trimmed + '\n';
                  return;
              }
              
              if (trimmed.startsWith('data-1=')) {
                  currentData1 = trimmed.substring(7).trim();
                  if (currentData1.startsWith('"') && currentData1.endsWith('"')) {
                      currentData1 = currentData1.slice(1, -1);
                  }
                  return;
              }
              
              if (trimmed.startsWith('-')) {
                  let content = trimmed.substring(1).trim();
                  let parts = content.split(';').map(p => p.trim());
                  
                  let url = parts.pop();
                  if (!url) return; 
                  
                  let blocks = parts;
                  let localData1 = currentData1; 

                  // Gestion des modificateurs (+)/(-)
                  while (blocks.length > 0) {
                      let block = blocks[0].trim();

                      if (block === '(+)' || block === '(-)') {
                          let mod = block[1];
                          localData1 = localData1.replace(/^\s*([^,-]+)/, `(${mod})$1`);
                          blocks.shift();
                          continue;
                      }

                      let matchNum = block.match(/^\(([+-])\)(\d.*)/);
                      if (matchNum) {
                          let mod = matchNum[1];
                          let rest = matchNum[2].trim();
                          localData1 = localData1.replace(/^\s*([^,-]+)/, `(${mod})$1`);
                          blocks[0] = rest;
                          break; 
                      }

                      if (block.includes('(+)') || block.includes('(-)')) {
                          let actressMods = block.split(',').map(s => s.trim());
                          actressMods.forEach(item => {
                              const itemMatch = item.match(/^\(([+-])\)(.*)/);
                              if (itemMatch) {
                                  let itemMod = itemMatch[1];
                                  let itemName = itemMatch[2].trim();
                                  if (itemName !== '') {
                                      const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                      const regex = new RegExp(`(?<=^|,)\\s*${escapedName}\\s*(?=,|$|-)`, 'i');
                                      localData1 = localData1.replace(regex, `(${itemMod})${itemName}`);
                                  }
                              }
                          });
                          blocks.shift();
                          continue; 
                      }
                      break;
                  }
                  
                  let data2Raw = (blocks[0] || '').replace(/^-\s*/, '').trim();
                  let dataClr = blocks[1] || '';
                  let dataWeight = blocks[2] || '';
                  
                  let attrs = `data-1="${localData1}" data-2="${data2Raw}"`;
                  if (dataClr) attrs += ` data-clr="${dataClr}"`;
                  if (dataWeight) attrs += ` data-weight="${dataWeight}"`;
                  
                  let srcAttr = (dataWeight.toLowerCase() === 'heavy') ? `data-src="${url}"` : `src="${url}"`;
                  htmlOutput += `<img ${attrs} ${srcAttr} data-fallback="">\n`;
              }
          } catch (err) {
              console.warn(`%c⚠️ Erreur de formatage ignorée ligne ${index + 1} :\n%c${trimmed}`, "color: #FF9800;", "color: #FFF; font-family: monospace;");
          }
      });
      return htmlOutput;
  }

  // ==========================================
  // CHARGEMENT DE LA GALERIE
  // ==========================================
  async function loadGalleryFromTxt() {
    let txtFiles = window.GALLERY_TXT_FILES || []; 
    
    // Vérifier test.txt
    try {
        const testRes = await fetch(`data/test.txt`);
        if (testRes.ok) {
            console.log("🧪 Mode TEST activé : seul test.txt sera lu.");
            txtFiles = ['test.txt'];
        }
    } catch (e) {}

    try {
        const fetchPromises = txtFiles.map(async (filename) => {
            const res = await fetch(`data/${filename}`);
            if (!res.ok) return '';
            return await res.text();
        });

        const contents = await Promise.all(fetchPromises);
        let allHtml = '';
        contents.forEach(content => {
            if (!content) return;
            allHtml += parseRawTxtToHtml(content) + '\n';
        });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = allHtml;
        const allElements = Array.from(tempDiv.querySelectorAll('img, video, iframe'));
        
        autoPopulateDatasets(allElements);

        window.allMediaData = [];
        window.heavyMediaData = [];
        window.lightMediaData = [];

        allElements.forEach(el => {
            window.allMediaData.push(el);
            if (el.tagName.toLowerCase() === 'img' && el.hasAttribute('data-src')) {
                window.heavyMediaData.push(el);
            } else {
                window.lightMediaData.push(el);
            }
        });

        gallery.innerHTML = '';
        window.lightMediaData.forEach(el => gallery.appendChild(el));

        initApp(window.allMediaData);
        
    } catch (error) {
        console.error(error);
        gallery.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Erreur de chargement.</p>`;
    }
  }

  // ==========================================
  // INITIALISATION & MISE À JOUR GLOBALE
  // ==========================================
  function initApp(galleryImages) {
    function getOrCreateChiaroLayer() {
      let el = document.getElementById('chiaro-layer');
      if (!el) {
        el = document.createElement('div');
        el.id = 'chiaro-layer';
        el.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(to bottom right, #000 0%, transparent 100%);opacity:0;transition:opacity 0.6s ease;';
        document.body.appendChild(el);
      }
      return el;
    }

    function updateBodyBackground() {
      const chiaroLayer = getOrCreateChiaroLayer();
      let bgColor = '', bgTransition = '0.3s ease';
      if (state.colorFilter.colorActive || state.colorFilter.lumActive) {
        const hue = state.colorFilter.colorActive ? state.colorFilter.hue : 0;
        const sat = state.colorFilter.colorActive ? 100 : 0;
        const light = state.colorFilter.lumActive ? Math.round(state.colorFilter.luminance * 100) : 50;
        bgColor = `hsl(${hue}, ${sat}%, ${light}%)`;
        bgTransition = '0.15s ease';
      } else if (state.neonController && state.neonController.isActive()) {
        bgColor = state.currentNeonColor;
        bgTransition = '3s linear';
      } else if (state.chiaroscuroActive) {
        bgColor = state.CHIARO_YELLOW;
        bgTransition = '0.6s ease';
      }
      document.body.style.transition = `background-color ${bgTransition}`;
      document.body.style.backgroundColor = bgColor;
      chiaroLayer.style.opacity = (state.chiaroscuroActive && !(state.colorFilter.colorActive || state.colorFilter.lumActive)) ? '1' : '0';
    }

    // Initialisation
    buildCollections(galleryImages);
    applyLazyLoading(galleryImages);
    
    createFilterCheckboxes(galleryImages);
    initGallerySearchFilter(galleryImages);
    initColorFilter(updateBodyBackground);
    enableCollapsibleFilters();
    enableTagBackgroundChange(updateBodyBackground);

    initGhostFilter();
  }

  // Fonction globale appelée par filters.js quand une image lourde est chargée
  window.refreshFiltersAndGallery = function() {
    // 1. Mettre à jour le compteur global du bouton
    const heavyBtn = document.getElementById('load-heavy-btn');
    const heavyCountDisplay = document.getElementById('heavy-count-display');
    if (heavyBtn && heavyCountDisplay) {
        heavyCountDisplay.textContent = window.heavyMediaData.length;
        if (window.heavyMediaData.length === 0) {
            heavyBtn.disabled = true;
            heavyBtn.innerHTML = "All heavy loaded";
        }
    }

    // 2. Reconstruire les filtres (pour mettre à jour les +X)
    if (typeof createFilterCheckboxes === 'function') {
        createFilterCheckboxes(window.allMediaData);
    }
    
    // 3. Rafraîchir la galerie
    if (typeof state !== 'undefined' && state.triggerFilter) {
        state.triggerFilter();
    }
  };

  // Gérer le bouton global "Load all"
  document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'load-heavy-btn') {
          if (window.heavyMediaData.length === 0) return;
          
          window.heavyMediaData.forEach(el => {
              el.src = el.getAttribute('data-src');
              el.removeAttribute('data-src');
          });
          
          window.isHeavyLoaded = true;
          window.heavyMediaData = []; 
          window.refreshFiltersAndGallery();
      }
  });

  loadGalleryFromTxt();
});

console.log("main > FILTERS SHORTCUT v2");
