document.addEventListener("DOMContentLoaded", () => {
    let phishingListArea = document.getElementById("phishingList");
    let savePhishingButton = document.getElementById("savePhishingList");

    let whitelistArea = document.getElementById("whitelist");
    let saveWhitelistButton = document.getElementById("saveWhitelist");

    // Загружаем списки из локального хранилища
    chrome.storage.local.get(["phishingList", "whitelist"], (data) => {
		console.log(data.phishingList);
        // Проверяем, что phishingList является массивом, иначе делаем пустым
        phishingListArea.value = Array.isArray(data.phishingList) ? data.phishingList.join("\n") : "";

        // Проверяем, что whitelist является массивом, иначе делаем пустым
        whitelistArea.value = Array.isArray(data.whitelist) ? data.whitelist.join("\n") : "";
    });

    // Сохранение списка фишинговых сайтов
    if (savePhishingButton) {
        savePhishingButton.addEventListener("click", () => {
            let phishingList = phishingListArea.value.split("\n").map(url => url.trim()).filter(url => url); // Убираем пустые строки
            chrome.storage.local.set({ phishingList }, () => {
                alert("Список фишинговых сайтов сохранен!");
            });
        });
    } else {
        console.error("Элемент #savePhishingList не найден.");
    }

    // Сохранение белого списка
    if (saveWhitelistButton) {
        saveWhitelistButton.addEventListener("click", () => {
            let whitelist = whitelistArea.value.split("\n").map(url => url.trim()).filter(url => url); // Убираем пустые строки
            chrome.storage.local.set({ whitelist }, () => {
                alert("Белый список сохранен!");
            });
        });
    } else {
        console.error("Элемент #saveWhitelist не найден.");
    }
});
