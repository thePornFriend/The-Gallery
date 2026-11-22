// ==========================================
// LIGHTBOX DES SCÈNES (PAR STUDIO OU ACTRICE)
// ==========================================

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseDateToEnglish(dateStr) {
    if (!dateStr) return { formatted: "Unknown date", timestamp: 0 };
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return { formatted: dateStr, timestamp: 0 }; 
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    const monthName = MONTHS[month - 1] || "";
    const formatted = `${day} ${monthName} ${year}`;
    const timestamp = new Date(year, month - 1, day).getTime();
    
    return { formatted, timestamp };
}

// --- FONCTION GÉNÉRIQUE POUR CONSTRUIRE LA MODALE ---
function openScenesModal(title, filteredImages) {
    const scenesMap = new Map();
    filteredImages.forEach(img => {
        if (!img._collection) return;
        const col = img._collection;
        const key = [col.title, col.date, col.studio].join('::');
        if (!scenesMap.has(key)) {
            scenesMap.set(key, { 
                title: col.title || "Untitled or unknown title", 
                dateStr: col.date, 
                actresses: Array.from(col.actresses).join(', '),
                images: [] 
            });
        }
        scenesMap.get(key).images.push(img);
    });

    const scenesArray = Array.from(scenesMap.values());
    scenesArray.forEach(scene => {
        const parsed = parseDateToEnglish(scene.dateStr);
        scene.formattedDate = parsed.formatted;
        scene.timestamp = parsed.timestamp;
    });
    
    // Tri : Du plus récent au plus ancien. Les inconnues (0) à la fin.
    scenesArray.sort((a, b) => {
        if (a.timestamp === 0) return 1;
        if (b.timestamp === 0) return -1;
        return b.timestamp - a.timestamp;
    });

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
                <h2>${title}</h2>
                <button class="scenes-close-btn">&times;</button>
            </div>
            <div class="scenes-list">
    `;

    if (scenesArray.length === 0) {
        html += `<p style="text-align:center; color:#999; padding: 20px;">No scenes found.</p>`;
    }

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

// --- FONCTIONS SPÉCIFIQUES ---
function showScenesForStudio(studioName) {
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

    const allMedia = window.backupAllMedia || Array.from(document.querySelectorAll('#gallery img'));
    const studioImages = allMedia.filter(el => {
        if (el.tagName.toLowerCase() !== 'img') return false;
        const studios = (el.dataset.studio || '').toLowerCase().split(',').map(s => s.trim());
        return studios.some(s => validStudios.includes(s));
    });

    openScenesModal(`Scenes of Studio: ${studioName}`, studioImages);
}

function showScenesForActress(actressName) {
    // On nettoie le nom (retire le "main:" ou "am:" des checkboxes)
    const cleanName = actressName.replace(/^(main|am):/, '').replace(/^\(|\)$/g, '').toLowerCase();
    
    const allMedia = window.backupAllMedia || Array.from(document.querySelectorAll('#gallery img'));
    const actressImages = allMedia.filter(el => {
        if (el.tagName.toLowerCase() !== 'img') return false;
        const acts = (el.dataset.actress || '').toLowerCase().split(',').map(n => n.trim());
        return acts.some(a => {
            const cleanA = a.replace(/^\(|\)$/g, ''); 
            return cleanA === cleanName || a === cleanName;
        });
    });

    openScenesModal(`Appears in: ${cleanName}`, actressImages);
}

console.log("Scenes lightbox V2");
