import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './css/main.css';
import './css/themeswitcher.css';
import './css/settings.css';
import App from './App';
import DateComponent from './DateComponent';
import SettingsModal from './SettingsModal';
import { sync, pullAll, pushAll } from './api';

const weatherApiKey = process.env.REACT_APP_WEATHER_API_KEY;

// Keys that are synchronized with the cloud.
const SYNC_KEYS = ["schedule", "todo", "notes", "diary", "leatherbound-settings"];

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
    const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));

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

        // Update timestamp for settings
        const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
        timestamps['leatherbound-settings'] = Date.now();
        localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
    }, [settings]);

    // Apply a map of key -> {content, timestamp} to localStorage, the DOM, and React state.
    const applyServerData = (dataMap) => {
        if (!dataMap || Object.keys(dataMap).length === 0) return;

        const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');

        Object.keys(dataMap).forEach(key => {
            const entry = dataMap[key];
            if (!entry || entry.content == null) return;

            localStorage.setItem(key, entry.content);
            timestamps[key] = entry.timestamp;

            // Update DOM for text areas if they exist
            const area = document.getElementById(key + "-area");
            if (area) {
                area.innerHTML = entry.content;
            }

            // Update settings state if settings changed
            if (key === 'leatherbound-settings') {
                try {
                    setSettings(JSON.parse(entry.content));
                } catch (e) {
                    console.error("Failed to parse synced settings", e);
                }
            }
        });

        localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
    };

    useEffect(() => {
        if (!authToken) return;

        const syncData = async () => {
            if (!navigator.onLine) return;

            // Flush any pending edits from the text areas into localStorage first, so
            // this pass sees the latest content (keydown/paste listeners can lag a keystroke).
            saveAreas();

            // Capture the snapshot time BEFORE reading data. last_sync is set to this value
            // on success so that any edit made during the in-flight request keeps a timestamp
            // greater than last_sync and is still picked up on the next pass. (Stamping
            // last_sync after the request completes would strand those edits below it.)
            const syncStart = Date.now();

            const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
            const dataToSync = {};
            const lastSyncRaw = localStorage.getItem('last_sync');
            const lastSync = parseInt(lastSyncRaw || '0');
            const initialSync = !lastSyncRaw;

            SYNC_KEYS.forEach(key => {
                // On first login, don't push local data; ask server for its latest copy
                if (initialSync) {
                    dataToSync[key] = { timestamp: 0 };
                    return;
                }

                const keyTimestamp = timestamps[key] || 0;
                // If modified since last sync, send content
                if (keyTimestamp > lastSync) {
                    dataToSync[key] = {
                        timestamp: keyTimestamp,
                        content: localStorage.getItem(key)
                    };
                } else {
                     // Otherwise just send timestamp check
                     dataToSync[key] = { timestamp: keyTimestamp };
                }
            });

            try {
                const result = await sync(authToken, dataToSync);
                applyServerData(result.updates);
                localStorage.setItem('last_sync', syncStart.toString());
            } catch (e) {
                console.error("Sync failed", e);
            }
        };

        const interval = setInterval(syncData, 10000); // Sync every 10 seconds
        syncData(); // Initial sync

        return () => clearInterval(interval);
    }, [authToken]);

    // Force push: replace the cloud copy with the local copy.
    const forcePush = async () => {
        if (!authToken) throw new Error('You must be logged in to sync.');
        if (!navigator.onLine) throw new Error('You must be online to sync.');

        // Flush pending edits so we push exactly what is on screen.
        saveAreas();

        const now = Date.now();
        const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
        const dataToPush = {};

        SYNC_KEYS.forEach(key => {
            const content = localStorage.getItem(key);
            if (content !== null) {
                dataToPush[key] = { timestamp: now, content };
                timestamps[key] = now;
            }
        });

        await pushAll(authToken, dataToPush);

        // Keep local timestamps and last_sync aligned so the background sync stays a no-op.
        localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
        localStorage.setItem('last_sync', now.toString());
    };

    // Force pull: replace the local copy with the cloud copy.
    const forcePull = async () => {
        if (!authToken) throw new Error('You must be logged in to sync.');
        if (!navigator.onLine) throw new Error('You must be online to sync.');

        const result = await pullAll(authToken);
        applyServerData(result.data);
        localStorage.setItem('last_sync', Date.now().toString());
    };

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
                setAuthToken={setAuthToken}
                forcePush={forcePush}
                forcePull={forcePull}
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
    window.onpaste = function() {saveAreas();}
  }
);

/* Load and save areas */
function saveAreas(){
  var names = ["schedule", "todo", "notes", "diary"];
  var timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
  var changed = false;

  for (var i = 0; i < names.length; i++){
      var area = document.getElementById(names[i] + "-area");
      if (area) {
          const currentContent = area.innerHTML;
          const savedContent = localStorage.getItem(names[i]);
          const normalizedSaved = savedContent === null ? '' : savedContent;

          if (currentContent !== normalizedSaved) {
              localStorage.setItem(names[i], currentContent);
              timestamps[names[i]] = Date.now();
              changed = true;
          }
      }
  }

  if (changed) {
      localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
  }
}
