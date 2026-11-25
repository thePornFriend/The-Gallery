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

  // Fonction pour mettre à jour le bouton
  window.updateLoadButton = function() {
      if (window.heavyMediaData.length > 0) {
          loadBtn.style.display = 'block';
          loadBtn.textContent = `📶 Load Heavy Images (${window.heavyMediaData.length})`;
          loadBtn.disabled = false;
          loadBtn.style.background = '#FF0080';
          loadBtn.style.cursor = 'pointer';
      } else {
          // Le bouton ne disparait pas, il passe juste en vert
          loadBtn.style.display = 'block';
          loadBtn.textContent = `✅ All Heavy Images Loaded`;
          loadBtn.disabled = true;
          loadBtn.style.background = '#4CAF50';
          loadBtn.style.cursor = 'default';
      }
  };

  // Action au clic
  loadBtn.addEventListener('click', () => {
      if (window.heavyMediaData.length === 0 || loadBtn.disabled) return;
      
      // On transforme les data-src en src
      window.heavyMediaData.forEach(el => {
          el.src = el.getAttribute('data-src');
          el.removeAttribute('data-src');
      });
      
      window.isHeavyLoaded = true;
      window.heavyMediaData = []; // On vide la liste lourde
      window.updateLoadButton();
      
      // On demande au filtre de se relancer pour tout réafficher
      if (typeof state !== 'undefined' && state.triggerFilter) {
          state.triggerFilter();
      }
  });

  // ==========================================
  // CHARGEMENT DE LA GALERIE
  // ==========================================
  async function loadGalleryFromTxt() {
    // ... (Garde ta liste de fichiers txtFiles et le fetchPromises ici) ...
    const txtFiles = ['test.txt', 
   //                 '0.txt', 
   //                 '001.txt', 
   //                 '002.txt', 
   //                 '003.txt', 
   //                 '004.txt', 
   //                 '005.txt', 
   //                 '006.txt', 
   //                 '007.txt', 
   //                 '008.txt', 
   //                 '009.txt', 
   //                 '010.txt', 
   //                 '011.txt', 
   //                 '012.txt', 
   //                 '013.txt', 
   //                 '099.txt', 
   //                 '100.txt', 
   //                 '105.txt', 
   //                 '110.txt', 
   //                '120.txt', 
                      'video.txt']; // <-- AJOUTE TES FICHIERS
    
    try {
        const fetchPromises = txtFiles.map(async (filename) => {
            const res = await fetch(`data/${filename}`);
            if (!res.ok) return '';
            return await res.text();
        });
        const contents = await Promise.all(fetchPromises);
        const allHtml = contents.join('\n');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = allHtml;
        const allElements = Array.from(tempDiv.querySelectorAll('img, video, iframe'));
        
        // On initialise les données de TOUTES les images (lourdes et légères)
        autoPopulateDatasets(allElements);

        window.allMediaData = [];
        window.heavyMediaData = [];
        window.lightMediaData = [];

        // On sépare les légères des lourdes
        allElements.forEach(el => {
            window.allMediaData.push(el);
            if (el.tagName.toLowerCase() === 'img' && el.hasAttribute('data-src')) {
                window.heavyMediaData.push(el);
            } else {
                window.lightMediaData.push(el);
            }
        });

        // On injecte UNIQUEMENT les légères dans la galerie pour l'instant
        gallery.innerHTML = '';
        window.lightMediaData.forEach(el => gallery.appendChild(el));

        initApp(window.allMediaData);
        window.updateLoadButton();
        
    } catch (error) {
        console.error(error);
    }
  }

  // ==========================================
  // INITIALISATION DE L'APPLICATION
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

    const sortedImages = galleryImages; 
    buildCollections(sortedImages);
    applyLazyLoading(sortedImages);
    
    // On passe TOUTES les images (lourdes + légères) aux filtres pour que les actrices soient reconnues
    createFilterCheckboxes(sortedImages);
    initGallerySearchFilter(sortedImages);
    initColorFilter(updateBodyBackground);
    enableCollapsibleFilters();
    enableTagBackgroundChange(updateBodyBackground);
  }

  // ==========================================
  // OUTIL DE DEBUG CONSOLE
  // ==========================================
  window.injectNewImages = function(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
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
    createFilterCheckboxes(window.allMediaData); // Va déclencher filter() qui fera le rendu
    window.updateLoadButton();
    
    console.log(`✅ ${newImgs.length} éléments injectés !`);
  };

  loadGalleryFromTxt();
});

console.log("main= filtre heavy images");
