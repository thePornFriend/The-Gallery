// Liste les liens qui apparaissent plusieurs fois
const srcs = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe')).map(el => el.src);
const counts = {};
srcs.forEach(s => counts[s] = (counts[s] || 0) + 1);
const duplicates = Object.keys(counts).filter(s => counts[s] > 1);

if (duplicates.length > 0) {
    console.log(`⚠️ ${duplicates.length} lien(s) en double trouvé(s) :`);
    console.table(duplicates.map(src => ({ "Lien": src, "Occurrences": counts[src] })));
} else {
    console.log("✅ Aucun lien en double trouvé.");
}
