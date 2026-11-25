document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");
  
  // Variables globales pour la gestion des images lourdes
  window.allMediaData = [];
  window.heavyMediaData = [];
  window.lightMediaData = [];
  window.isHeavyLoaded = false;

  // ==========================================
  // CRÉATION DU BOUTON GLOBAL
  // ==========================================
  const loadBtn = document.createElement('button');
  loadBtn.id = 'load-heavy-btn';
  loadBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; background: #FF0080; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: background 0.3s, transform 0.2s; font-family: sans-serif;';
  document.body.appendChild(loadBtn);
  
  loadBtn.addEventListener('mouseenter', () => { if (!loadBtn.disabled) loadBtn.style.transform = 'scale(1.05)'; });
  loadBtn.addEventListener('mouseleave', () => { loadBtn.style.transform = 'scale(1)'; });

  window.updateLoadButton = function() {
      if (window.heavyMediaData.length > 0) {
          loadBtn.style.display = 'block';
          loadBtn.textContent = `📶 Load Heavy Images (${window.heavyMediaData.length})`;
          loadBtn.disabled = false;
          loadBtn.style.background = '#FF0080';
          loadBtn.style.cursor = 'pointer';
      } else {
          loadBtn.style.display = 'block';
          loadBtn.textContent = `✅ All Heavy Images Loaded`;
          loadBtn.disabled = true;
          loadBtn.style.background = '#4CAF50';
          loadBtn.style.cursor = 'default';
      }
  };

  loadBtn.addEventListener('click', () => {
      if (window.heavyMediaData.length === 0 || loadBtn.disabled) return;
      
      window.heavyMediaData.forEach(el => {
          el.src = el.getAttribute('data-src');
          el.removeAttribute('data-src');
      });
      
      window.isHeavyLoaded = true;
      window.heavyMediaData = []; 
      window.updateLoadButton();
      
      if (typeof state !== 'undefined' && state.triggerFilter) {
          state.triggerFilter();
      }
  });

  // ==========================================
  // PARSEUR POUR LE FORMAT TEXTE BRUT
  // ==========================================
  function parseRawTxtToHtml(rawText) {
      const lines = rawText.split('\n');
      let htmlOutput = '';
      let currentData1 = '';
      
      lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          // 1. Si c'est déjà du HTML, on le passe tel quel
          if (trimmed.startsWith('<')) {
              htmlOutput += trimmed + '\n';
              return;
          }
          
          // 2. Récupération du Data-1
          if (trimmed.startsWith('data-1=')) {
              currentData1 = trimmed.substring(7).trim();
              if (currentData1.startsWith('"') && currentData1.endsWith('"')) {
                  currentData1 = currentData1.slice(1, -1);
              }
              return;
          }
          
          // 3. Traitement de la ligne d'image brute
          if (trimmed.startsWith('-')) {
              let content = trimmed.substring(1).trim();
              let parts = content.split(';').map(p => p.trim());
              
              let url = parts.pop();
              if (!url) return; 
              
              let blocks = parts;
              
              // ⬇⬇⬇ LA CORRECTION EST ICI ⬇⬇⬇
              // On crée une copie locale de la scène pour cette image
              let localData1 = currentData1; 
              // ⬆⬆⬆ FIN DE LA CORRECTION ⬆⬆⬆

              // Gestion des modificateurs (+)/(-)
              let modMatch = blocks[0] ? blocks[0].match(/^\(([+-])\)(.*)/) : null;
              if (modMatch) {
                  let mod = modMatch[1]; 
                  let rest = modMatch[2].trim(); 
                  
                  if (rest === '') {
                      // Cas: "- (+) ; 99_8_4_999-l ; url"
                      // On modifie la COPIE locale
                      localData1 = localData1.replace(/^\s*([^,-]+)/, `(${mod})$1`);
                      blocks.shift(); 
                  } else if (/^\d/.test(rest)) {
                      // Cas: "- (+)99_8_4_999-l ; url"
                      localData1 = localData1.replace(/^\s*([^,-]+)/, `(${mod})$1`);
                      blocks[0] = rest; 
                  } else {
                      // Cas: "- (+)Adriana Chechik ; 11_999-p ; url"
                      const regex = new RegExp(`(?<=^|,)\\s*${rest}\\s*(?=,|$)`, 'i');
                      localData1 = localData1.replace(regex, `(${mod})${rest}`);
                      blocks.shift(); 
                  }
              }
              
              let data2Raw = blocks[0] || '';
              let dataClr = blocks[1] || '';
              let dataWeight = blocks[2] || '';
              
              data2Raw = data2Raw.replace(/^-\s*/, '').trim();
              
              // On utilise localData1 pour construire la balise
              let attrs = `data-1="${localData1}" data-2="${data2Raw}"`;
              if (dataClr) attrs += ` data-clr="${dataClr}"`;
              if (dataWeight) attrs += ` data-weight="${dataWeight}"`;
              
              let srcAttr = (dataWeight.toLowerCase() === 'heavy') ? `data-src="${url}"` : `src="${url}"`;
              
              htmlOutput += `<img ${attrs} ${srcAttr} data-fallback="">\n`;
          }
      });
      
      return htmlOutput;
  }

  // ==========================================
  // CHARGEMENT DE LA GALERIE
  // ==========================================
  async function loadGalleryFromTxt() {
    let txtFiles = [ // '0.txt', '001.txt', '002.txt', '003.txt', '004.txt', '005.txt', '006.txt', '007.txt', '008.txt', '009.txt', '010.txt', '011.txt', '012.txt', '013.txt', '099.txt', '100.txt', '105.txt', '110.txt', '120.txt', 'video.txt',
                    'VMG/Blacked_2025_2026.txt'];
    
    // 1. Vérifier test.txt
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
        
        // ⬇⬇⬇ C'EST ICI QUE LA CORRECTION SE FAIT ⬇⬇⬇
        // On passe TOUS les fichiers dans le parseur. 
        // Il gérera les balises <img> déjà existantes ET le texte brut.
        contents.forEach(content => {
            if (!content) return;
            allHtml += parseRawTxtToHtml(content) + '\n';
        });
        // ⬆⬆⬆ FIN DE LA CORRECTION ⬆⬆⬆
        
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
        window.updateLoadButton();
        
    } catch (error) {
        console.error(error);
        gallery.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Erreur de chargement.</p>`;
    }
  }

  // ==========================================
  // INITIALISATION
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

    buildCollections(galleryImages);
    applyLazyLoading(galleryImages);
    
    createFilterCheckboxes(galleryImages);
    initGallerySearchFilter(galleryImages);
    initColorFilter(updateBodyBackground);
    enableCollapsibleFilters();
    enableTagBackgroundChange(updateBodyBackground);
  }

  // ==========================================
  // DEBUG CONSOLE
  // ==========================================
  window.injectNewImages = function(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = parseRawTxtToHtml(htmlString); // On utilise le parser ici aussi !
    const newImgs = Array.from(temp.querySelectorAll('img, video, iframe'));
    
    newImgs.forEach(el => {
        applyCombinedData(el);
        window.allMediaData.push(el);
        if (el.tagName.toLowerCase() === 'img' && el.hasAttribute('data-src')) {
            window.heavyMediaData.push(el);
        } else {
            window.lightMediaData.push(el);
        }
    });

    autoPopulateDatasets(window.allMediaData);
    buildCollections(window.allMediaData);
    createFilterCheckboxes(window.allMediaData);
    window.updateLoadButton();
    
    console.log(`✅ ${newImgs.length} éléments injectés !`);
  };

  loadGalleryFromTxt();
});

console.log("main > VMG/Blacked_2025_2026");
