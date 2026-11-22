if (window.backupAllMedia) {
    groupImagesByPrefix(window.backupAllMedia);
    console.log("🔄 Galerie complète restaurée.");
} else {
    console.log("⚠️ Aucune sauvegarde trouvée. Rafraîchis la page (F5).");
}
