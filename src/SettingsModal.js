import React, { Component } from 'react';
import { apiKey } from './App';

const iconGroups = {
    "Default": ['gmail', 'google-drive', 'google-calendar', 'fox', 'spotify', 'github--v1', 'blackboard-app', 'canvas-student'],
    "Productivity & Tools": ['dropbox', 'chatgpt', 'adobe-photoshop', 'adobe-illustrator', 'adobe-acrobat', 'trello', 'slack', 'zoom', 'edit', 'task', 'pencil', 'calculator', 'google-docs', 'google-sheets', 'google-slides', 'google-translate', 'settings'],
    "Social": ['instagram-new', 'twitter', 'facebook-new', 'linkedin', 'discord-logo', 'reddit', 'whatsapp', 'youtube-play', 'twitch', 'imessage', 'apple-facetime', 'google-meet', 'google-classroom'],
    "Entertainment": ['netflix', 'hulu', 'amazon', 'steam', 'xbox', 'apple-music', 'google-play', 'google-photos-new'],
    "Browsers": ['chrome', 'safari', 'brave-web-browser', 'ms-edge-new', 'firefox', 'opera-gx'],
    "Weather": ['sun--v1', 'bright-moon', 'partly-cloudy-day--v1', 'partly-cloudy-night', 'cloud', 'rain', 'storm--v1', 'snow-storm', 'foggy-night-1'],
    "OS & Devices": ['mac-logo', 'android-os', 'windows8', 'apple-mail', 'apple-settings--v2'],
    "Misc": ['plus-math']
};

