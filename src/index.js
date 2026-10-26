import React, { useState, useEffect, useRef } from 'react';
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

    // Serialized settings we consider already synced/loaded. Prevents a plain page
    // (re)load from bumping the settings timestamp and making a stale copy look newer
    // than the cloud. Updated whenever we persist a genuine change or apply a pulled one.
    const settingsRef = useRef(JSON.stringify(initialSettings));
    // Set while a Force Pull/Push is in flight so the 10s background pass stands down
    // and can't race (and clobber) the forced operation.
    const forceOpRef = useRef(false);

    // Message shown in Settings when the cloud session ends (e.g. the login token expired).
    // The background sync can't recover a dead token on its own, so instead of hammering the
    // server with 401s forever and silently pretending to sync, we surface this and drop back
    // to the logged-out state.
    const [authNotice, setAuthNotice] = useState('');
    // Controls the "Session expired" prompt that pops up (even when Settings is closed).
    const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
    // When opening Settings programmatically we can request a specific tab (e.g. Data).
    const [settingsOpenToTab, setSettingsOpenToTab] = useState(null);

    // Clear the expiry state once the user has authenticated again.
    useEffect(() => {
        if (authToken) {
            setAuthNotice('');
            setSessionExpiredOpen(false);
        }
    }, [authToken]);

    // The cloud rejected our token (expired/invalid). End the session so the UI stops claiming
    // it's syncing, and prompt a re-login. Local data and timestamps are kept, so logging back
    // in performs a normal timestamp merge rather than a destructive pull.
    const handleSessionExpired = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        setAuthToken(null);
        setAuthNotice('Your session expired. Please log in again to resume syncing.');
        setSessionExpiredOpen(true);
    };

    const openSettings = (tab = null) => {
        setSettingsOpenToTab(tab);
        setIsSettingsOpen(true);
    };

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

        // Persist settings. Always write the content, but only bump the sync timestamp when
        // the settings actually changed. This effect also runs on every mount and on pulled
        // updates; bumping unconditionally made a freshly loaded (possibly stale) device stamp
        // its settings with "now" and overwrite a newer cloud copy on the next sync.
        const serialized = JSON.stringify(settings);
        localStorage.setItem('leatherbound-settings', serialized);

        if (serialized !== settingsRef.current) {
            const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
            timestamps['leatherbound-settings'] = Date.now();
            localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
            settingsRef.current = serialized;
        }
    }, [settings]);

    // Apply a map of key -> {content, timestamp} to localStorage, the DOM, and React state.
    // Used by the background sync pass for server-newer updates.
    const applyServerData = (dataMap) => {
        if (!dataMap || Object.keys(dataMap).length === 0) return;

        const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');

        Object.keys(dataMap).forEach(key => {
            const entry = dataMap[key];
            if (!entry || entry.content == null) return;

            // Never overwrite an editor the user is actively typing in; that yanks their caret
            // and drops in-progress text. Skip it this pass and let it reconcile once focus
            // leaves (their own edit carries a newer timestamp anyway).
            const area = document.getElementById(key + "-area");
            if (area && document.activeElement === area) return;

            localStorage.setItem(key, entry.content);
            timestamps[key] = entry.timestamp;

            if (area) {
                area.innerHTML = entry.content;
            }

            // Update settings state if settings changed
            if (key === 'leatherbound-settings') {
                try {
                    const parsed = JSON.parse(entry.content);
                    // Mark as already-synced so the [settings] effect doesn't re-stamp it.
                    settingsRef.current = JSON.stringify(parsed);
                    setSettings(parsed);
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

            // Stand down while a forced pull/push is running to avoid racing (and clobbering) it.
            if (forceOpRef.current) return;

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
                // On first login, let the server's copy win (timestamp 0 means any existing
                // server entry is returned to us) but still include local content: that way a
                // key the server doesn't have yet (e.g. local-only notes on a fresh account)
                // gets created instead of being stranded forever below last_sync.
                if (initialSync) {
                    dataToSync[key] = { timestamp: 0, content: localStorage.getItem(key) };
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

                // The server hands back a fresh token when ours is past halfway through its
                // lifetime, so a continuously-open tab never gets logged out mid-use.
                if (result.token && result.token !== authToken) {
                    localStorage.setItem('auth_token', result.token);
                    setAuthToken(result.token);
                }
            } catch (e) {
                // An expired/invalid token (401) will fail on every pass; stop retrying
                // silently and prompt the user to log in again.
                if (e && e.status === 401) {
                    handleSessionExpired();
                    return;
                }
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

        forceOpRef.current = true;
        try {
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
        } catch (e) {
            if (e && e.status === 401) handleSessionExpired();
            throw e;
        } finally {
            forceOpRef.current = false;
        }
    };

    // Force pull: replace the local copy with the cloud copy. Unlike the background pass this
    // mirrors the cloud exactly: every synced key is overwritten, keys the cloud does not have
    // are cleared, and it runs even when the cloud is empty.
    const forcePull = async () => {
        if (!authToken) throw new Error('You must be logged in to sync.');
        if (!navigator.onLine) throw new Error('You must be online to sync.');

        forceOpRef.current = true;
        try {
            const result = await pullAll(authToken);
            const data = (result && result.data) || {};
            const now = Date.now();
            const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');

            SYNC_KEYS.forEach(key => {
                const entry = data[key];
                const hasEntry = entry && entry.content != null;

                // Don't wipe settings if the cloud has none — that would strip the UI back to
                // defaults. Text areas are safe to clear to empty.
                if (key === 'leatherbound-settings') {
                    if (!hasEntry) return;
                    localStorage.setItem(key, entry.content);
                    timestamps[key] = entry.timestamp != null ? entry.timestamp : now;
                    try {
                        const parsed = JSON.parse(entry.content);
                        settingsRef.current = JSON.stringify(parsed);
                        setSettings(parsed);
                    } catch (e) {
                        console.error("Failed to parse pulled settings", e);
                    }
                    return;
                }

                const content = hasEntry ? entry.content : '';
                localStorage.setItem(key, content);
                timestamps[key] = hasEntry && entry.timestamp != null ? entry.timestamp : now;

                const area = document.getElementById(key + "-area");
                if (area) {
                    area.innerHTML = content;
                }
            });

            localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
            localStorage.setItem('last_sync', now.toString());
        } catch (e) {
            if (e && e.status === 401) handleSessionExpired();
            throw e;
        } finally {
            forceOpRef.current = false;
        }
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
                        onClick={() => openSettings()}
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
            <App settings={settings} openSettings={() => openSettings()} />
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
                authNotice={authNotice}
                openToTab={settingsOpenToTab}
            />
            {sessionExpiredOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div style={{
                        background: 'var(--paper-color)', color: 'var(--text-color)',
                        border: '1px solid rgba(128,128,128,0.4)', borderRadius: '8px',
                        padding: '24px', maxWidth: '420px', width: 'calc(100% - 48px)',
                        fontFamily: 'var(--body-font)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                    }}>
                        <h2 style={{marginTop: 0, fontFamily: 'var(--header-font)', fontSize: '28px'}}>
                            Session expired
                        </h2>
                        <p style={{fontSize: '16px', lineHeight: 1.5}}>
                            Your login session expired, so your notes, schedule, and settings have
                            stopped syncing to the cloud. You can keep using Leatherbound on this
                            device and log back in whenever you like.
                        </p>
                        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                            <button
                                onClick={() => setSessionExpiredOpen(false)}
                                style={{
                                    padding: '8px 16px', cursor: 'pointer',
                                    background: 'transparent', border: '1px solid rgba(128,128,128,0.5)',
                                    color: 'var(--text-color)', borderRadius: '4px',
                                    fontFamily: 'var(--body-font)', fontSize: '16px'
                                }}
                            >
                                Continue offline
                            </button>
                            <button
                                onClick={() => { setSessionExpiredOpen(false); openSettings('data'); }}
                                style={{
                                    padding: '8px 16px', cursor: 'pointer',
                                    background: 'var(--paper-color)', border: '1px solid var(--text-color)',
                                    color: 'var(--text-color)', borderRadius: '4px',
                                    fontFamily: 'var(--body-font)', fontSize: '16px', fontWeight: 'bold'
                                }}
                            >
                                Log in
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </React.StrictMode>
    );
}

/* React updater */
ReactDOM.render(
  <Root initialSettings={initialSettings} hadSavedSettings={Boolean(parsedSettings)} />,
  document.getElementById('root'),
  function() {
    // Flush edits to localStorage as the user types/pastes and when the page is being
    // hidden or closed. Note: 'unload' is blocked by Chrome's permissions policy, so use
    // 'pagehide' and 'visibilitychange' (hidden) instead to persist on leave.
    window.addEventListener('keydown', saveAreas);
    window.addEventListener('paste', saveAreas);
    window.addEventListener('pagehide', saveAreas);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') saveAreas();
    });
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
