// ==========================================
// OUTILS DE DÉTECTION POUR LA GALERIE (AUTO)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // On attend 2 secondes que la galerie principale ait fini de charger
    setTimeout(async () => {
        
        console.log("%c🕵️‍♂️ LANCEMENT DU SCAN DE LA GALERIE...", "color: #FF9800; font-weight: bold;");

        // 1. On liste tes fichiers et on les télécharge une bonne fois pour toute
        const txtFiles = ['0.txt', '001.txt', '002.txt', '003.txt', '004.txt', '005.txt', '006.txt', '007.txt', '008.txt', '009.txt', '010.txt', '011.txt', '012.txt', '013.txt', '099.txt', '100.txt', '105.txt', '110.txt', '120.txt', 'video.txt'];
        const txtLookup = {}; 

        for (const file of txtFiles) {
            try {
                const res = await fetch(`data/${file}`);
                if (!res.ok) continue;
                const text = await res.text();
                const regex = /src="([^"]+)"/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const src = match[1].split('?')[0].trim();
                    if (!txtLookup[src]) txtLookup[src] = [];
                    if (!txtLookup[src].includes(file)) {
                        txtLookup[src].push(file);
                    }
                }
            } catch (e) {}
        }

        // 2. Récupération de TOUS les médias du DOM
        const allMedia = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe'));
        
        // --- VÉRIFICATION 1 : DOUBLONS (Tous les médias) ---
        const domCounts = {};
        allMedia.forEach(el => {
            const src = (el.getAttribute('src') || '').split('?')[0].trim();
            if (!src) return;
            domCounts[src] = (domCounts[src] || 0) + 1;
        });

        const duplicatesInDom = Object.keys(domCounts).filter(src => domCounts[src] > 1);

        if (duplicatesInDom.length === 0) {
            console.log("%c✅ Aucun doublon trouvé.", "color: #4CAF50; font-weight: bold;");
        } else {
            console.log(`%c⚠️ ${duplicatesInDom.length} doublon(s) trouvé(s) !`, "color: #F44336; font-weight: bold; font-size: 14px;");
            const dupResults = duplicatesInDom.map(src => {
                return {
                    "Image": src.split('/').pop(),
                    "Occurrences": domCounts[src],
                    "Fichier(s) .txt d'origine": txtLookup[src] ? txtLookup[src].join(' + ') : "❌ Non trouvé (HTML ?)"
                };
            });
            console.table(dupResults);
        }

        // --- VÉRIFICATION 2 : DONNÉES MANQUANTES (IMAGES UNIQUEMENT) ---
        console.log("%c🕵️‍♂️ VÉRIFICATION DES DATA-ORIENTATION ET DATA-GALLERY (Images uniquement)...", "color: #00BCD4; font-weight: bold;");
        
        // On filtre pour ne garder QUE les balises <img>
        const onlyImages = allMedia.filter(el => el.tagName.toLowerCase() === 'img');
        
        const missingData = onlyImages.filter(el => {
            const hasOrientation = el.dataset.orientation && el.dataset.orientation.trim() !== '';
            const hasGallery = el.dataset.gallery && el.dataset.gallery.trim() !== '';
            return !hasOrientation || !hasGallery;
        });

        if (missingData.length > 0) {
            console.log(`%c⚠️ ${missingData.length} image(s) sans data-orientation ou data-gallery :`, "color: #FF9800; font-weight: bold;");
            
            const missingResults = missingData.map(el => {
                const src = (el.getAttribute('src') || '').split('?')[0].trim();
                return {
                    "Image": src.split('/').pop() || "Lien vide",
                    "Fichier .txt": txtLookup[src] ? txtLookup[src].join(' + ') : "❌ Non trouvé (HTML ?)",
                    "Orientation": el.dataset.orientation || "❌",
                    "Galerie": el.dataset.gallery || "❌",
                    "data-2 brut": el.getAttribute('data-2') || "❌ Manquant"
                };
            });
            console.table(missingResults);
        } else {
            console.log("%c✅ Toutes les images ont une orientation et une galerie valides.", "color: #4CAF50; font-weight: bold;");
        }

        console.log("%c🏁 Scan complet terminé.", "color: #9E9E9E; font-style: italic;");

    }, 2000); // Délai de 2 secondes
});

console.log("debug > done");
