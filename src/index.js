import React from 'react';
import ReactDOM from 'react-dom';
import './css/main.css';
import './css/themeswitcher.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/* React updater */
ReactDOM.render(
  <React.StrictMode>
    <div id="header-container">
        <div style={{display:"flex", flexDirection:"column"}}>
            <h1 id="date"></h1>
            <div class="sh" id="time"></div>
        </div>
        <div id="logo">&sect; leatherbound</div>
    </div>
    <App/>
    <div id="footer-container">
        <p>&#169; Brandon Lee, 2021 &#8226; all rights reserved</p>
        <div style={{display:"flex", flexDirection: "row", alignItems: "center"}}>
            <div class="theme-switch-wrapper">
                <label class="theme-switch" for="checkbox">
                    <input type="checkbox" id="checkbox" />
                    <div class="slider round"></div>
                </label>
            <div style={{fontStyle: "normal"}}>&ensp;&#9790;</div>
            </div>
            <div><a href="http://brandonssandbox.com/">BrandonsSandbox.com</a></div>
        </div>
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);

/* Date updater */
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

/* localStorage methods */
function getData(key) {
  return localStorage.getItem(key);
}
function setData(key,value) {
  return localStorage.setItem(key, value);
}

/* Load and save areas */
function fillAreas(){
  var names = ["schedule", "todo", "notes", "diary"];
  for (var i = 0; i < names.length; i++){
      var area = document.getElementById(names[i] + "-area");
      if (area) area.value = getData(names[i]);
  }
}
function saveAreas(){
  var names = ["schedule", "todo", "notes", "diary"];
  for (var i = 0; i < 5; i++){
      var area = document.getElementById(names[i] + "-area");
      if (area) setData(names[i], area.value);
  }
}

/* Theme manager */
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