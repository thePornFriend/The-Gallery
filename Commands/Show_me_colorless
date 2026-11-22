// Sauvegarde de toutes les images
window.backupAllMedia = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe'));

// Filtre : on ne garde que les balises <img> sans data-clr
const missingClr = window.backupAllMedia.filter(el => 
    el.tagName.toLowerCase() === 'img' && (!el.dataset.clr || el.dataset.clr.trim() === '')
);

if (missingClr.length > 0) {
    groupImagesByPrefix(missingClr);
    console.log(`🖼️ Filtre activé : ${missingClr.length} image(s) sans data-clr affichée(s).`);
} else {
    console.log("✅ Toutes les images ont un data-clr !");
}
