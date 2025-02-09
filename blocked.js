var optionsUrl = chrome.runtime.getURL('options.html');
var popupUrl = chrome.runtime.getURL('popup.html');
document.addEventListener("DOMContentLoaded", () => {
    let message = document.getElementById("message");
    let img = document.getElementById("icon");	
	chrome.storage.local.get('fishinMSG', function(items) { // 
		if (items.fishinMSG) {
			message.innerHTML = items.fishinMSG + "<br/>";
			img.src = "icon-fishing.png";
		}
		else {
			console.log("Нет сообщения fishinMSG");
			img.src = "128.png";		
		}
		message.innerHTML += 'Нажмите <a target="_blank" href="' + optionsUrl + '">options page</a>, чтобы сообщить о фишинге или <a target="_blank" href="'+popupUrl+'"> popup page</a>, чтобы посмотреть историю блокировок.';
		chrome.storage.local.remove('fishinMSG', function(items) { // 
			console.log("Удалили сообщение fishinMSG");
		});		
	});

});