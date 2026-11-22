// Liste les éléments où il manque au moins une info (actrice, studio, date ou titre)
const incompleteData = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe')).filter(el => {
    const d = el.dataset;
    return !d.actress || !d.studio || !d.date || !d.title;
});

if (incompleteData.length > 0) {
    console.log(`⚠️ ${incompleteData.length} élément(s) avec un data-1 incomplet :`);
    console.table(incompleteData.map(el => ({
        "Image/Vidéo": el.src.split('/').pop(),
        "Actrice": el.dataset.actress || "❌ Manquant",
        "Studio": el.dataset.studio || "❌ Manquant",
        "Date": el.dataset.date || "❌ Manquant",
        "Titre": el.dataset.title || "❌ Manquant"
    })));
} else {
    console.log("✅ Tous les éléments ont un data-1 complet !");
}
