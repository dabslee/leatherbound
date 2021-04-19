var updateDate = function(){
    const months = {
        0: 'January',
        1: 'February',
        2: 'March',
        3: 'April',
        4: 'May',
        5: 'June',
        6: 'July',
        7: 'August',
        8: 'September',
        9: 'October',
        10: 'November',
        11: 'December'
    }
    const days = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
    }

    var currentTime = new Date();
    document.getElementById("date").innerHTML = `${days[currentTime.getDay()]}, ${currentTime.getMonth()}-${currentTime.getDate()}-${currentTime.getFullYear()}`;
    document.getElementById("time").innerHTML = currentTime.toLocaleTimeString().substr(0, 11);
}
var timer = setInterval(updateDate, 100);

function getData(key) {
    return localStorage.getItem(key);
}
function setData(key,value) {
    return localStorage.setItem(key, value);
}

function fillAreas(){
    var names = ["schedule", "todo", "diary"];
    for (var i = 0; i < names.length; i++){
        document.getElementById(names[i] + "-area").value = getData(names[i]);
    }
}
function saveAreas(){
    var names = ["schedule", "todo", "diary"];
    for (var i = 0; i < 5; i++){
        setData(names[i], document.getElementById(names[i] + "-area").value);
    }
}

/* Weather */
const apiKey = "9237036ab7c0bf80dd4223ff17715372";

function kToF(tempK) {
    return Math.round((tempK-273.15)*1.8+32);
}
function updateWeather() {
    var icons = {
        "01d":"sun--v1",
        "01n":"bright-moon",
        "02d":"partly-cloudy-day--v1",
        "02n":"partly-cloudy-night",
        "03d":"cloud",
        "03n":"cloud",
        "04d":"cloud",
        "04n":"cloud",
        "09d":"rain",
        "09n":"rain",
        "10d":"rain",
        "10n":"rain",
        "11d":"storm--v1",
        "11n":"storm--v1",
        "13d":"snow-storm",
        "13n":"snow-storm",
        "50d":"foggy-night-1",
        "50n":"foggy-night-1"
    }

    fetch(`https://api.openweathermap.org/data/2.5/weather?id=5102922&appid=${apiKey}`)  
    .then(function(resp) { return resp.json() })
    .then(function(data) {
        document.getElementById("description-today").innerHTML = data.weather[0].description;
        document.getElementById("current-temp-today").innerHTML = kToF(data.main.temp);
        document.getElementById("high-temp-today").innerHTML = kToF(data.main.temp_max);
        document.getElementById("low-temp-today").innerHTML = kToF(data.main.temp_min);
        document.getElementById("icon-today").src = "https://img.icons8.com/plasticine/400/000000/" + icons[data.weather[0].icon] + ".png";
    });
    fetch(`https://api.openweathermap.org/data/2.5/forecast?id=5102922&appid=${apiKey}`)
    .then(function(resp) { return resp.json() })
    .then(function(data) {
        document.getElementById("precipitation-today").innerHTML = data.list[0].pop * 100;

        console.log(data.list[8].weather[0].description)
        document.getElementById("description-tomorrow").innerHTML = data.list[8].weather[0].description;
        document.getElementById("average-temp-tomorrow").innerHTML = kToF(data.list[8].main.temp);
        document.getElementById("high-temp-tomorrow").innerHTML = kToF(data.list[8].main.temp_max);
        document.getElementById("low-temp-tomorrow").innerHTML = kToF(data.list[8].main.temp_min);
        document.getElementById("precipitation-tomorrow").innerHTML = data.list[8].pop * 100;
        document.getElementById("icon-tomorrow").src = "https://img.icons8.com/plasticine/400/000000/" + icons[data.list[8].weather[0].icon] + ".png";
    });
}

var areasfilled = false;
window.onload = function() {
    updateWeather();
    fillAreas();
    areasfilled = true;
}
window.onunload = function() {
    if (areasfilled){
        saveAreas();
    }
    areasfilled = false;
}
window.onkeypress = function() {
    if (areasfilled){
        saveAreas();
    }
}




const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {        
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

toggleSwitch.addEventListener('change', switchTheme, false);