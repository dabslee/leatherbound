import React, { Component } from 'react';

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
            activeTab: 'general'
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
                    <label>Font</label>
                    <select
                        value={settings.font}
                        onChange={(e) => this.updateSetting('font', e.target.value)}
                    >
                        <option value="Simplicity" style={{fontFamily: 'Simplicity'}}>Simplicity</option>
                        <option value="VarelaRound" style={{fontFamily: 'VarelaRound'}}>Varela Round</option>
                        <option value="Arial" style={{fontFamily: 'Arial'}}>Arial</option>
                        <option value="Times New Roman" style={{fontFamily: 'Times New Roman'}}>Times New Roman</option>
                        <option value="Courier New" style={{fontFamily: 'Courier New'}}>Courier New</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>Weather Location (City Name or ID)</label>
                    <input
                        type="text"
                        value={settings.weatherLocation}
                        onChange={(e) => this.updateSetting('weatherLocation', e.target.value)}
                    />
                </div>
            </div>
        );
    }

    renderLinks() {
        const { settings } = this.props;
        return (
            <div className="settings-tab-content">
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
                    </div>

                    {this.state.activeTab === 'general' ? this.renderGeneral() : this.renderLinks()}
                </div>
            </div>
        );
    }
}
