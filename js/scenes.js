// ==========================================
// LIGHTBOX DES SCÈNES (PAR STUDIO OU ACTRICE)
// ==========================================

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Traduit dd/mm/yyyy en "d Month yyyy" et renvoie un timestamp pour le tri
function parseDateToEnglish(dateStr) {
    if (!dateStr) return { formatted: "Unknown date", timestamp: 0 };
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return { formatted: dateStr, timestamp: 0 }; // Fallback si le format est bizarre
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    const monthName = MONTHS[month - 1] || "";
    const formatted = `${day} ${monthName} ${year}`;
    const timestamp = new Date(year, month - 1, day).getTime();
    
    return { formatted, timestamp };
}

function showScenesForStudio(studioName) {
    // 1. Récupérer toutes les images du studio et de ses enfants (hiérarchie)
    let validStudios = [studioName.toLowerCase()];
    if (state.studioHierarchy && state.studioHierarchy.has(studioName)) {
        const getChildren = (nodeId) => {
            const node = state.studioHierarchy.get(nodeId);
            node.children.forEach(c => {
                validStudios.push(c.toLowerCase());
                getChildren(c);
            });
        };
        getChildren(studioName);
    }

    // 2. Filtrer toutes les images de la galerie
    // On utilise window.backupAllMedia (ou on requête le DOM)
    const allMedia = window.backupAllMedia || Array.from(document.querySelectorAll('#gallery img'));
    
    const studioImages = allMedia.filter(el => {
        if (el.tagName.toLowerCase() !== 'img') return false; // Pour le moment, on ne liste que les images
        const studios = (el.dataset.studio || '').toLowerCase().split(',').map(s => s.trim());
        return studios.some(s => validStudios.includes(s));
    });

    // 3. Regrouper par scène (basé sur l'objet _collection déjà généré)
    const scenesMap = new Map();
    studioImages.forEach(img => {
        if (!img._collection) return;
        const col = img._collection;
        // On crée une clé unique pour la scène
        const key = [col.title, col.date, col.studio].join('::');
        if (!scenesMap.has(key)) {
            scenesMap.set(key, { 
                title: col.title || "Untitled", 
                dateStr: col.date, 
                actresses: Array.from(col.actresses).join(', '),
                images: [] 
            });
        }
        scenesMap.get(key).images.push(img);
    });

    // 4. Trier les scènes par date
    const scenesArray = Array.from(scenesMap.values());
    scenesArray.forEach(scene => {
        const parsed = parseDateToEnglish(scene.dateStr);
        scene.formattedDate = parsed.formatted;
        scene.timestamp = parsed.timestamp;
    });
    
    // Tri : Du plus récent au plus ancien. Les dates inconnues (0) à la fin.
    scenesArray.sort((a, b) => {
        if (a.timestamp === 0) return 1;
        if (b.timestamp === 0) return -1;
        return b.timestamp - a.timestamp;
    });

    // 5. Créer l'interface de la Lightbox
    let modal = document.getElementById('scenes-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'scenes-modal';
        modal.className = 'scenes-modal';
        document.body.appendChild(modal);
    }

    let html = `
        <div class="scenes-modal-content">
            <div class="scenes-modal-header">
                <h2>Scenes of: ${studioName}</h2>
                <button class="scenes-close-btn">&times;</button>
            </div>
            <div class="scenes-list">
    `;

    scenesArray.forEach(scene => {
        html += `
            <div class="scene-item">
                <div class="scene-title">
                    <strong>${scene.formattedDate}</strong> : ${scene.title} <span>(${scene.actresses})</span>
                </div>
                <div class="scene-gallery">
        `;
        scene.images.forEach(img => {
            html += `<img src="${img.src}" class="scene-thumb" loading="lazy">`;
        });
        html += `</div></div>`;
    });

    html += `</div></div>`;
    modal.innerHTML = html;

    // 6. Afficher et gérer la fermeture
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';

    modal.querySelector('.scenes-close-btn').addEventListener('click', closeScenesModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeScenesModal();
    });
}

function closeScenesModal() {
    const modal = document.getElementById('scenes-modal');
    if (modal) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
    }
}
