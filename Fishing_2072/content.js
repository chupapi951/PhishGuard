// Ждем сообщения от background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "phishingWarning") {
        alert(`⚠️ Внимание! Этот сайт может быть фишинговым!\n\nОн похож на: ${message.whiteUrl}`);
    }
});
