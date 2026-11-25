// ==========================================
// PRÉ-SÉLECTION TEMPORAIRE (Économie de 4G)
// ==========================================

function filterForDevelopment(elements) {
    // 1. On extrait les données data-1 pour être sûr que data-studio est rempli
    elements.forEach(el => {
        if (typeof applyCombinedData === 'function') applyCombinedData(el);
    });
    
    // 2. La liste des studios que tu veux garder
    const allowedStudios = ['vixen', 'blacked', 'tushy', 'milfy', 'slayed'];
    
    // 3. On filtre
    const filtered = elements.filter(el => {
        const studios = (el.dataset.studio || '').toLowerCase().split(',').map(s => s.trim());
        return studios.some(s => allowedStudios.includes(s));
    });

    console.log(`✂️ Filtre 4G actif : ${filtered.length} images conservées sur ${elements.length}.`);
    
    return filtered;
}

console.log("pre-selection > done");
