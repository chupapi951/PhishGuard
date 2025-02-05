importScripts('/js/fuse.js');
const delta = 0.4; // коэффициент точности для нечеткого поиска
fuse_list = [];
const fuse_options = {
  includeScore: true,
  minMatchCharLength: 2
};

let phishingList = []; 	// список фишинговых сайтов
let phishingListDebug = "badfishing.com";
let whitelist = []; // Белый список
let whitelistVectors = {};
let phishingListLoaded = false; // Флаг завершения загрузки всех списков
var storage = chrome.storage.local; // Доступ к локальному хранилищу

function getDomain(url) {
    let hostname = new URL(url).hostname; 
    // Убираем "www." в начале, если оно есть
    return hostname.startsWith("www.") ? hostname.substring(4) : hostname;
}

function cosineSimilarity(vecA, vecB) { // Вычисляет сходство между двумя векторами
    let dotProduct = 0, magA = 0, magB = 0;
    for (let key in vecA) {
        dotProduct += (vecA[key] * (vecB[key] || 0));
        magA += vecA[key] ** 2;
        magB += (vecB[key] || 0) ** 2;
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    return (magA && magB) ? dotProduct / (magA * magB) : 0;
}

// Функция загрузки белого списка и вычисления его векторов
function processWhitelist() {
    chrome.storage.local.get(["whitelist"], (data) => {
        let whitelist = data.whitelist || [];
        let whitelistVectors = {};

        let processedCount = 0;
        whitelist.forEach((url) => {
            chrome.tabs.create({ url, active: false }, (tab) => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: analyzePage
                }, (results) => {
                    if (results && results[0] && results[0].result) {
                        whitelistVectors[url] = results[0].result;
                        console.log(`Вектор для ${url}:`, whitelistVectors[url]);
                    }
                    // Проверяем, все ли сайты обработаны
                    processedCount++;
                    if (processedCount === whitelist.length) {
                        chrome.storage.local.set({ whitelistVectors }, () => {
                            console.log("✅ Векторы белого списка сохранены!");
                        });
                    }
					// Закрываем вкладку после анализа					
					chrome.tabs.remove(tab.id);
                });
            });
        });
    });
}

// Функция, которая запускается в content.js через executeScript
function analyzePage() {
    let doc = document;
    ret = {
        divs: doc.getElementsByTagName("div").length,
        paragraphs: doc.getElementsByTagName("p").length,
        links: doc.getElementsByTagName("a").length,
        images: doc.getElementsByTagName("img").length,
        forms: doc.getElementsByTagName("form").length,
        scripts: doc.getElementsByTagName("script").length,
        iframes: doc.getElementsByTagName("iframe").length,
        avgTextLength: Array.from(doc.getElementsByTagName("p")).reduce((sum, p) => sum + p.innerText.length, 0) / Math.max(1, doc.getElementsByTagName("p").length)
    };
	return ret;
}

chrome.runtime.onInstalled.addListener(details => { // Установка расширения
	if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
		console.log("Расширение установлено");
// Запрос списка фишинговых сайтов с сервиса OpenPhish
	const url = 'https://openphish.com/feed.txt';

	fetch(url, {

	})
	.then(response => {
		if (response.ok) {
			return response.text();
		} else {
			throw new Error(`Ошибка: ${response.status}`);
		}
	})
	.then(data => {
		phishingList = data.split("\n").map(url => url.trim()).filter(url => url); // Разбиваем по строкам, удаляем пустые
		phishingList.unshift(phishingListDebug);
		console.log(phishingList);
		// Сохраняем в локальное хранилище
		chrome.storage.local.set({ phishingList }, () => {
			console.log("Фишинговый список загружен и сохранён!", phishingList);
		});
	})
	.catch(error => {
		console.error('Произошла ошибка:', error.message);
	});		
// Загрузка списка "белых" сайтов		
		fetch("http://atvua.ru/fishing/get_storage.php", {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
		  },
		  body: JSON.stringify({ key: "value" }),
		})
		  .then((response) => {
			if (!response.ok) {
			  throw new Error("Ошибка сети: " + response.status);
			}
			return response.json();
		  })
		  .then((data) => {
			console.log(data.good_site);
			storage.set({'whitelist': data.good_site}, function() {				
				console.log('Settings whitelist saved');
			});
			console.log("Вычисляем вектора для белого списка");
	
			processWhitelist(data.good_site);
            chrome.storage.local.set({ whitelistVectors: whitelistVectors });
			phishingListLoaded = true;
		  })
		  .catch((error) => {
			console.error("Произошла ошибка:", error);
		  });
	}
});

