document.addEventListener("DOMContentLoaded", () => {
    let historyButton = document.getElementById("viewHistory");
    if (historyButton) {
        historyButton.addEventListener("click", () => {
            chrome.storage.local.get(["blockedSites"], (data) => {
                let history = data.blockedSites || [];
                let historyDiv = document.getElementById("history");
                historyDiv.innerHTML = "<h3>История блокировок:</h3>";
                history.forEach((entry) => {
                    historyDiv.innerHTML += `<p>${entry.date}: ${entry.url}</p>`;
                });
            });
        });
    } else {
        console.error("Элемент #viewHistory не найден.");
    }

    let whitelistButton = document.getElementById("addWhitelist");
    if (whitelistButton) {
        whitelistButton.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                let domain = new URL(tabs[0].url).hostname;
                chrome.storage.local.get(["whitelist"], (data) => {
                    let whitelist = data.whitelist || [];
                    if (!whitelist.includes(domain)) {
                        whitelist.push(domain);
                        chrome.storage.local.set({ whitelist });
                        alert(`${domain} добавлен в белый список`);
                    }
                });
            });
        });
    } else {
        console.error("Элемент #addWhitelist не найден.");
    }
});
