// вызов расширения по горячим клавишам
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // если вызов в первый раз
    if (request.target_buttons == 'active')
        var user_text = prompt('Введите текст для поиска', 'введите текст')
    // если вызов уже не в первый раз (из окна с результатами предыдущего поиска)
    else if (request.target_buttons == 'second_call') {
        var user_text = request.text
    }
    var start_time = new Date().getTime()
    // Отправить сообщение на активную вкладку
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var current_url = tabs[0].url
        var url = current_url
        var startNumber = current_url.indexOf('-') + 1
		var projectNumber = current_url.substring(startNumber, current_url.indexOf('-', startNumber))
        var start_project_name = current_url.indexOf('app.jaicp.com') + 14
        var end_project_name = current_url.indexOf('/', start_project_name)
        var project_name = current_url.substring(start_project_name, end_project_name)
        var url = current_url.substring(0, start_project_name) + 'api/editorbe/accounts/' + projectNumber + '/projects/' + project_name + '/content/tree'
        fetch(url).then(r => r.json()).then(result => {
            chrome.tabs.sendMessage(tabs[0].id, {"command": "find", "option": 0, "response": result, "url": url, "search_text": user_text, "start_time": start_time})
        });
    });
})

// Вызывается, когда пользователь нажимает на иконку расширения
chrome.browserAction.onClicked.addListener(function(tab, request) {
    var user_text = prompt('Введите текст для поиска', 'введите текст')
    const start_time = new Date().getTime()
    // Отправить сообщение на активную вкладку
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var current_url = tabs[0].url
        var url = current_url
		var startNumber = current_url.indexOf('-') + 1
		var projectNumber = current_url.substring(startNumber, current_url.indexOf('-', startNumber))
        var start_project_name = current_url.indexOf('app.jaicp.com') + 14
        var end_project_name = current_url.indexOf('/', start_project_name)
        var project_name = current_url.substring(start_project_name, end_project_name)
        var url = current_url.substring(0, start_project_name) + 'api/editorbe/accounts/' + projectNumber + '/projects/' + project_name + '/content/tree'
        fetch(url).then(r => r.json()).then(result => {
            chrome.tabs.sendMessage(tabs[0].id, {"command": "find", "option": 0, "response": result, "url": url, "search_text": user_text, "start_time": start_time})
        });
    });
});
