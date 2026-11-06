import React, { Component } from 'react';
import { listApiTokens, createApiToken, revokeApiToken, API_BASE_URL } from './api';

const EXPIRY_OPTIONS = [['', 'Never expires'], ['365', '1 year'], ['90', '90 days'], ['30', '30 days']];
const ACCESS_OPTIONS = [['rw', 'Read & write'], ['r', 'Read only']];

const buttonStyle = {
    padding: '6px 12px',
    cursor: 'pointer',
    background: 'var(--paper-color)',
    border: '1px solid var(--text-color)',
    color: 'var(--text-color)',
    borderRadius: '4px',
    fontFamily: 'var(--body-font)',
    fontSize: '15px'
};

const fieldStyle = {
    padding: '5px 8px',
    border: '1px solid rgba(128,128,128,0.5)',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--text-color)',
    fontFamily: 'var(--body-font)',
    fontSize: '15px'
};

function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

// Personal API tokens let an AI agent or script read and write mood logs without the
// 30-day login session; they last until they expire (optional) or are revoked.
export default class ApiTokens extends Component {
    state = { tokens: null, name: '', access: 'rw', expiry: '', busy: false, error: '', created: null, copied: false };

    componentDidMount() {
        this.load();
    }

    session() {
        return localStorage.getItem('auth_token');
    }

    handleError(e) {
        this.setState({
            busy: false,
            error: e && e.status === 401 ? 'Your login session expired. Log in again to manage API tokens.' : (e.message || 'Something went wrong.')
        });
    }

    load = async () => {
        try {
            const tokens = await listApiTokens(this.session());
            this.setState({ tokens, error: '' });
        } catch (e) {
            this.handleError(e);
        }
    };

    create = async (e) => {
        e.preventDefault();
        const name = this.state.name.trim();
        if (!name) {
            this.setState({ error: 'Give the token a name, e.g. "My assistant".' });
            return;
        }
        this.setState({ busy: true, error: '', created: null, copied: false });
        try {
            const created = await createApiToken(this.session(), {
                name,
                scopes: this.state.access === 'rw' ? ['mood:read', 'mood:write'] : ['mood:read'],
                expiresInDays: this.state.expiry ? Number(this.state.expiry) : null
            });
            this.setState({ busy: false, created, name: '' });
            this.load();
        } catch (err) {
            this.handleError(err);
        }
    };

    revoke = async (t) => {
        if (!window.confirm(`Revoke "${t.name}"? Anything using it will lose access immediately.`)) return;
        try {
            await revokeApiToken(this.session(), t.id);
            this.setState(s => ({ created: s.created && s.created.id === t.id ? null : s.created }));
            this.load();
        } catch (e) {
            this.handleError(e);
        }
    };

    copy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.state.created.token).then(() => this.setState({ copied: true }));
        }
    };

    render() {
        const { tokens, name, access, expiry, busy, error, created, copied } = this.state;
        return (
            <div>
                <h3 style={{marginTop: '0.2rem', fontFamily: 'var(--header-font)', fontSize: '0.24rem'}}>API Access</h3>
                <p style={{fontSize: '0.16rem', marginBottom: '0.1rem', fontWeight: 'normal'}}>
                    Create a token to let an AI agent or script read and log your moods through
                    the API at <code>{API_BASE_URL}/api/v1/mood</code>. Tokens don't need refreshing; they work
                    until they expire or you revoke them.
                </p>

                <form onSubmit={this.create} style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px'}}>
                    <input type="text" placeholder="Token name, e.g. My assistant" value={name} maxLength={80}
                        onChange={(e) => this.setState({ name: e.target.value })} style={{...fieldStyle, flex: '1 1 180px'}} />
                    <select value={access} onChange={(e) => this.setState({ access: e.target.value })} style={fieldStyle} aria-label="Access">
                        {ACCESS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <select value={expiry} onChange={(e) => this.setState({ expiry: e.target.value })} style={fieldStyle} aria-label="Expiry">
                        {EXPIRY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button type="submit" disabled={busy} style={{...buttonStyle, opacity: busy ? 0.6 : 1}}>Create token</button>
                </form>

                {error && <p style={{color: 'red', fontSize: '0.15rem', marginBottom: '8px'}}>{error}</p>}

                {created && (
                    <div style={{padding: '10px', border: '1px solid green', borderRadius: '6px', marginBottom: '12px', fontSize: '0.15rem'}}>
                        <p style={{margin: '0 0 6px'}}>
                            <b>Copy your token now.</b> For security it won't be shown again.
                        </p>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            <code style={{flex: 1, wordBreak: 'break-all', fontSize: '13px', padding: '6px', background: 'rgba(128,128,128,0.15)', borderRadius: '4px'}}>
                                {created.token}
                            </code>
                            <button type="button" onClick={this.copy} style={buttonStyle}>{copied ? 'Copied' : 'Copy'}</button>
                        </div>
                        <p style={{margin: '6px 0 0', fontWeight: 'normal', opacity: 0.8}}>
                            Send it as <code>Authorization: Bearer &lt;token&gt;</code>. See <code>backend/API.md</code> for the endpoints.
                        </p>
                    </div>
                )}

                {tokens && tokens.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                        {tokens.map(t => (
                            <div key={t.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(128,128,128,0.2)', fontSize: '0.15rem'}}>
                                <div style={{flex: 1, minWidth: 0}}>
                                    <div><b>{t.name}</b> <code style={{opacity: 0.7, fontSize: '12px'}}>{t.prefix}…</code></div>
                                    <div style={{fontWeight: 'normal', opacity: 0.7, fontSize: '0.13rem'}}>
                                        {t.scopes.includes('mood:write') ? 'Read & write' : 'Read only'}
                                        {' · '}created {formatDate(t.created_at)}
                                        {' · '}{t.last_used_at ? `last used ${formatDate(t.last_used_at)}` : 'never used'}
                                        {' · '}{t.expires_at ? `expires ${formatDate(t.expires_at)}` : 'no expiry'}
                                    </div>
                                </div>
                                <button type="button" onClick={() => this.revoke(t)} style={{...buttonStyle, color: '#b02a2a', borderColor: '#b02a2a'}}>Revoke</button>
                            </div>
                        ))}
                    </div>
                )}
                {tokens && tokens.length === 0 && !created && (
                    <p style={{fontSize: '0.15rem', opacity: 0.7, fontWeight: 'normal'}}>No API tokens yet.</p>
                )}
            </div>
        );
    }
}
