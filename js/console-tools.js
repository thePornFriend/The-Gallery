// ==========================================
// 🛠️ CONSOLE TOOLS - WELCOME MESSAGE & HELPERS
// ==========================================

console.log(
  `%c🛠️ WELCOME TO THE GALLERY CONSOLE TOOLS 🛠️`,
  "background: #ffc0cb; color: Black; font-size: 14px; padding: 6px; border-radius: 4px;"
);

console.log(
  `%cHere is what you can do:\n\n` +
  `🔍 If you want to check if an image URL already exists in the project, type:\n` +
  `%c  checkImageExists("https://...")\n\n` +
  `%c🔍 If you want to search for a text (Actress, Studio, Title) in the whole project, type:\n` +
  `%c  searchProject("your text")\n`,
  "color: #FFF; font-size: 14px; font-weight: bold;",
  "color: #00BCD4; font-size: 13px; font-family: monospace; font-weight: bold;",
  "color: #FFF; font-size: 14px; font-weight: bold;",
  "color: #00BCD4; font-size: 13px; font-family: monospace; font-weight: bold;"
);

// ==========================================
// 1. CHECK IF IMAGE EXISTS
// ==========================================
window.checkImageExists = function(urlToCheck) {
    const cleanTarget = urlToCheck.trim().split('?')[0];
    const allImages = Array.from(document.querySelectorAll('#gallery img'));
    
    const matches = allImages.filter(img => {
        const imgSrc = (img.getAttribute('src') || '').split('?')[0];
        return imgSrc === cleanTarget;
    });

    if (matches.length > 0) {
        console.log(`%c⚠️ WARNING: This image already exists in the project! (Found ${matches.length} times)`, "color: #F44336; font-weight: bold; font-size: 14px;");
        matches.forEach(img => {
            console.log(`👉 Title: ${img.dataset.title || "Unknown"} | Gallery N°: ${img.dataset.gallery || "Unknown"}`);
        });
    } else {
        console.log("%c✅ Perfect, this image is not in the gallery yet.", "color: #4CAF50; font-weight: bold;");
    }
};

// ==========================================
// 2. SEARCH PROJECT (Ctrl+F equivalent)
// ==========================================
window.searchProject = function(textToSearch) {
    const query = textToSearch.trim().toLowerCase();
    if (!query) return console.log("Please enter a text to search.");
    
    const allImages = Array.from(document.querySelectorAll('#gallery img'));
    const results = [];
    
    allImages.forEach(img => {
        const actress = (img.dataset.actress || '').toLowerCase();
        const title = (img.dataset.title || '').toLowerCase();
        const studio = (img.dataset.studio || '').toLowerCase();
        const gallery = (img.dataset.gallery || '').toLowerCase();
        
        let matchedField = "";
        if (actress.includes(query)) matchedField = "Actress";
        else if (title.includes(query)) matchedField = "Title";
        else if (studio.includes(query)) matchedField = "Studio";
        else if (gallery.includes(query)) matchedField = "Gallery N°";
        
        if (matchedField) {
            results.push({
                "Match": matchedField,
                "Actress(es)": img.dataset.actress || "-",
                "Title": img.dataset.title || "-",
                "Studio": img.dataset.studio || "-",
                "Gallery": img.dataset.gallery || "-"
            });
        }
    });

    if (results.length > 0) {
        console.log(`%c🔍 ${results.length} result(s) found for "${textToSearch}":`, "color: #2196F3; font-weight: bold;");
        console.table(results);
    } else {
        console.log(`%c❌ No results for "${textToSearch}".`, "color: #FF9800; font-weight: bold;");
    }
};

console.log("Console tools >");
