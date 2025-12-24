import React, { Component } from 'react';

const iconGroups = {
    "Default": ['gmail', 'google-drive', 'google-calendar', 'fox', 'spotify', 'github--v1', 'blackboard-app', 'canvas-student'],
    "Productivity & Tools": ['dropbox', 'chatgpt', 'adobe-photoshop', 'adobe-illustrator', 'adobe-acrobat', 'trello', 'slack', 'zoom', 'edit', 'task', 'pencil', 'calculator', 'google-docs', 'google-sheets', 'google-slides', 'google-translate', 'settings'],
    "Social": ['instagram-new', 'twitter', 'facebook-new', 'linkedin', 'discord-logo', 'reddit', 'whatsapp', 'youtube-play', 'twitch', 'imessage', 'apple-facetime', 'google-meet', 'google-classroom'],
    "Entertainment": ['netflix', 'hulu', 'amazon', 'steam', 'xbox', 'apple-music', 'google-play', 'google-photos-new'],
    "Browsers": ['chrome', 'safari', 'brave-web-browser', 'ms-edge-new', 'firefox', 'opera-gx'],
    "Weather": ['sun--v1', 'bright-moon', 'partly-cloudy-day--v1', 'partly-cloudy-night', 'cloud', 'rain', 'storm--v1', 'snow-storm', 'foggy-night-1'],
    "OS & Devices": ['mac-logo', 'android-os', 'windows8', 'apple-mail', 'apple-settings--v2']
};

export default class SettingsModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'general',
            tempSettings: { ...props.settings }
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.settings !== this.props.settings) {
            this.setState({ tempSettings: { ...this.props.settings } });
        }
    }

    handleSave = () => {
        this.props.onSave(this.state.tempSettings);
        this.props.onClose();
    };

    updateSetting = (key, value) => {
        this.setState(prevState => ({
            tempSettings: {
                ...prevState.tempSettings,
                [key]: value
            }
        }));
    };

    updateLink = (index, field, value) => {
        const newLinks = [...this.state.tempSettings.quickLinks];
        newLinks[index] = { ...newLinks[index], [field]: value };
        this.updateSetting('quickLinks', newLinks);
    };

    renderGeneral() {
        const { tempSettings } = this.state;
        return (
            <div className="settings-tab-content">
                <div className="setting-row">
                    <label>Theme</label>
                    <select
                        value={tempSettings.theme}
                        onChange={(e) => this.updateSetting('theme', e.target.value)}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>Font</label>
                    <select
                        value={tempSettings.font}
                        onChange={(e) => this.updateSetting('font', e.target.value)}
                    >
                        <option value="Simplicity">Simplicity</option>
                        <option value="VarelaRound">Varela Round</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>Weather Location (City Name or ID)</label>
                    <input
                        type="text"
                        value={tempSettings.weatherLocation}
                        onChange={(e) => this.updateSetting('weatherLocation', e.target.value)}
                    />
                </div>
            </div>
        );
    }

    renderLinks() {
        const { tempSettings } = this.state;
        return (
            <div className="settings-tab-content" style={{maxHeight: '400px', overflowY: 'auto'}}>
                {tempSettings.quickLinks.map((link, index) => (
                    <div key={index} className="link-edit-row" style={{marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px'}}>
                        <h4>Link {index + 1}</h4>
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
                            <select
                                value={link.icon}
                                onChange={(e) => this.updateLink(index, 'icon', e.target.value)}
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
                                style={{width: '30px', marginLeft: '10px', verticalAlign: 'middle'}}
                                alt="preview"
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    render() {
        if (!this.props.isOpen) return null;

        return (
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
                <div className="modal-content" style={{
                    backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                    width: '500px', maxWidth: '90%', maxHeight: '90vh', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    color: 'black'
                }}>
                    <h2>Settings</h2>
                    <div className="modal-tabs" style={{marginBottom: '10px', borderBottom: '1px solid #ddd'}}>
                        <button
                            style={{marginRight: '10px', padding: '5px 10px', cursor: 'pointer', fontWeight: this.state.activeTab === 'general' ? 'bold' : 'normal'}}
                            onClick={() => this.setState({activeTab: 'general'})}
                        >
                            General
                        </button>
                        <button
                            style={{padding: '5px 10px', cursor: 'pointer', fontWeight: this.state.activeTab === 'links' ? 'bold' : 'normal'}}
                            onClick={() => this.setState({activeTab: 'links'})}
                        >
                            Quick Links
                        </button>
                    </div>

                    <div style={{flex: 1, overflowY: 'auto'}}>
                        {this.state.activeTab === 'general' ? this.renderGeneral() : this.renderLinks()}
                    </div>

                    <div className="modal-actions" style={{marginTop: '20px', textAlign: 'right'}}>
                        <button onClick={this.props.onClose} style={{marginRight: '10px'}}>Cancel</button>
                        <button onClick={this.handleSave}>Save</button>
                    </div>
                </div>
            </div>
        );
    }
}