// Функция проверки URL
function isPhishing(url, tabId) {
	console.log("1 этап: проверка в списке фишинговых сайтов url: ", url);
    let domain = new URL(url).hostname;
	ret = phishingList.includes(domain) && !whitelist.includes(domain);
	if(ret) {
		storage.set({'fishinMSG': "<p style='color: red;'>Страница "+url+" в списке фишинговых сайтов!</p>"}, function() { }); // созраняем сообщение для blocked окна 		
		return true;
	}
	console.log("2 этап: проверяем похожесть URL:", domain);
	const fuse = new Fuse(whitelist, fuse_options);		
	const result = fuse.search(domain);
	console.log(result);
	if(result.length != 0) {
		domain_list = getDomain(result[0].item);
		console.log(getDomain(url)+"   ---- "+domain_list);
		if(getDomain(url) != domain_list && result[0].score <= delta) { // проверяем не является ли URL настоящим сайтом и не "похож" ли он на настоящий сайт
			storage.set({'fishinMSG': "<p style='color: red;'>Фишинг сайта "+result[0].item+" с вероятностью "+Math.floor((1-result[0].score)*100)+"%!</p>"}, function() { }); 
			return true;
		}
	}
    return false;
}

// Слушаем загрузку страниц
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && tab.url) {
		console.log("Проверяем ", tab.url);
		let domain = new URL(tab.url).hostname;		
		if (tab.url === "chrome://newtab/" || tab.url.startsWith("chrome://")) {
			console.log("⏩ Новая вкладка Chrome, пропускаем обработку.");
			return;
		}
		if (tab.url === chrome.runtime.getURL("blocked.html")) {
			console.log("⏩ Страница блокировки экрана, пропускаем обработку.");
			return;
		}	
		if (tab.url === chrome.runtime.getURL("popup.html")) {
			console.log("⏩ Страница параметров расширения, пропускаем обработку.");
			return;
		}	
		if (tab.url === chrome.runtime.getURL("/")) {
			console.log("⏩ Страница расширения, пропускаем обработку.");
			return;
		}	
        if (whitelist.includes(tab.url)) {
            console.log(`✅ Сайт ${tab.url} в белом списке, обработка пропущена.`);
            return;
        }		
		// Загрузка данных из хранилища
		storage.get(["phishingList", "whitelist", "whitelistVectors"], (data) => {
			if (data.phishingList) phishingList = data.phishingList;
			if (data.whitelist) whitelist = data.whitelist;
			if (data.whitelistVectors) whitelistVectors = data.whitelistVectors;			
		});
        if (isPhishing(tab.url, tabId)) {
            // Добавляем в историю блокировок
            let blockedEntry = { url: tab.url, date: new Date().toLocaleString() };
            chrome.storage.local.get(["blockedSites"], (data) => {
                let blockedSites = data.blockedSites || [];
                blockedSites.push(blockedEntry);
                chrome.storage.local.set({ blockedSites });
            });
            // Перенаправляем на страницу предупреждения
			console.log("Переход на страницу");
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
        }
		else {
			console.log("3 этап: проверка косинусного сходства для URL:", tab.url);	
			chrome.scripting.executeScript({
				target: { tabId: tabId },
				function: analyzePage
			}, (results) => {
				if (!results || !results[0] || !results[0].result) return;
				
				let currentVector = results[0].result;
				let threshold = 0.9; // Порог схожести
				let cosins = [];
				for (let whiteUrl in whitelistVectors) {
					domain_list = new URL(whiteUrl).hostname;
					let similarity = cosineSimilarity(currentVector, whitelistVectors[whiteUrl]);
					console.log("Текущий сайт: ", domain, "Проверяемый: ", domain_list, "подобность ",similarity);
					if (similarity >= threshold && domain !== domain_list) {
						cosins.push(similarity);

					}
					else cosins.push(0);
				}
				console.log(cosins);
				let maxNumber = Math.max(...cosins);
				if(maxNumber > threshold) {
						let maxIndex = cosins.indexOf(maxNumber);
						let entries = Object.entries(whitelistVectors);
						let [key, value] = entries[maxIndex] || [];
						
						storage.set({'fishinMSG': `<p style='color: red;'>Возможный фишинг! Текущий сайт похож на ${key} (сходство: ${maxNumber})</p>`}, function() { });
						// Добавляем в историю блокировок
						let blockedEntry = { url: tab.url, date: new Date().toLocaleString() };
						chrome.storage.local.get(["blockedSites"], (data) => {
							let blockedSites = data.blockedSites || [];
							blockedSites.push(blockedEntry);
							chrome.storage.local.set({ blockedSites });
						});
						chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
				}
			});
		}
    }
});
