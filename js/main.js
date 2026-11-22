document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");
  
  // 1. ON GARDE CE QUI EST DÉJÀ DANS LE HTML
  const initialHtml = gallery.innerHTML;
  gallery.innerHTML = '<p style="text-align:center; padding: 20px;">Chargement de la galerie...</p>';

  // ==========================================
  // 📂 CHARGEMENT DES FICHIERS TXT
  // ==========================================
  async function loadGalleryFromTxt() {
    // Liste de tes fichiers txt
    const txtFiles = ['txt', '001.txt', '002.txt', '003.txt', '004.txt', '005.txt', '006.txt', '007.txt', '008.txt', '009.txt', '010.txt', '011.txt', '012.txt', '013.txt', '099.txt', '100.txt', '105.txt', '110.txt', '120.txt', 'video.txt'];
    
    let allHtmlStrings = [];

    try {
      // On télécharge tous les fichiers en même temps
      const fetchPromises = txtFiles.map(async (filename) => {
        const res = await fetch(`data/${filename}`);
        if (!res.ok) {
          console.warn(`Fichier introuvable : data/${filename}`);
          return '';
        }
        return await res.text();
      });

      const contents = await Promise.all(fetchPromises);
      
      // On compile le HTML existant + le HTML des fichiers txt
      const allHtml = initialHtml + '\n' + contents.join('\n');
      
      // On crée un conteneur virtuel pour lire le HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = allHtml;
      
      // On récupère toutes les images, vidéos et iframes
      let elements = Array.from(tempDiv.querySelectorAll('img, video, iframe'));

      if (elements.length === 0) {
        gallery.innerHTML = '<p style="text-align:center; padding: 20px;">Aucun média trouvé.</p>';
        return;
      }

      // ==========================================
      // ⚙️ TRI DES IMAGES (Aucun aléatoire, juste le tri standard)
      // ==========================================
      elements = sortImages(elements);

      // On injecte dans la galerie
      gallery.innerHTML = '';
      elements.forEach(el => gallery.appendChild(el));

      // On lance l'application
      initApp(elements);

    } catch (error) {
      console.error(error);
      gallery.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Erreur de chargement. Vérifie la console.</p>`;
    }
  }

  // ==========================================
  // 🚀 INITIALISATION DE L'APPLICATION
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

    // Appel de toutes tes fonctions (qui sont dans tes autres fichiers JS)
    const sortedImages = galleryImages; 
    autoPopulateDatasets(sortedImages);
    buildCollections(sortedImages);
    applyLazyLoading(sortedImages);
    
    createFilterCheckboxes(sortedImages);
    initGallerySearchFilter(sortedImages);
    initColorFilter(updateBodyBackground);
    enableCollapsibleFilters();
    enableTagBackgroundChange(updateBodyBackground);
    
    groupImagesByPrefix(sortedImages);
    enableZoomDrag();

    // Ton outil de debug pour la console
    window.injectNewImages = function(htmlString) {
      const temp = document.createElement('div');
      temp.innerHTML = htmlString;
      const newImgs = Array.from(temp.querySelectorAll('img, video, iframe'));
      newImgs.forEach(el => gallery.appendChild(el));
      
      const allImages = Array.from(gallery.querySelectorAll('img, video, iframe'));
      allImages.forEach(img => { delete img._collection; delete img._clrData; });
      
      document.querySelector('.actress-list-main').innerHTML = '';
      document.querySelector('.actress-list-more').innerHTML = '';
      document.querySelector('.tag-list').innerHTML = '';
      document.querySelector('.prod-list').innerHTML = '';
      
      document.querySelectorAll('.lightbox').forEach(lb => lb.remove());
      
      autoPopulateDatasets(allImages);
      buildCollections(allImages);
      createFilterCheckboxes(allImages);
      groupImagesByPrefix(allImages);
      enableZoomDrag();
      
      console.log(`✅ ${newImgs.length} éléments injectés, filtres et galerie recalculés !`);
    };
  }

  // ON LANCE LE CHARGEMENT !
  loadGalleryFromTxt();
});

console.log("main=version updatin file");
