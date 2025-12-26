import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './css/main.css';
import './css/themeswitcher.css';
import './css/settings.css';
import App from './App';
import DateComponent from './DateComponent';
import SettingsModal from './SettingsModal';

const weatherApiKey = process.env.REACT_APP_WEATHER_API_KEY;

/* Default Settings */
const defaultSettings = {
    theme: 'system',
    font: 'Simplicity',
    headerFont: 'DearSunshine',
    bodyFontSize: 20,
    headerFontSize: 40,
    todoName: 'To do',
    scheduleName: 'Schedule',
    notesName: 'Notes',
    weatherLocation: '', // Set via geolocation on first load
    quickLinks: [
        { title: 'Mail', url: 'https://www.gmail.com', icon: 'gmail' },
        { title: 'Drive', url: 'https://www.drive.google.com', icon: 'google-drive' },
        { title: 'Calendar', url: 'https://calendar.google.com/', icon: 'google-calendar' },
        { title: 'TigerHub', url: 'https://phubprod.princeton.edu/psp/phubprod/?cmd=start', icon: 'fox' },
        { title: 'Spotify', url: 'https://play.spotify.com/', icon: 'spotify' },
        { title: 'GitHub', url: 'https://github.com/', icon: 'github--v1' },
        { title: 'BlackBoard', url: 'https://blackboard.princeton.edu/', icon: 'blackboard-app' },
        { title: 'Canvas', url: 'https://canvas.princeton.edu/', icon: 'canvas-student' }
    ]
};

// Initial Load Logic to prevent FOUC
const savedSettingsRaw = localStorage.getItem('leatherbound-settings');
let parsedSettings = null;
try {
    parsedSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : null;
} catch (e) {
    parsedSettings = null;
}
const initialSettings = { ...defaultSettings, ...(parsedSettings || {}) };

// Apply initial settings immediately
if (initialSettings.theme === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
} else {
    document.documentElement.setAttribute('data-theme', initialSettings.theme);
}
document.documentElement.style.setProperty('--body-font', initialSettings.font);
document.documentElement.style.setProperty('--header-font', initialSettings.headerFont || 'DearSunshine');
document.documentElement.style.setProperty('--body-font-size', (initialSettings.bodyFontSize || 20) / 100 + 'rem');
document.documentElement.style.setProperty('--header-font-size', (initialSettings.headerFontSize || 40) / 100 + 'rem');


function Root({ initialSettings, hadSavedSettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if ((hadSavedSettings && settings.weatherLocation) || !navigator.geolocation || !weatherApiKey) return;
        let cancelled = false;
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const lat = coords.latitude;
                const lon = coords.longitude;
                fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${weatherApiKey}`)
                    .then(resp => resp.ok ? resp.json() : Promise.reject())
                    .then(data => {
                        if (cancelled || !Array.isArray(data) || data.length === 0) return;
                        const city = data[0].name;
                        const state = data[0].state;
                        if (city) {
                            setSettings(prev => ({
                                ...prev,
                                weatherLocation: state ? `${city}, ${state}` : city
                            }));
                            return;
                        }
                        setSettings(prev => ({
                            ...prev,
                            weatherLocation: `${lat},${lon}`
                        }));
                    })
                    .catch(() => {
                        if (cancelled) return;
                        setSettings(prev => ({
                            ...prev,
                            weatherLocation: `${lat},${lon}`
                        }));
                    });
            },
            () => {},
            { timeout: 5000 }
        );
        return () => { cancelled = true; };
    }, [hadSavedSettings, settings.weatherLocation]);

    useEffect(() => {
        // Apply Theme
        if (settings.theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }

        // Apply Font
        document.documentElement.style.setProperty('--body-font', settings.font);
        document.documentElement.style.setProperty('--header-font', settings.headerFont || 'DearSunshine');
        document.documentElement.style.setProperty('--body-font-size', (settings.bodyFontSize || 20) / 100 + 'rem');
        document.documentElement.style.setProperty('--header-font-size', (settings.headerFontSize || 40) / 100 + 'rem');

        // Save settings
        localStorage.setItem('leatherbound-settings', JSON.stringify(settings));
    }, [settings]);

    const handleSaveSettings = (newSettings) => {
        setSettings(newSettings);
    };

    return (
        <React.StrictMode>
            <div id="header-container">
                <DateComponent/>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                    <div id="logo">&sect; leatherbound</div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            marginTop: '0.05rem',
                            background: 'transparent',
                            border: '0.01rem solid rgba(128,128,128,0.4)',
                            color: 'rgba(128,128,128,0.4)',
                            borderRadius: '0.04rem',
                            cursor: 'pointer',
                            fontSize: '0.128rem',
                            padding: '0.02rem 0.08rem'
                        }}
                    >
                        🛠 Configure
                    </button>
                </div>
            </div>
            <App settings={settings} openSettings={() => setIsSettingsOpen(true)} />
            <div id="footer-container">
                <p>&#169; Brandon Lee, {new Date().getFullYear()} &#8226; all rights reserved</p>
                <div style={{display:"flex", flexDirection: "row", alignItems: "center"}}>
                    <div><a href="http://brandonssandbox.com/">BrandonsSandbox.com</a></div>
                </div>
            </div>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={handleSaveSettings}
            />
        </React.StrictMode>
    );
}

/* React updater */
ReactDOM.render(
  <Root initialSettings={initialSettings} hadSavedSettings={Boolean(parsedSettings)} />,
  document.getElementById('root'),
  function() {
    window.onunload = function() {saveAreas();}
    window.onkeypress = function() {saveAreas();}
    window.onkeydown = function() {saveAreas(); console.log("saved");}
  }
);

/* Load and save areas */
function saveAreas(){
  var names = ["schedule", "todo", "notes", "diary"];
  for (var i = 0; i < names.length; i++){
      var area = document.getElementById(names[i] + "-area");
      if (area) localStorage.setItem(names[i], area.innerHTML);
  }
}
