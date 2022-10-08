sessionStorage.search_and_replace_flag = 0

async function find(option, response, url, search_text, start_time) {
    var files = response["files"]
    var files_count = files.length
    var files_names = []
    var results = []
    // одинаковая для всех файлов часть url
    var url = url.substring(0, url.lastIndexOf('/') + 1)
    // парсим имена файлов (полные пути)
    for (var len = files_count, i = 0; i < len; i++) {
        files_names.push(files[i]["name"])
    }
    // парсим поисковый запрос (если находим кавычки, то добавляем перед ними обратный слэш)
    var start_index_pars = search_text.indexOf('"', 0)
    for (; start_index_pars != -1 && start_index_pars < search_text.length;) {
        search_text = search_text.substring(0, start_index_pars) + '\\' + search_text.substring(start_index_pars)
        start_index_pars = search_text.indexOf('"', start_index_pars + 2)
        console.log(search_text + " " + start_index_pars)
    }
    // список с url адресами для получения файлов с сервера
    var request_url_list = []
    // собираем url для request запроса к конкретному файлу на сервере
    for (var i = 0; i < files_names.length; i++) {
        var request_url = url.substring(0, url.lastIndexOf('/') + 1) + 'file?file='
        var start_index = files_names[i].indexOf('/') + 1
        var end_index = 0
        for (var j = 0; j < files_names[i].length; j++) {
            end_index = files_names[i].indexOf('/', start_index)
            if (end_index != -1) {
                request_url += '%2F' + files_names[i].substring(start_index, end_index)
                start_index = end_index + 1
            }
            else {
                request_url += '%2F' + files_names[i].substring(start_index)
                break
            }
        }
        request_url_list.push(request_url)
    }
    // Преобразуем каждый URL в промис, возвращённый fetch
    let requests = request_url_list.map(url => fetch(url).then(result => result.text()));
    // Promise.all будет ожидать выполнения всех промисов (синхронизируем результаты асинхронных запросов)
    var main_list = await Promise.all(requests)

    // перебираем все файлы
    for (var u = 0; u < files_names.length; u++) {
        var text = main_list[u]
        var start_index = 0
        // массив для всех строк в рамках одного файла
        var strings = []
        start_index = text.indexOf('content":"') + 10
        var end_index = 0
        tmp_string = ""
        // получаем строки
        for (var i = 0; i < text.length; i++) {
            var end_index = text.indexOf('\\n', start_index)
            if (end_index != -1) {
                // проверка, что это реальный перенос строки, а не \n в кавычках
                if (text[end_index - 1] != '\\') {
                    //tmp_string += text.substring(start_index, end_index).toLowerCase()  + '\n'
                    tmp_string += text.substring(start_index, end_index)  + '\n'
                    strings.push(tmp_string)
                    tmp_string = ""
                }
                else {
                    //tmp_string += text.substring(start_index, end_index).toLowerCase()
                    tmp_string += text.substring(start_index, end_index)
                }
                start_index = end_index + 2
            }
            // если дошли до конца файла
            else {
                // если был найден \n в кавычках

                //tmp_string += text.substring(start_index).toLowerCase()
                tmp_string += text.substring(start_index)
                strings.push(tmp_string)

                break
            }
        }
        // поиск текста в отдельном файле и формирование строк ответа (если найдены совпадения)
        for (var i = 0; i < strings.length; i++) {
            var start_index = 0
            var find_index = 0
            var counter = 0
            for (var k = 0; k < strings[i].length; k++) {
                find_index = strings[i].toLowerCase().indexOf(search_text.toLowerCase(), start_index)
                if (find_index != -1) {
                    //var html_files_names = document.getElementsByClassName('file-node-file-name')
                    // проверяем что текущий файл виден на странице в браузере (чтобы исключить скрытые файлы)
                    /*for (var a = html_files_names.length - 1; a >= 0; a--) {
                        if (html_files_names[a].textContent == files_names[u].slice(files_names[u].lastIndexOf('/') + 1)) {
                            results.push(['файл: ' + files_names[u].slice(1) + ' | строка: ' + (i + 1) + ' | символ: ' + find_index])
                            start_index = find_index + 1
                        }
                    }*/
                    results.push(['файл: ' + files_names[u].slice(1) + ' | строка: ' + (i + 1) + ' | символ: ' + find_index])
                    start_index = find_index + 1
                }
                else {break}
            }
        }
    }
    // список файлов, в которых найдены совпадения
    var target_files = []
    var tmp_result = ''
    for (var i = 0; i < results.length; i++) {
        tmp_result = results[i][0].substring(6, results[i][0].indexOf('|') - 1)
        if (target_files.indexOf(tmp_result) == -1) {
            target_files.push(tmp_result)
        }
    }
    console.log("results" + results)
    // сортируем все результаты поиска в порядке возрастания (сначала файлы с меньшим кол-вом совпадений)
    /*var counter = 0
    var counters = []
    var sorted_results = []
    for (var p = 0; p < results.length; p++) {
        // если перешли к следующему файлу, тогда сохраняем количество посчитанных совпадений в предыдущем файле
        if (p > 0 && results[p][0].substring(6, results[p][0].indexOf('|') - 1) != results[p - 1][0].substring(6, results[p - 1][0].indexOf('|') - 1)) {
            counters.push(counter)
            counter = 1
        }
        else
            counter++
    }
    var results_index = 0
    for (var p = 0; p < counters.length; p++) {
        for (var p1 = 0; p1 < counters[p]; p1++) {
            sorted_results.push([counters[p], results[results_index]])
            results_index++
        }
    }
    sorted_results.sort((a, b) => a[0] - b[0])
    // удаляем из списка sorted_results лишние элементы
    for (var p = sorted_results.length - 1; p >= 0; p--)
        sorted_results[p] = [sorted_results[p][1][0]]*/
    var div_app = document.querySelector("div.app");
    //results = sorted_results
    console.log(results)
    // свёрнутая панель управления поиском (миниатюра)
    var mini_search_window = document.createElement("div");
    mini_search_window.id = "mini_search_window"
    mini_search_window.style.position = 'absolute'
    mini_search_window.style.width = '180px'
    mini_search_window.style.height = '36px'
    mini_search_window.style.display = 'none';
    mini_search_window.style.left = '35%'
    mini_search_window.style.top = '1.4%'
    mini_search_window.style.zIndex = 100004
    mini_search_window.style.borderRadius = '4px'
    mini_search_window.style.boxShadow = '0 0 15px 5px rgba(0, 0, 0, .1)'
    mini_search_window.style.backgroundColor = 'white'
    var st_mini_sw = document.createElement('style')
    var tn_mini_sw = document.createTextNode(`
        #mini_search_window {
            border: 'solid red';
        }
    `);

    // кнопки перемещения по результатам поиска (миниатюра)
    var go_forward_mini = document.createElement("img");
    iconURL = chrome.extension.getURL("img/arrow_right.png");
    go_forward_mini.setAttribute("src",iconURL)
    var go_back_mini = document.createElement("img");
    iconURL = chrome.extension.getURL("img/arrow_left.png");
    go_back_mini.setAttribute("src",iconURL)
    go_forward_mini.id = "go_forward_mini"
    go_forward_mini.style.position = 'absolute'
    go_forward_mini.style.zIndex = 100005
    go_forward_mini.style.left = '57%'
    go_forward_mini.style.top = '14%'
    go_forward_mini.title = 'К следующему результату'
    go_back_mini.id = "go_back_mini"
    go_back_mini.style.position = 'absolute'
    go_back_mini.style.zIndex = 100005
    go_back_mini.style.left = '10%'
    go_back_mini.style.top = '14%'
    go_back_mini.title = 'К предыдущему результату'
    mini_search_window.appendChild(go_forward_mini);
    mini_search_window.appendChild(go_back_mini);
    var st_arrow_mini = document.createElement('style')
    var tn_arrow_mini = document.createTextNode(`
        #go_forward_mini:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
        #go_back_mini:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_arrow_mini);
    st_arrow_mini.appendChild(tn_arrow_mini);

    // индикатор номера текущего результата поиска (миниатюра)
    var search_number_mini = document.createElement("div");
    search_number_mini.id = 'search_number_mini'
    search_number_mini.style.position = 'absolute'
    search_number_mini.style.left = '27%'
    search_number_mini.style.top = '25%'
    mini_search_window.appendChild(search_number_mini)

    // кнопка разворачивания миниатюры в большое окно
    var open_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/mini_open_icon.png");
    open_btn.setAttribute("src",iconURL)
    open_btn.id = "open_btn"
    open_btn.style.position = 'absolute'
    open_btn.style.left = '84%'
    open_btn.style.top = '20%'
    open_btn.title = 'Развернуть окно'
    open_btn.style.zIndex = 100002
    var st_open = document.createElement('style')
    var tn_open = document.createTextNode(`
        #open_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_open);
    st_open.appendChild(tn_open);
    mini_search_window.appendChild(open_btn)

    document.getElementsByTagName('head')[0].appendChild(st_mini_sw);
    st_mini_sw.appendChild(tn_mini_sw);
    div_app.appendChild(mini_search_window)

    // контейнер под панель управления окном
    var search_window = document.createElement("div");
    search_window.id = "search_window"
    search_window.style.position = 'absolute'
    search_window.style.width = '450px'
    search_window.style.height = '430px'
    search_window.style.left = '40%'
    search_window.style.top = '20%'
    div_app.appendChild(search_window)

    // кнопки перемещения по результатам поиска (полное окно)
    var go_forward = document.createElement("img");
    iconURL = chrome.extension.getURL("img/arrow_right.png");
    go_forward.setAttribute("src",iconURL)
    var go_back = document.createElement("img");
    iconURL = chrome.extension.getURL("img/arrow_left.png");
    go_back.setAttribute("src",iconURL)
    go_forward.id = "go_forward"
    go_forward.style.position = 'absolute'
    go_forward.style.zIndex = 100005
    go_forward.style.left = '88%'
    go_forward.style.top = '10%'
    go_forward.title = 'К следующему результату'
    go_back.id = "go_back"
    go_back.style.position = 'absolute'
    go_back.style.zIndex = 100005
    go_back.style.left = '73%'
    go_back.style.top = '10%'
    go_back.title = 'К предыдущему результату'
    search_window.appendChild(go_forward);
    search_window.appendChild(go_back);
    var st_arrow = document.createElement('style')
    var tn_arrow = document.createTextNode(`
        #go_forward:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
        #go_back:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_arrow);
    st_arrow.appendChild(tn_arrow);
    // создаём глобальную переменную браузера для хранения нашей текущей позиции в списке результатов поиска (число)
    sessionStorage.setItem('current_result_position', 1)
    // создаём глобальную переменную браузера для хранения предыдущей позиции в списке результатов поиска (число)
    sessionStorage.setItem('previous_result_position', 0)
    // создаём глобальную переменную браузера для хранения класса текущего элемента результата поиска, на который мы перешли
    sessionStorage.setItem('current_result_class', "result 1")
    // создаём глобальную переменную браузера для хранения класса предыдущего элемента результата поиска, с которого мы перешли на текущий
    sessionStorage.setItem('previous_result_class', "result 1")
    // создаём глобальную переменную браузера для хранения координат текущего элемента результата поиска в блоке со всеми результатами
    sessionStorage.setItem('result_coordinate', 0)
    // создаём флаг для ожидания загрузки страницы
    sessionStorage.setItem('flag_continue', 0)

    // панель управления окном поиска
    var window_panel = document.createElement("div");
    window_panel.style.backgroundColor = 'white'
    window_panel.style.width = '450px'
    window_panel.style.height = '30px'
    window_panel.style.position = 'relative'
    window_panel.style.display = 'inline-block'
    window_panel.style.borderRadius = '4px 4px 0 0'
    window_panel.style.zIndex = 100000
    window_panel.style.boxShadow = '0 0 10px 5px rgba(0, 0, 0, .4)'
    search_window.appendChild(window_panel)

    // кнопка закрытия окна с результатами поиска
    var close_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/close_icon.png");
    close_btn.setAttribute("src",iconURL)
    close_btn.id = "close_btn"
    close_btn.style.position = 'absolute'
    close_btn.style.left = '93%'
    close_btn.style.top = '18%'
    close_btn.title = 'Закрыть окно'
    close_btn.style.zIndex = 100002
    var st = document.createElement('style')
    var tn = document.createTextNode(`
        #close_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st);
    st.appendChild(tn);
    window_panel.appendChild(close_btn)

    // кнопка сворачивания окна с результатами поиска в миниатюру
    var hide_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/hide_icon.png");
    hide_btn.setAttribute("src",iconURL)
    hide_btn.id = "hide_btn"
    hide_btn.style.position = 'absolute'
    hide_btn.style.left = '83%'
    hide_btn.style.top = '20%'
    hide_btn.title = 'Свернуть окно'
    hide_btn.style.zIndex = 100002
    window_panel.appendChild(hide_btn)
    var st_hide = document.createElement('style')
    var tn_hide = document.createTextNode(`
        #hide_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_hide);
    st_hide.appendChild(tn_hide);
    window_panel.appendChild(hide_btn)

    // кнопка закрытия всех открытых в редакторе вкладок
    var close_files_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/close_files_icon.png");
    close_files_btn.setAttribute("src",iconURL)
    close_files_btn.id = "close_files_btn"
    close_files_btn.style.position = 'absolute'
    close_files_btn.style.left = '71%'
    close_files_btn.style.top = '7%'
    close_files_btn.title = 'Закрыть вкладки'
    close_files_btn.style.zIndex = 100002
    window_panel.appendChild(close_files_btn)
    var st_close_files = document.createElement('style')
    var tn_close_files = document.createTextNode(`
        #close_files_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_close_files);
    st_close_files.appendChild(tn_close_files);
    window_panel.appendChild(close_files_btn)

    // кнопка копирования в буфер результатов поиска
    var copy_search_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/copy_icon.png");
    copy_search_btn.setAttribute("src",iconURL)
    copy_search_btn.id = "copy_search_btn"
    copy_search_btn.style.position = 'absolute'
    copy_search_btn.style.left = '59%'
    copy_search_btn.style.top = '16%'
    copy_search_btn.title = 'Скопировать результат поиска'
    copy_search_btn.style.zIndex = 100002
    window_panel.appendChild(copy_search_btn)
    var st_copy_search_btn = document.createElement('style')
    var tn_copy_search_btn = document.createTextNode(`
        #copy_search_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_copy_search_btn);
    st_copy_search_btn.appendChild(tn_copy_search_btn)
    window_panel.appendChild(copy_search_btn)

    // поле ввода слова для поиска/замены
    var search_and_replace_input = document.createElement("input")
    search_and_replace_input.id = "search_and_replace_input"
    search_and_replace_input.style.width = '145px'
    search_and_replace_input.style.height = '23px'
    search_and_replace_input.style.left = '1%'
    search_and_replace_input.style.top = '12%'
    search_and_replace_input.style.margin = '0 0 0 0'
    search_and_replace_input.placeholder = 'введите текст'
    search_and_replace_input.style.position = 'absolute'
    window_panel.appendChild(search_and_replace_input)

    // кнопка поиска
    var search_btn = document.createElement("img")
    iconURL = chrome.extension.getURL("img/search.png")
    search_btn.setAttribute("src",iconURL)
    search_btn.id = "search_btn"
    search_btn.style.position = 'absolute'
    search_btn.style.left = '35%'
    search_btn.style.top = '8.5%'
    search_btn.title = 'Найти совпадения'
    search_btn.style.zIndex = 100002
    window_panel.appendChild(search_btn)
    var st_search_btn = document.createElement('style')
    var tn_search_btn = document.createTextNode(`
        #search_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    // задаём действие при нажатии кнопки поиска в окне с результатами поиска
    search_btn.addEventListener('click', function(event) {
        sessionStorage.search_text = document.getElementById('search_and_replace_input').value
        var search_window = document.getElementById('search_window')
        var mini_search_window = document.getElementById('mini_search_window')
        // уничтожаем все окна, если они существуют
        if (search_window) {search_window.remove()}
        if (mini_search_window) {mini_search_window.remove()}
        chrome.runtime.sendMessage({target_buttons: "second_call", text: sessionStorage.search_text})
    });
    document.getElementsByTagName('head')[0].appendChild(st_search_btn)
    st_search_btn.appendChild(tn_search_btn)
    window_panel.appendChild(search_btn)

    // кнопка автозамены слова во всех файлах
    var replace_btn = document.createElement("img");
    iconURL = chrome.extension.getURL("img/replace.png");
    replace_btn.setAttribute("src",iconURL);
    replace_btn.id = "replace_btn"
    replace_btn.style.position = 'absolute'
    replace_btn.style.left = '47%'
    replace_btn.style.top = '8.5%'
    replace_btn.title = 'Заменить текст во всех файлах'
    replace_btn.style.zIndex = 100002
    window_panel.appendChild(replace_btn)
    var st_replace_btn = document.createElement('style')
    var tn_replace_btn = document.createTextNode(`
        #replace_btn:hover {
            opacity: 1;
            transform: scale(1.1);
            cursor: pointer;
        }
    `);
    document.getElementsByTagName('head')[0].appendChild(st_replace_btn);
    st_replace_btn.appendChild(tn_replace_btn)
    window_panel.appendChild(replace_btn)

    // назначаем кнопкам действия
    var sc = document.createElement('script')
    var sc_text = document.createTextNode(`
        close_btn.onclick = function() {
            results = []
            search_window.remove()
        };
        hide_btn.onclick = function() {
            search_window.style.display = 'none'
            mini_search_window.style.display = 'inline'
        };
        open_btn.onclick = function() {
            search_window.style.display = 'inline'
            mini_search_window.style.display = 'none'
        };
        close_files_btn.onclick = function () {
            // получаем список всех открытых вкладок
            var open_tabs = document.getElementsByClassName("scrollbar-container ps")[0].children
            // по очереди закрываем каждую вкладку
            for (var len = open_tabs.length - 1; len >= 2; len--) {
                open_tabs[len].children[0].children[1].children[0].click()
            }
        };
        copy_search_btn.onclick = function () {
            var results = sessionStorage.getItem('storage_results').split(',')
            var result_str = ""
            for (var i = 0; i < results.length; i++) {
                result_str += results[i] + "\\n"
            }
            navigator.clipboard.writeText(result_str)
        };

        function call_me (input_text, count, time_counter) {
            // вызываем виджет поиска по странице
            document.getElementsByClassName('justui_icon-button justui_button withoutPadding btn btn-none')[7].click()
            // записываем в поисковое поле виджета целевой запрос
            setTimeout(() => {
                document.getElementsByClassName('ace_search_field')[0].value = sessionStorage.getItem('search_text')
                setTimeout(() => {
                    document.getElementsByClassName('ace_button')[0].click()
                    setTimeout(() => {
                        document.getElementsByClassName('ace_search_field')[1].value = input_text
                        setTimeout(() => {
                            document.getElementsByClassName('ace_searchbtn')[4].click()
                            // закрываем виджет
                            setTimeout(() => {
                                document.getElementsByClassName('ace_searchbtn_close')[0].click()
                                // закрываем файл
                                setTimeout(() => {
                                    if (document.getElementsByClassName('active nav-link')[1]) {
                                        console.log('закрыли вкладку')
                                        document.getElementsByClassName('active nav-link')[1].children[1].click()
                                    }
                                    // если обработали все файлы
                                    if (time_counter == count) {
                                        sessionStorage.setItem('search_and_replace_flag', 1)
                                        document.getElementById('search_and_replace_input').value = sessionStorage.search_text
                                        document.getElementById('search_btn').click()
                                    }
                                })
                            })
                        })
                    })
                })
            })
        };

        replace_btn.onclick = function () {
            // запускаем замену слов, только если совпадения найдены
            if (sessionStorage.search_count != '0') {
                if (sessionStorage.search_and_replace_flag != '1')
                    sessionStorage.setItem('start_time', new Date().getTime())
                // получаем слово, на которое нужно заменить результаты поиска
                var input_text = document.getElementById('search_and_replace_input').value
                sessionStorage.setItem('replace_text', input_text)
                // получаем список всех результатов поиска
                var results = document.getElementsByClassName('result')
                var position = 0
                // получаем названия всех файлов, в которых найдены совпадения
                var target_files = sessionStorage.storage_target_files.split(',')
                for (var h = 0; h < target_files.length; h++) {
                    console.log("111222 " + target_files[h])
                    // открываем файл
                    // 1. сначала разбиваем полный путь к файлу на отдельные части по слэшу
                    //console.log('target_file ' + target_files[h])
                    var file_name = target_files[h].split('/')
                    // 2. затем переходим по каждой из частей (раскрываем все папки, пока не доберёмся до файла)
                    var tmp_address = file_name[0]
                    for (var i = 0; i < file_name.length; i++) {
                        // если это файл, тогда открываем его в редакторе
                        if (file_name[i].indexOf('.') != -1) {
                            console.log(tmp_address)
                            document.querySelector("a[href='Editor.FileBrowser/" + tmp_address + "']").click()
                            break
                        }
                        // если это папка, тогда раскрываем её
                        else {
                            // кликаем только если папка закрыта
                            if (document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].children[0].children[0].getAttribute('data-icon') == 'chevron-right') {
                                document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].click()
                            }
                            console.log('click ' + h)
                            tmp_address += "/" + file_name[i + 1]
                        }
                    }
                }
                var time_counter = 0
                // обрабатываем каждый файл с таймаутом 0,4 сек
                setTimeout(() => {
                    for (var d = 0; d < results.length; d++) {
                        setTimeout(() => {
                            time_counter++
                            call_me(input_text, results.length, time_counter)
                            /*setTimeout(() => {
                                if (d == results.length) {
                                    console.log('hello')
                                    document.getElementById('search_and_replace_input').value = sessionStorage.search_text
                                    document.getElementById('search_btn').click()
                                    // считаем время выполнения поиска
                                    const end_time = new Date().getTime()
                                    var result_time = end_time - start_time
                                    document.getElementById('search_time').textContent = "Время  выполнения: " + ((result_time) / 1000).toFixed(2) + ' сек'
                                }
                            })*/
                        }, d * 300)
                    }
                    console.log('d = ' + d + 'results.length = ' + results.length)
                })
            }
        };

        function open_files(position) {
            // парсим название файла
            let file_name = document.getElementsByClassName(sessionStorage.current_result_class)[0].getAttribute('file_name')
            var file_name_string = file_name
            // открываем файл
            // 1. сначала разбиваем полный путь к файлу на отдельные части по слэшу
            file_name = file_name.split('/')
            // 2. затем переходим по каждой из частей (раскрываем все папки, пока не доберёмся до файла)
            var tmp_address = file_name[0]
            for (var i = 0; i < file_name.length; i++)
            {
                // если это файл, тогда открываем его в редакторе
                if (file_name[i].indexOf('.') != -1) {
                    document.querySelector("a[href='Editor.FileBrowser/" + tmp_address + "']").click()
                }
                // если это папка, тогда раскрываем её
                else {
                    // кликаем только если папка закрыта
                    if (document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].children[0].children[0].getAttribute('data-icon') == 'chevron-right')
                        document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].click()
                    tmp_address += "/" + file_name[i + 1]
                }
            }
            setTimeout(() => {
                // вызываем виджет поиска по странице
                document.getElementsByClassName('justui_icon-button justui_button withoutPadding btn btn-none')[7].click()
                var ace_search_number = 0
                // записываем в поисковое поле виджета целевой запрос
                document.getElementsByClassName('ace_search_field')[0].value = sessionStorage.getItem('search_text')
                console.log('______________')
                console.log('position ' + position)
                if (sessionStorage.search_count == 1)
                    document.getElementsByClassName('ace_searchbtn next')[0].click()
                else {
                    setTimeout(() => {
                        while (ace_search_number != position) {
                            console.log(ace_search_number)
                            document.getElementsByClassName('ace_searchbtn next')[0].click()
                            ace_search_number = parseInt(document.getElementsByClassName('ace_search_counter')[0].textContent.substring(0, document.getElementsByClassName('ace_search_counter')[0].textContent.indexOf('of') - 1))
                        }
                    });
                }
                setTimeout(() => {
                    document.getElementsByClassName('ace_searchbtn next')[0].click()
                    setTimeout(() => {
                        document.getElementsByClassName('ace_searchbtn prev')[0].click()
                        // закрываем виджет
                        setTimeout(() => {
                            document.getElementsByClassName('ace_searchbtn_close')[0].click()
                            setTimeout(() => {
                                if (file_name_string != document.getElementsByClassName(sessionStorage.previous_result_class)[0].getAttribute('file_name'))
                                    document.getElementById('tabs_nav_item_/' + document.getElementsByClassName(sessionStorage.previous_result_class)[0].getAttribute('file_name')).children[0].children[1].click()
                            })
                        })
                    })
                })
                console.log(document.getElementsByClassName('ace_search_counter')[0].textContent)
            }, 200)
        }

        function go_to_next_result() {
            // проверяем, что текущий элемент не последний
            if (parseInt(sessionStorage.current_result_position) < parseInt(sessionStorage.search_count)) {
                // class текущего элемента записываем в class предыдущего элемента
                sessionStorage.previous_result_class = sessionStorage.current_result_class

                // присваиваем предыдущему элементу порядковый номер текущего элемента
                sessionStorage.previous_result_position = sessionStorage.current_result_position

                // присваиваем текущему элементу порядковый номер следующего элемента
                sessionStorage.current_result_position = parseInt(sessionStorage.current_result_position) + 1

                // class следующего элемента записываем в class текущего элемента
                sessionStorage.current_result_class = "result " + sessionStorage.current_result_position

                // определяем координату текущего элемента
                sessionStorage.result_coordinate = parseInt(sessionStorage.result_coordinate) + 15 * (parseInt(sessionStorage.current_result_position) - parseInt(sessionStorage.previous_result_position))

                // устанавливаем положение прокрутки внутри блока с результатами поиска равным положению текущего элемента
                document.getElementById('text_box').scrollTop = sessionStorage.result_coordinate

                // обнуляем стили для предыдущего элемента
                document.getElementsByClassName(sessionStorage.previous_result_class)[0].style.background = 'white'
                document.getElementById('result_number ' + sessionStorage.previous_result_position).style.background = '#BEBEBE'
                document.getElementById('result_number ' + sessionStorage.previous_result_position).style.boxShadow = '0 5px 5px 0 rgba(.3, .3, .3, .3)'

                // добавляем стили для текущего элемента
                document.getElementsByClassName(sessionStorage.current_result_class)[0].style.background = '#BEBEBE'
                document.getElementById('result_number ' + sessionStorage.current_result_position).style.background = 'white'
                document.getElementById('result_number ' + sessionStorage.current_result_position).style.boxShadow = '0 0 0 0 rgba(.3, .3, .3, .3)'

                var current_element = document.getElementsByClassName(sessionStorage.current_result_class)[0]
                open_files(current_element.getAttribute('result_position_in_file'))
                document.getElementById('search_number_mini').textContent = sessionStorage.current_result_position + ' из ' + sessionStorage.search_count
            }
        };
        function go_to_previous_result() {
            // проверяем, что текущий элемент не первый
            if (parseInt(sessionStorage.current_result_position) > 1) {
                // class текущего элемента записываем в class предыдущего элемента
                sessionStorage.previous_result_class = sessionStorage.current_result_class

                // присваиваем предыдущему элементу порядковый номер текущего элемента
                sessionStorage.previous_result_position = sessionStorage.current_result_position

                // присваиваем текущему элементу порядковый номер следующего элемента
                sessionStorage.current_result_position = parseInt(sessionStorage.current_result_position) - 1

                // class следующего элемента записываем в class текущего элемента
                sessionStorage.current_result_class = "result " + sessionStorage.current_result_position

                // определяем координату текущего элемента
                sessionStorage.result_coordinate = parseInt(sessionStorage.result_coordinate) - 15 * (parseInt(sessionStorage.previous_result_position) - parseInt(sessionStorage.current_result_position))
                // устанавливаем положение прокрутки внутри блока с результатами поиска равным положению текущего элемента
                document.getElementById('text_box').scrollTop = sessionStorage.result_coordinate

                // обнуляем стили для предыдущего элемента
                document.getElementsByClassName(sessionStorage.previous_result_class)[0].style.background = 'white'
                document.getElementById('result_number ' + sessionStorage.previous_result_position).style.background = '#BEBEBE'
                document.getElementById('result_number ' + sessionStorage.previous_result_position).style.boxShadow = '0 5px 5px 0 rgba(.3, .3, .3, .3)'

                // добавляем стили для текущего элемента
                document.getElementsByClassName(sessionStorage.current_result_class)[0].style.background = '#BEBEBE'
                document.getElementById('result_number ' + sessionStorage.current_result_position).style.background = 'white'
                document.getElementById('result_number ' + sessionStorage.current_result_position).style.boxShadow = '0 0 0 0 rgba(.3, .3, .3, .3)'

                var current_element = document.getElementsByClassName(sessionStorage.current_result_class)[0]
                open_files(current_element.getAttribute('result_position_in_file'))
                document.getElementById('search_number_mini').textContent = sessionStorage.current_result_position + ' из ' + sessionStorage.search_count
            }
        };
        /*function go_to_result() {
            console.log('hello!')
        };
        document.getElementsByClassName('result').onclick = function() {
            console.log('hello!')
        };*/
        go_forward.onclick = go_to_next_result
        go_back.onclick = go_to_previous_result
        go_forward_mini.onclick = go_to_next_result
        go_back_mini.onclick = go_to_previous_result
    `);
    document.getElementsByTagName('head')[0].appendChild(sc);
    sc.appendChild(sc_text);

    // контейнер с результатами поиска
    var text_box = document.createElement("div");
    search_window.appendChild(text_box)
    text_box.id = "text_box"
    text_box.style.zIndex = 100000
    text_box.style.backgroundColor = 'white'
    text_box.style.position = 'relative'
    text_box.style.fontSize = '10px'
    text_box.style.width = '450px'
    text_box.style.height = '400px'
    text_box.style.display = 'inline-block'
    text_box.style.padding = "8px"

    text_box.style.boxShadow = '0 0 10px 5px rgba(0, 0, 0, .4)'
    text_box.style.overflow = 'auto'

    var search_text_node = document.createTextNode("Запрос: " + search_text)
    sessionStorage.setItem('search_text', search_text)
    text_box.appendChild(search_text_node)

    var br = document.createElement("br")
    text_box.appendChild(br)

    var search_time_div = document.createElement("div")
    search_time_div.id = 'search_time'
    text_box.appendChild(search_time_div)

    var br = document.createElement("br")
    text_box.appendChild(br)

    var results_count = document.createElement("div")
    results_count.textContent = "Совпадения: " + results.length + " (файлов: " + target_files.length + ")"
    results_count.style.marginBottom = '4px'
    text_box.appendChild(results_count)

    console.log('hello_1!')
    if (results.length != 0) {
        console.log('hello_2!')
        var current_file_name = [results[0][0].substring(6, results[0][0].indexOf('| строка:') - 1), 1]
        var number_in_file = 0
        // выводим результаты поиска
        for (var i = 0; i < results.length; i++) {
            if (current_file_name[0] != results[i][0].substring(6, results[i][0].indexOf('| строка:') - 1)) {
                current_file_name = [results[i][0].substring(6, results[i][0].indexOf('| строка:') - 1), i]
                number_in_file = 1
            }
            else {number_in_file++}
            // элемент с номером найденного совпадения
            var number_div = document.createElement("div");
            // элемент с описанием найденного совпадения
            var text_div = document.createElement("div");
            number_div.textContent = (i + 1)
            number_div.style.width = '29px'
            number_div.style.display = 'inline-block'
            number_div.style.paddingLeft = '3px'
            number_div.style.background = '#BEBEBE'
            number_div.style.boxShadow = '0 5px 5px 0 rgba(.3, .3, .3, .3)'
            number_div.id = "result_number " + (i + 1)
            text_div.textContent = results[i]
            text_div.style.paddingLeft = '3px'
            text_div.style.paddingRight = '3px'
            text_div.className = "result " + (i + 1)
            // добавляем дополнительный атрибут с порядковым номером совпадения среди всех результатов поиска
            text_div.setAttribute('general_result_position', i + 1)
            // добавляем дополнительный атрибут с порядковым номером совпадения в текущем файле
            text_div.setAttribute('result_position_in_file', number_in_file)
            // добавляем дополнительный атрибут с именем файла
            text_div.setAttribute('file_name', current_file_name[0])
            text_div.style.zIndex = 100001
            text_div.style.background = 'white'
            text_div.style.position = 'relative'
            text_div.style.fontSize = '10px'
            text_div.style.display = 'inline-block'
            text_div.style.marginLeft = '5px'
            text_div.addEventListener("click", go_to_result.bind(i))
            // добавляем div с текстом в контейнер с результатами поиска
            text_box.appendChild(number_div);
            text_box.appendChild(text_div);
            var br = document.createElement("br");
            text_box.appendChild(br);
        }
        document.getElementById('search_number_mini').textContent = '1 из ' + results.length

        var st_copy_search_btn1 = document.createElement('style')
        var tn_copy_search_btn1 = document.createTextNode(`
            .result:hover {
                background: '#BEBEBE';
                transform: scale(1.05);
                cursor: pointer;
                box-shadow: 0 0 6px black;
            }
        `);
        document.getElementsByTagName('head')[0].appendChild(st_copy_search_btn1);
        st_copy_search_btn1.appendChild(tn_copy_search_btn1);

        // стили для первого элемента
        document.getElementsByClassName('result 1')[0].style.background = '#BEBEBE'
        document.getElementById('result_number 1').style.boxShadow = '0 0 0 0 rgba(.3, .3, .3, .3)'
        document.getElementById('result_number 1').style.background = 'white'
    }
    console.log('hello_3!')
    // сохраняем результаты поиска в глобальную переменную браузера
    sessionStorage.setItem('storage_results', results)
    // сохраняем в глобальную переменную браузера количество результатов найденных совпадений
    sessionStorage.setItem('search_count', results.length)
    // если нет совпадений, то обнуляем флаг замены слов и обнуляем время
    if (results.length == 0) {
        sessionStorage.search_and_replace_flag = 0
        sessionStorage.start_time = 0
    }
    // сохраняем в глобальную переменную браузера названия файлов, в которых найдены совпадения
    sessionStorage.setItem('storage_target_files', target_files)
    if (results.length != 0) { _open_files(1) }
    // считаем время выполнения поиска
    const end_time = new Date().getTime()
    //if (parseInt(sessionStorage.start_time) > 0)
    //    start_time = parseInt(sessionStorage.start_time)
    var result_time = end_time - start_time
    document.getElementById('search_time').textContent = "Время  выполнения: " + ((result_time) / 1000).toFixed(2) + ' сек'
    console.log('hello_4!')
}

// функция для перехода к любому результату поиска по клику на него
function go_to_result(a) {
    // получаем порядковый номер выбранного элемента
    var current_result_position_tmp = a.srcElement.getAttribute('general_result_position')
    // class текущего элемента записываем в class предыдущего элемента
    sessionStorage.previous_result_class = sessionStorage.current_result_class

    // присваиваем предыдущему элементу порядковый номер текущего элемента
    sessionStorage.previous_result_position = sessionStorage.current_result_position

    //var current_element = document.getElementsByClassName(sessionStorage.current_result_class)[0]

    // присваиваем текущему элементу порядковый номер выбранного элемента
    sessionStorage.current_result_position = current_result_position_tmp

    // class выбранного элемента записываем в class текущего элемента
    sessionStorage.current_result_class = document.getElementsByClassName('result ' + current_result_position_tmp)[0].className
    console.log(sessionStorage.current_result_class)

    // определяем координату текущего элемента
    sessionStorage.result_coordinate = parseInt(sessionStorage.result_coordinate) + 15 * (parseInt(sessionStorage.current_result_position) - parseInt(sessionStorage.previous_result_position))

    // устанавливаем положение прокрутки внутри блока с результатами поиска равным положению текущего элемента
    document.getElementById('text_box').scrollTop = sessionStorage.result_coordinate

    // обнуляем стили для предыдущего элемента
    document.getElementsByClassName(sessionStorage.previous_result_class)[0].style.background = 'white'
    document.getElementById('result_number ' + sessionStorage.previous_result_position).style.background = '#BEBEBE'
    document.getElementById('result_number ' + sessionStorage.previous_result_position).style.boxShadow = '0 5px 5px 0 rgba(.3, .3, .3, .3)'

    // добавляем стили для текущего элемента
    document.getElementsByClassName(sessionStorage.current_result_class)[0].style.background = '#BEBEBE'
    document.getElementById('result_number ' + sessionStorage.current_result_position).style.background = 'white'
    document.getElementById('result_number ' + sessionStorage.current_result_position).style.boxShadow = '0 0 0 0 rgba(.3, .3, .3, .3)'

    _open_files(a.srcElement.getAttribute('result_position_in_file'))
};

function _open_files(position) {
    // парсим название файла
    let file_name = document.getElementsByClassName(sessionStorage.current_result_class)[0].getAttribute('file_name')
    var file_name_string = file_name
    // открываем файл
    // 1) сначала разбиваем полный путь к файлу на отдельные части по слэшу
    file_name = file_name.split('/')
    // 2) затем переходим по каждой из частей (раскрываем все папки, пока не доберёмся до файла)
    var tmp_address = file_name[0]
    for (var i = 0; i < file_name.length; i++)
    {
        // если это файл, тогда открываем его в редакторе
        if (file_name[i].indexOf('.') != -1) {
            document.querySelector("a[href='Editor.FileBrowser/" + tmp_address + "']").click()
        }
        // если это папка, тогда раскрываем её
        else {
            // кликаем только если папка закрыта
            if (document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].children[0].children[0].getAttribute('data-icon') == 'chevron-right')
                document.querySelector("a[href='Editor.FileBrowserd/" + tmp_address + "']").children[0].children[0].click()
            tmp_address += "/" + file_name[i + 1]
        }
    }
    setTimeout(() => {
        // вызываем виджет поиска по странице
        document.getElementsByClassName('justui_icon-button justui_button withoutPadding btn btn-none')[7].click()
        var ace_search_number = 0
        // записываем в поисковое поле виджета целевой запрос
        document.getElementsByClassName('ace_search_field')[0].value = sessionStorage.getItem('search_text')
        console.log('______________')
        console.log('position ' + position)
        setTimeout(() => {
            if (sessionStorage.search_count == 1)
                document.getElementsByClassName('ace_searchbtn next')[0].click()
            else {
                setTimeout(() => {
                    while (ace_search_number != position) {
                        console.log(ace_search_number)
                        document.getElementsByClassName('ace_searchbtn next')[0].click()
                        ace_search_number = parseInt(document.getElementsByClassName('ace_search_counter')[0].textContent.substring(0, document.getElementsByClassName('ace_search_counter')[0].textContent.indexOf('of') - 1))
                    }
                });
            }
            setTimeout(() => {
                document.getElementsByClassName('ace_searchbtn next')[0].click()
                setTimeout(() => {
                    document.getElementsByClassName('ace_searchbtn prev')[0].click()
                    // закрываем виджет
                    setTimeout(() => {
                        document.getElementsByClassName('ace_searchbtn_close')[0].click()
                        setTimeout(() => {
                            if (file_name_string != document.getElementsByClassName(sessionStorage.previous_result_class)[0].getAttribute('file_name'))
                                document.getElementById('tabs_nav_item_/' + document.getElementsByClassName(sessionStorage.previous_result_class)[0].getAttribute('file_name')).children[0].children[1].click()
                            setTimeout(() => {
                                if (sessionStorage.search_and_replace_flag == '1') {
                                    if (sessionStorage.search_count != '0') {
                                        document.getElementById('search_and_replace_input').value = sessionStorage.replace_text
                                        document.getElementById('replace_btn').click()
                                    }
                                }
                                else {
                                    // считаем время выполнения поиска
                                    //var end_time = new Date().getTime()
                                    //if (sessionStorage.search_and_replace_flag != '0')
                                    //var result_time = end_time - parseInt(sessionStorage.start_time)
                                    //document.getElementById('search_time').textContent = "Время выполнения: " + ((result_time) / 1000).toFixed(2) + ' сек'
                                    //sessionStorage.search_and_replace_flag = 0
                                }
                            })
                        })
                    })
                })
            })
        })
    }, 200)

    // если переходим к новому файлу, тогда закрываем предыдущий файл
    console.log('новый файл = ' + file_name_string)
    console.log('file_name = ' + file_name)
    console.log(sessionStorage.previous_result_class)
    console.log('старый файл = ' + document.getElementsByClassName(sessionStorage.previous_result_class)[0].getAttribute('file_name'))

    console.log(sessionStorage.current_result_position)
    console.log(sessionStorage.previous_result_position)
    console.log(sessionStorage.current_result_class)
    console.log(sessionStorage.previous_result_class)
    console.log(sessionStorage.result_coordinate)
    console.log('hello_9!')
}

chrome.runtime.onMessage.addListener(
    function(request, sendResponse) {
        if (request.command === "find") {
            search_window = document.getElementById('search_window')
            mini_search_window = document.getElementById('mini_search_window')
            // уничтожаем все окна, если они существуют
            if (search_window) {search_window.remove()}
            if (mini_search_window) {mini_search_window.remove()}
            find(request.option, request.response, request.url, request.search_text, request.start_time)
        }
    }
);

// вызов окна поиска по двойному нажатию CapsLock
var active_buttons = []
document.addEventListener('keyup', function(event) {
    if (active_buttons.length < 2) {
        if (event.code == "CapsLock") {
            active_buttons.push("CapsLock")
        }
        else {active_buttons = []}
    }
    if (active_buttons.length == 2) {
        active_buttons = []
        search_window = document.getElementById('search_window')
        mini_search_window = document.getElementById('mini_search_window')
        // уничтожаем все окна, если они существуют
        if (search_window) {search_window.remove()}
        if (mini_search_window) {mini_search_window.remove()}
        chrome.runtime.sendMessage({target_buttons: "active", text: 0})
    }
});
