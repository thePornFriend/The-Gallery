// Sauvegarde de toutes les images
window.backupAllMedia = Array.from(document.querySelectorAll('#gallery img, #gallery video, #gallery iframe'));

// Filtre : on garde tout ce qui n'a pas de data-tag
const missingTags = window.backupAllMedia.filter(el => 
    !el.dataset.tag || el.dataset.tag.trim() === ''
);

if (missingTags.length > 0) {
    groupImagesByPrefix(missingTags);
    console.log(`🏷️ Filtre activé : ${missingTags.length} élément(s) sans tag affiché(s).`);
} else {
    console.log("✅ Tous les éléments ont au moins un tag !");
}
