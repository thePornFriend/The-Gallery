// Liste les liens qui apparaissent plusieurs fois
(async function checkDuplicatesWithAllTxtFiles() {
    console.log("⏳ Étape 1 : Scan de la galerie finale...");
    
    // 1. RÉCUPÉRATION DES DOUBLONS DANS LE DOM
    const domMedia = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe'));
    const domCounts = {};
    
    domMedia.forEach(el => {
        // On nettoie l'URL pour ignorer les ?reload=...
        const src = (el.getAttribute('src') || '').split('?')[0].trim();
        if (!src) return;
        domCounts[src] = (domCounts[src] || 0) + 1;
    });

    const duplicatesInDom = Object.keys(domCounts).filter(src => domCounts[src] > 1);

    if (duplicatesInDom.length === 0) {
        console.log("✅ Aucun doublon trouvé dans la galerie finale.");
        return;
    }

    console.log(`⚠️ ${duplicatesInDom.length} doublon(s) trouvé(s) dans la galerie. Analyse de tes 20 fichiers .txt...`);

    // 2. TA LISTE EXACTE DE FICHIERS
    const txtFiles = ['0.txt', '001.txt', '002.txt', '003.txt', '004.txt', '005.txt', '006.txt', '007.txt', '008.txt', '009.txt', '010.txt', '011.txt', '012.txt', '013.txt', '099.txt', '100.txt', '105.txt', '110.txt', '120.txt', 'video.txt'];
    const txtLookup = {}; // Format : { "url_image": ["0.txt", "120.txt"] }

    // 3. TÉLÉCHARGEMENT ET LECTURE DES FICHIERS
    for (const file of txtFiles) {
        try {
            const res = await fetch(`data/${file}`);
            if (!res.ok) {
                console.warn(`⚠️ Fichier introuvable : ${file}`);
                continue;
            }
            const text = await res.text();
            
            // On cherche toutes les balises src="..."
            const regex = /src="([^"]+)"/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const src = match[1].split('?')[0].trim(); // On nettoie l'URL
                if (!txtLookup[src]) txtLookup[src] = [];
                if (!txtLookup[src].includes(file)) {
                    txtLookup[src].push(file);
                }
            }
        } catch (e) {
            console.warn(`Erreur de lecture : ${file}`);
        }
    }

    // 4. AFFICHAGE DU RÉSULTAT FINAL
    const results = duplicatesInDom.map(src => {
        const occurrences = domCounts[src];
        let foundIn = "❌ Non trouvé dans les .txt (HTML ou Console ?)";
        
        if (txtLookup[src]) {
            foundIn = txtLookup[src].join(' + ');
        }

        return {
            "Image": src.split('/').pop(),
            "Occurrences": occurrences,
            "Fichier(s) .txt d'origine": foundIn
        };
    });

    console.table(results);
    console.log("✅ Analyse terminée !");
})();
