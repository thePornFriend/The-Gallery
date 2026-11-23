document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        console.log("%c📅 VÉRIFICATION DES DATES PAR SCÈNE...", "color: #9C27B0; font-weight: bold;");

        // La même fonction de nettoyage
        function normalizeDate(dateStr) {
            if (!dateStr) return "no-date";
            const match = dateStr.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
            if (match) {
                return `${match[3]}-${parseInt(match[2], 10)}-${parseInt(match[1], 10)}`;
            }
            return dateStr.toLowerCase();
        }

        const allImages = Array.from(document.querySelectorAll('#gallery img'));
        const scenes = new Map();

        allImages.forEach(img => {
            const title = img.dataset.title || "Sans titre";
            const studio = img.dataset.studio || "Sans studio";
            const actresses = img.dataset.actress || "Sans actrice";
            
            // Clé pour regrouper les images de la même scène
            const sceneKey = `${title.toLowerCase()}::${studio.toLowerCase()}::${actresses.toLowerCase()}`;

            if (!scenes.has(sceneKey)) {
                scenes.set(sceneKey, { title, studio, actresses, dates: new Map() });
            }
            
            const rawDate = img.dataset.date || "Date manquante";
            const cleanDate = normalizeDate(rawDate);

            // On stocke les dates dans une Map pour associer la version propre à la version brute
            scenes.get(sceneKey).dates.set(cleanDate, rawDate);
        });

        let incoherences = 0;
        const results = [];

        scenes.forEach(scene => {
            // Si une scène a plus d'une date nettoyée différente, c'est une vraie erreur !
            if (scene.dates.size > 1) {
                incoherences++;
                scene.dates.forEach((rawDate, cleanDate) => {
                    results.push({
                        "Scène (Titre)": scene.title,
                        "Date brute": rawDate,
                        "Date formatée": cleanDate
                    });
                });
            }
        });

        if (incoherences === 0) {
            console.log("%c✅ Aucune incohérence réelle de date détectée (les zéros en trop sont ignorés).", "color: #4CAF50; font-weight: bold;");
        } else {
            console.log(`%c⚠️ ${incoherences} scène(s) ont de VRAIES dates différentes !`, "color: #F44336; font-weight: bold; font-size: 14px;");
            console.table(results);
        }

    }, 2500);
});
