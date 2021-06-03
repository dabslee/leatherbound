import React from 'react';
import ReactDOM from 'react-dom';
import './css/main.css';
import './css/themeswitcher.css';
import App from './App';
import DateComponent from './DateComponent';

/* React updater */
ReactDOM.render(
  <React.StrictMode>
    <div id="header-container">
        <DateComponent/>
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