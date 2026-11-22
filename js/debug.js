// ==========================================
// OUTIL DE DÉTECTION DE DOUBLONS (AUTO)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // On attend 2 secondes que la galerie principale ait fini de charger les fichiers .txt
    setTimeout(async () => {
        console.log("%c🕵️‍♂️ LANCEMENT DU SCAN DE DOUBLONS...", "color: #FF9800; font-weight: bold;");

        // 1. Récupération des médias dans le DOM (la galerie finale)
        const domMedia = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe'));
        const domCounts = {};
        
        domMedia.forEach(el => {
            const src = (el.getAttribute('src') || '').split('?')[0].trim();
            if (!src) return;
            domCounts[src] = (domCounts[src] || 0) + 1;
        });

        const duplicatesInDom = Object.keys(domCounts).filter(src => domCounts[src] > 1);

        if (duplicatesInDom.length === 0) {
            console.log("%c✅ Aucun doublon trouvé dans la galerie.", "color: #4CAF50; font-weight: bold;");
            return;
        }

        // 2. Ta liste de fichiers .txt
        const txtFiles = ['0.txt', '001.txt', '002.txt', '003.txt', '004.txt', '005.txt', '006.txt', '007.txt', '008.txt', '009.txt', '010.txt', '011.txt', '012.txt', '013.txt', '099.txt', '100.txt', '105.txt', '110.txt', '120.txt', 'video.txt'];
        const txtLookup = {};

        // 3. Lecture des fichiers .txt
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

        // 4. Résultat
        console.log(`%c⚠️ ${duplicatesInDom.length} doublon(s) trouvé(s) !`, "color: #F44336; font-weight: bold; font-size: 14px;");
        
        const results = duplicatesInDom.map(src => {
            return {
                "Image": src.split('/').pop(),
                "Occurrences": domCounts[src],
                "Fichier(s) .txt d'origine": txtLookup[src] ? txtLookup[src].join(' + ') : "❌ Non trouvé dans les .txt (HTML ?)"
            };
        });

        console.table(results);
    }, 2000); // Délai de 2 secondes
});
