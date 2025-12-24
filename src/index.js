import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './css/main.css';
import './css/themeswitcher.css';
import './css/settings.css';
import App from './App';
import DateComponent from './DateComponent';
import SettingsModal from './SettingsModal';

/* Default Settings */
const defaultSettings = {
    theme: 'light',
    font: 'Simplicity',
    weatherLocation: 'Princeton, US', // Default ID used to be 5102922 which is Princeton
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

function Root() {
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('leatherbound-settings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                            marginTop: '5px',
                            background: 'transparent',
                            border: '1px solid var(--text-color)',
                            color: 'var(--text-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '2px 8px'
                        }}
                    >
                        Settings
                    </button>
                </div>
            </div>
            <App settings={settings} />
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
  <Root />,
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
      if (area) localStorage.setItem(names[i], area.value);
  }
}