export default class SettingsModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'general',
            weatherStatus: null, // null, 'validating', 'valid', 'invalid'
            weatherError: ''
        };
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            this.props.onClose();
        }
    };

    updateSetting = (key, value) => {
        const newSettings = {
            ...this.props.settings,
            [key]: value
        };
        this.props.onSave(newSettings);
    };

    updateLink = (index, field, value) => {
        const newLinks = [...this.props.settings.quickLinks];
        newLinks[index] = { ...newLinks[index], [field]: value };
        this.updateSetting('quickLinks', newLinks);
    };

    clearLink = (index) => {
        const newLinks = [...this.props.settings.quickLinks];
        newLinks[index] = { title: '', url: '', icon: 'plus-math' };
        this.updateSetting('quickLinks', newLinks);
    };

    validateWeather = (location) => {
        if (!location) return;

        this.setState({ weatherStatus: 'validating', weatherError: '' });

        let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}`;

        if (/^\d+$/.test(location)) {
            weatherUrl += `&id=${location}`;
        } else {
            const query = location.replaceAll(' ', '').replaceAll(',US', '') + ",US";
            weatherUrl += `&q=${query}`;
        }

        fetch(weatherUrl)
            .then(resp => {
                if (!resp.ok) {
                    throw new Error('City not found');
                }
                this.setState({ weatherStatus: 'valid' });
            })
            .catch(e => {
                this.setState({ weatherStatus: 'invalid', weatherError: 'Location not found' });
            });
    };

    exportData = () => {
        // Collect all data from localStorage
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leatherbound-data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const confirmImport = window.confirm("This will overwrite your current settings and data. Are you sure?");
        if (!confirmImport) {
            event.target.value = null; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (typeof data === 'object' && data !== null) {
                    // Remove the onunload listener to prevent overwriting
                    window.onunload = null;

                    // Clear current localStorage and import new data
                    localStorage.clear();
                    Object.entries(data).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });
                    alert('Data imported successfully. The page will now reload.');
                    window.location.reload();
                } else {
                    alert('Invalid file format');
                }
            } catch (err) {
                alert('Error parsing file');
            }
        };
        reader.readAsText(file);
    };

    renderGeneral() {
        const { settings } = this.props;
        return (
            <div className="settings-tab-content">
                <div className="setting-row">
                    <label>Theme</label>
                    <select
                        value={settings.theme}
                        onChange={(e) => this.updateSetting('theme', e.target.value)}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>Body Font & Size</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <select
                            value={settings.font}
                            onChange={(e) => this.updateSetting('font', e.target.value)}
                            style={{flex: 2}}
                        >
                            <option value="Simplicity" style={{fontFamily: 'Simplicity'}}>Simplicity</option>
                            <option value="VarelaRound" style={{fontFamily: 'VarelaRound'}}>Varela Round</option>
                            <option value="Arial" style={{fontFamily: 'Arial'}}>Arial</option>
                            <option value="Times New Roman" style={{fontFamily: 'Times New Roman'}}>Times New Roman</option>
                            <option value="Courier New" style={{fontFamily: 'Courier New'}}>Courier New</option>
                        </select>
                        <select
                            value={settings.bodyFontSize || 16}
                            onChange={(e) => this.updateSetting('bodyFontSize', parseInt(e.target.value))}
                            style={{flex: 1}}
                        >
                            <option value="12">12px</option>
                            <option value="14">14px</option>
                            <option value="16">16px</option>
                            <option value="18">18px</option>
                            <option value="20">20px</option>
                            <option value="24">24px</option>
                        </select>
                    </div>
                </div>
                <div className="setting-row">
                    <label>Header Font & Size</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <select
                            value={settings.headerFont || 'DearSunshine'}
                            onChange={(e) => this.updateSetting('headerFont', e.target.value)}
                            style={{flex: 2}}
                        >
                            <option value="DearSunshine" style={{fontFamily: 'DearSunshine'}}>Dear Sunshine</option>
                            <option value="AutumnInNovember" style={{fontFamily: 'AutumnInNovember'}}>Autumn In November</option>
                            <option value="Simplicity" style={{fontFamily: 'Simplicity'}}>Simplicity</option>
                            <option value="VarelaRound" style={{fontFamily: 'VarelaRound'}}>Varela Round</option>
                            <option value="Arial" style={{fontFamily: 'Arial'}}>Arial</option>
                            <option value="Times New Roman" style={{fontFamily: 'Times New Roman'}}>Times New Roman</option>
                            <option value="Courier New" style={{fontFamily: 'Courier New'}}>Courier New</option>
                        </select>
                        <select
                            value={settings.headerFontSize || 40}
                            onChange={(e) => this.updateSetting('headerFontSize', parseInt(e.target.value))}
                            style={{flex: 1}}
                        >
                            <option value="20">20px</option>
                            <option value="24">24px</option>
                            <option value="30">30px</option>
                            <option value="36">36px</option>
                            <option value="40">40px</option>
                            <option value="48">48px</option>
                            <option value="60">60px</option>
                            <option value="72">72px</option>
                        </select>
                    </div>
                </div>
                <div className="setting-row">
                    <label>Weather Location (City Name or ID)</label>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                        <input
                            type="text"
                            value={settings.weatherLocation}
                            onChange={(e) => {
                                this.updateSetting('weatherLocation', e.target.value);
                                this.setState({ weatherStatus: null, weatherError: '' });
                            }}
                            onBlur={(e) => this.validateWeather(e.target.value)}
                            style={{
                                borderColor: this.state.weatherStatus === 'invalid' ? 'red' :
                                            this.state.weatherStatus === 'valid' ? 'green' : '#ccc'
                            }}
                        />
                        {this.state.weatherStatus === 'validating' && <span style={{fontSize: '0.8rem', color: 'gray'}}>Validating...</span>}
                        {this.state.weatherStatus === 'invalid' && <span style={{fontSize: '0.8rem', color: 'red'}}>{this.state.weatherError}</span>}
                    </div>
                </div>

                <hr style={{margin: '20px 0', border: '0', borderTop: '1px solid var(--text-color)', opacity: 0.3}} />
                <h3>Section Names</h3>

                <div className="setting-row">
                    <label>To Do Section</label>
                    <input
                        type="text"
                        value={settings.todoName || ''}
                        onChange={(e) => this.updateSetting('todoName', e.target.value)}
                        placeholder="To do"
                    />
                </div>
                <div className="setting-row">
                    <label>Schedule Section</label>
                    <input
                        type="text"
                        value={settings.scheduleName || ''}
                        onChange={(e) => this.updateSetting('scheduleName', e.target.value)}
                        placeholder="Schedule"
                    />
                </div>
                <div className="setting-row">
                    <label>Notes Section</label>
                    <input
                        type="text"
                        value={settings.notesName || ''}
                        onChange={(e) => this.updateSetting('notesName', e.target.value)}
                        placeholder="Notes"
                    />
                </div>
            </div>
        );
    }

    renderLinks() {
        const { settings } = this.props;
        return (
            <div className="settings-tab-content">
                {/* <div style={{marginBottom: '0.2rem', display: 'flex', gap: '0.1rem'}}>
                    <button
                        onClick={this.exportLinks}
                        style={{
                            padding: '0.08rem 0.12rem',
                            cursor: 'pointer',
                            background: 'var(--paper-color)',
                            border: '0.01rem solid var(--text-color)',
                            color: 'var(--text-color)',
                            borderRadius: '0.04rem',
                            fontFamily: 'var(--body-font)',
                            fontSize: '0.16rem'
                        }}
                    >
                        Export Links
                    </button>
                    <label
                        style={{
                            padding: '0.08rem 0.12rem',
                            cursor: 'pointer',
                            background: 'var(--paper-color)',
                            border: '0.01rem solid var(--text-color)',
                            color: 'var(--text-color)',
                            borderRadius: '0.04rem',
                            fontFamily: 'var(--body-font)',
                            fontSize: '0.16rem',
                            display: 'inline-block'
                        }}
                    >
                        Import Links
                        <input type="file" style={{display: 'none'}} accept=".json,.txt" onChange={this.importLinks} />
                    </label>
                </div> */}
                {settings.quickLinks.map((link, index) => (
                    <div key={index} className="link-edit-row">
                        <div className="link-header">
                            <h4>Link {index + 1}</h4>
                            <button className="clear-link-btn" onClick={() => this.clearLink(index)}>
                                Clear
                            </button>
                        </div>
                        <div className="setting-row">
                            <label>Title</label>
                            <input
                                type="text"
                                value={link.title}
                                onChange={(e) => this.updateLink(index, 'title', e.target.value)}
                            />
                        </div>
                        <div className="setting-row">
                            <label>URL</label>
                            <input
                                type="text"
                                value={link.url}
                                onChange={(e) => this.updateLink(index, 'url', e.target.value)}
                            />
                        </div>
                        <div className="setting-row">
                            <label>Icon</label>
                            <div className="icon-select-container">
                                <select
                                    value={link.icon}
                                    onChange={(e) => this.updateLink(index, 'icon', e.target.value)}
                                    style={{flex: 1}}
                                >
                                    {Object.entries(iconGroups).map(([groupName, icons]) => (
                                        <optgroup key={groupName} label={groupName}>
                                            {icons.map(icon => (
                                                <option key={icon} value={icon}>{icon}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <img
                                    src={`https://img.icons8.com/plasticine/400/000000/${link.icon}.png`}
                                    className="icon-preview"
                                    alt="preview"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    renderData() {
        return (
            <div className="settings-tab-content">
                <p>Export or Import your entire Leatherbound configuration (Settings, Quick Links, Notes, etc).</p>
                <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                    <button
                        onClick={this.exportData}
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: 'var(--paper-color)',
                            border: '1px solid var(--text-color)',
                            color: 'var(--text-color)',
                            borderRadius: '4px',
                            fontFamily: 'var(--body-font)',
                            fontSize: '16px'
                        }}
                    >
                        Export Data
                    </button>
                    <label
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: 'var(--paper-color)',
                            border: '1px solid var(--text-color)',
                            color: 'var(--text-color)',
                            borderRadius: '4px',
                            fontFamily: 'var(--body-font)',
                            fontSize: '16px',
                            display: 'inline-block'
                        }}
                    >
                        Import Data
                        <input type="file" style={{display: 'none'}} accept=".json,.txt" onChange={this.importData} />
                    </label>
                </div>
            </div>
        );
    }

    render() {
        if (!this.props.isOpen) return null;

        return (
            <div className="settings-modal-overlay" onClick={this.props.onClose}>
                <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="settings-modal-header">
                        <h2>Settings</h2>
                        <button className="settings-close-btn" onClick={this.props.onClose}>
                            &#10005;
                        </button>
                    </div>

                    <div className="modal-tabs">
                        <button
                            className={`tab-btn ${this.state.activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => this.setState({activeTab: 'general'})}
                        >
                            General
                        </button>
                        <button
                            className={`tab-btn ${this.state.activeTab === 'links' ? 'active' : ''}`}
                            onClick={() => this.setState({activeTab: 'links'})}
                        >
                            Quick Links
                        </button>
                        <button
                            className={`tab-btn ${this.state.activeTab === 'data' ? 'active' : ''}`}
                            onClick={() => this.setState({activeTab: 'data'})}
                        >
                            Data
                        </button>
                    </div>

                    {this.state.activeTab === 'general' && this.renderGeneral()}
                    {this.state.activeTab === 'links' && this.renderLinks()}
                    {this.state.activeTab === 'data' && this.renderData()}
                </div>
            </div>
        );
    }
}
