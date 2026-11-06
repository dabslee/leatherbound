import React, { Component, useState, useRef, useEffect } from 'react';
import './css/mood.css';
import {
    METRICS, EMOTIONS, EMOTION_BY_ID, NOTE_WORD_LIMIT, MOOD_EVENT, MOOD_KEY,
    loadLogs, saveLogs, upsertLog, newId, countWords,
    dateKey, parseDateKey, toDateTimeLocal, addDays,
    periodRange, shiftAnchor, periodTitle, historicalBuckets, cycleBuckets,
    logsInRange, summarize, emotionStats, currentStreak, dailyValues, MONTHS
} from './moodUtils';

const SERIES = [
    { id: 'happiness', label: 'Happiness' },
    { id: 'contentment', label: 'Contentment' },
    { id: 'energy', label: 'Energy' }
];

const fmt = (v) => (v == null ? '–' : v.toFixed(1));

// Same query as the phone layout in main.css and mood.css.
const MOBILE_QUERY = '(max-width: 768px), (max-height: 500px) and (max-width: 1000px)';

/* ======================================================================
   Logging form
   ====================================================================== */

function ScaleInput({ metric, value, onChange, kind }) {
    return (
        <fieldset className="mood-field">
            <legend>
                {metric.label}{metric.required ? <span className="mood-req"> *</span> : <span className="mood-opt"> (optional)</span>}
            </legend>
            <div className="mood-prompt">{metric.prompt[kind]}</div>
            <div className="mood-scale" role="radiogroup" aria-label={metric.label}>
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        className={`mood-scale-btn ${value === n ? 'selected' : ''}`}
                        onClick={() => onChange(value === n && !metric.required ? null : n)}
                    >
                        {n}
                    </button>
                ))}
            </div>
            <div className="mood-scale-anchors"><span>{metric.low}</span><span>{metric.high}</span></div>
        </fieldset>
    );
}

// Position on the circumplex as a percentage of the square container.
// R is the rim radius (as % of the container); inner words sit at 62% of the rim.
const RIM = 38;
function circlePos(emotion, rimPct = RIM) {
    const r = emotion.core ? rimPct : rimPct * 0.62;
    const rad = emotion.angle * Math.PI / 180;
    return { left: 50 + r * Math.cos(rad), top: 50 - r * Math.sin(rad) };
}

function EmotionChecklist({ selected, onToggle }) {
    return (
        <div className="mood-checklist" role="group" aria-label="Emotions">
            {EMOTIONS.filter(e => !e.core).map(e => (
                <label key={e.id} className="mood-check">
                    <input
                        type="checkbox"
                        checked={selected.includes(e.id)}
                        onChange={() => onToggle(e.id)}
                    />
                    <span className="mood-check-label">{e.label}</span>
                </label>
            ))}
        </div>
    );
}

class MoodLogForm extends Component {
    constructor(props) {
        super(props);
        const l = props.editing;
        const now = Date.now();
        this.state = l ? {
            kind: l.kind,
            date: l.date,
            datetime: toDateTimeLocal(l.kind === 'moment' ? l.ts : now),
            happiness: l.happiness,
            contentment: l.contentment,
            energy: l.energy == null ? null : l.energy,
            emotions: l.emotions || [],
            note: l.note || '',
            error: ''
        } : {
            kind: props.initialKind || 'moment',
            date: dateKey(new Date()),
            datetime: toDateTimeLocal(now),
            happiness: null,
            contentment: null,
            energy: null,
            emotions: [],
            note: '',
            error: ''
        };
    }

    componentDidMount() {
        // Opening "whole day" for a date that already has one should edit it, not duplicate it.
        if (!this.props.editing && this.state.kind === 'day') this.checkExistingDay(this.state.date);
    }

    checkExistingDay(date) {
        const existing = this.props.logs.find(l => l.kind === 'day' && l.date === date);
        if (existing) this.props.onEdit(existing);
    }

    setKind = (kind) => {
        if (this.props.editing) return;
        this.setState({ kind, error: '' });
        if (kind === 'day') this.checkExistingDay(this.state.date);
    };

    setDate = (date) => {
        this.setState({ date });
        if (!date) return;
        const existing = this.props.logs.find(l => l.kind === 'day' && l.date === date);
        if (existing && (!this.props.editing || existing.id !== this.props.editing.id)) {
            this.props.onEdit(existing);
        }
    };

    toggleEmotion = (id) => {
        this.setState(s => ({
            emotions: s.emotions.includes(id) ? s.emotions.filter(e => e !== id) : [...s.emotions, id]
        }));
    };

    handleSubmit = (e) => {
        e.preventDefault();
        const s = this.state;
        if (!s.happiness || !s.contentment) {
            this.setState({ error: 'Happiness and contentment are required.' });
            return;
        }
        if (countWords(s.note) > NOTE_WORD_LIMIT) {
            this.setState({ error: `Notes are limited to ${NOTE_WORD_LIMIT} words.` });
            return;
        }
        let ts, date;
        if (s.kind === 'moment') {
            const parsed = new Date(s.datetime);
            if (!s.datetime || isNaN(parsed.getTime())) {
                this.setState({ error: 'Please choose a valid time.' });
                return;
            }
            ts = parsed.getTime();
            date = dateKey(parsed);
        } else {
            if (!s.date) { this.setState({ error: 'Please choose a date.' }); return; }
            date = s.date;
            ts = parseDateKey(date).getTime() + 12 * 3600 * 1000;
        }
        const prev = this.props.editing;
        const now = Date.now();
        const log = {
            id: prev ? prev.id : newId(),
            kind: s.kind,
            date,
            ts,
            happiness: s.happiness,
            contentment: s.contentment,
            energy: s.energy || null,
            emotions: s.emotions,
            note: s.note.trim(),
            createdAt: prev ? prev.createdAt : now,
            updatedAt: now
        };
        this.props.onSave(log);
    };

    render() {
        const s = this.state;
        const { editing } = this.props;
        const words = countWords(s.note);
        const over = words > NOTE_WORD_LIMIT;

        return (
            <form className="mood-form" onSubmit={this.handleSubmit}>
                <div className="mood-form-top">
                    <div className="mood-seg mood-kind" role="tablist">
                        <button type="button" role="tab" aria-selected={s.kind === 'moment'}
                            className={s.kind === 'moment' ? 'active' : ''} disabled={!!editing && s.kind !== 'moment'}
                            onClick={() => this.setKind('moment')}>Right now</button>
                        <button type="button" role="tab" aria-selected={s.kind === 'day'}
                            className={s.kind === 'day' ? 'active' : ''} disabled={!!editing && s.kind !== 'day'}
                            onClick={() => this.setKind('day')}>Whole day</button>
                    </div>
                    <label className="mood-when">
                        {s.kind === 'moment' ? 'Time' : 'Day'}
                        {s.kind === 'moment' ? (
                            <input type="datetime-local" value={s.datetime} onChange={(e) => this.setState({ datetime: e.target.value })} />
                        ) : (
                            <input type="date" value={s.date} onChange={(e) => this.setDate(e.target.value)} />
                        )}
                    </label>
                </div>

                <div className="mood-form-cols">
                    <div className="mood-form-col">
                        <ScaleInput metric={METRICS[0]} kind={s.kind} value={s.happiness} onChange={(v) => this.setState({ happiness: v, error: '' })} />
                        <ScaleInput metric={METRICS[1]} kind={s.kind} value={s.contentment} onChange={(v) => this.setState({ contentment: v, error: '' })} />
                        <ScaleInput metric={METRICS[2]} kind={s.kind} value={s.energy} onChange={(v) => this.setState({ energy: v })} />
                        <fieldset className="mood-field">
                            <legend>Note <span className="mood-opt">(optional)</span></legend>
                            <textarea
                                className="mood-note"
                                rows={3}
                                value={s.note}
                                placeholder={s.kind === 'moment' ? "What's going on?" : 'How did today go?'}
                                onChange={(e) => this.setState({ note: e.target.value })}
                            />
                            <div className={`mood-wordcount ${over ? 'over' : ''}`}>{words}/{NOTE_WORD_LIMIT} words</div>
                        </fieldset>
                    </div>
                    <fieldset className="mood-field mood-form-col mood-form-emotions">
                        <legend>Emotions <span className="mood-opt">(optional, pick any)</span></legend>
                        <div className="mood-prompt">{s.kind === 'moment' ? 'What best describes how you feel right now?' : 'What best describes how you felt today?'}</div>
                        <EmotionChecklist selected={s.emotions} onToggle={this.toggleEmotion} />
                    </fieldset>
                </div>

                <div className="mood-form-actions">
                    {s.error && <div className="mood-error" role="alert">{s.error}</div>}
                    {editing && <button type="button" className="mood-btn danger" onClick={() => this.props.onDelete(editing)}>Delete</button>}
                    <button type="button" className="mood-btn" onClick={this.props.onCancel}>Cancel</button>
                    <button type="submit" className="mood-btn primary" disabled={over}>{editing ? 'Update log' : 'Save log'}</button>
                </div>
            </form>
        );
    }
}

/* ======================================================================
   Charts
   ====================================================================== */

// Track an element's rendered size so charts can draw at real pixel dimensions and fill
// whatever space the panel gives them (no distorted text, no page scroll).
function useSize(ref) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
        update();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return size;
}

function LineChart({ buckets, visible, emptyText }) {
    const [hover, setHover] = useState(null);
    const ref = useRef(null);
    const size = useSize(ref);
    const W = Math.max(size.width, 200), H = Math.max(size.height, 120), L = 30, R = 10, T = 12, B = 28;
    const pw = W - L - R, ph = H - T - B;
    const n = buckets.length;
    const x = (i) => L + (i + 0.5) * (pw / n);
    const y = (v) => T + (5 - v) / 4 * ph;
    const step = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(pw / 42))));
    const hasData = buckets.some(b => SERIES.some(s => b[s.id] != null));

    // Solid segments join neighboring buckets; a dashed bridge spans buckets with no logs,
    // so sparse data still reads as a trend without pretending the gap was measured.
    const seriesPaths = SERIES.filter(s => visible[s.id]).map(s => {
        const pts = [];
        buckets.forEach((b, i) => { if (b[s.id] != null) pts.push({ i, x: x(i), y: y(b[s.id]) }); });
        let solid = '', dashed = '';
        for (let k = 1; k < pts.length; k++) {
            const a = pts[k - 1], c = pts[k];
            const seg = `M${a.x},${a.y} L${c.x},${c.y} `;
            if (c.i - a.i === 1) solid += seg; else dashed += seg;
        }
        return { s, pts, solid, dashed };
    });

    const hb = hover != null ? buckets[hover] : null;

    // A tap opens the tooltip but never fires mouseleave, so close it on the next outside touch.
    useEffect(() => {
        const onTouch = (e) => { if (ref.current && !ref.current.contains(e.target)) setHover(null); };
        document.addEventListener('touchstart', onTouch, { passive: true });
        return () => document.removeEventListener('touchstart', onTouch);
    }, []);

    return (
        <div className="mood-chart" ref={ref} onMouseLeave={() => setHover(null)}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mood over the selected range">
                {[1, 2, 3, 4, 5].map(v => (
                    <g key={v}>
                        <line className="mood-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
                        <text className="mood-tick" x={L - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">{v}</text>
                    </g>
                ))}
                {buckets.map((b, i) => (i % step === 0 || (step > 1 && i === n - 1 && (n - 1) % step > step / 2)) && (
                    <text key={b.key} className="mood-tick" x={x(i)} y={H - 8} textAnchor="middle">{b.short}</text>
                ))}
                {hb && <line className="mood-crosshair" x1={x(hover)} x2={x(hover)} y1={T} y2={T + ph} />}
                {seriesPaths.map(({ s, pts, solid, dashed }) => (
                    <g key={s.id} className={`mood-series-${s.id}`}>
                        {dashed && <path className="mood-line bridge" d={dashed} />}
                        {solid && <path className="mood-line" d={solid} />}
                        {pts.map(pt => (
                            <circle key={pt.i} className="mood-dot" cx={pt.x} cy={pt.y} r={hover === pt.i ? 6 : 4} />
                        ))}
                    </g>
                ))}
                {buckets.map((b, i) => (
                    <rect key={b.key} className="mood-hit" x={L + i * pw / n} y={T} width={pw / n} height={ph}
                        onMouseEnter={() => setHover(i)} />
                ))}
            </svg>
            {!hasData && <div className="mood-empty-overlay">{emptyText}</div>}
            {hb && (
                <div className={`mood-tooltip ${hover > n / 2 ? 'left' : ''}`} style={{ left: `${x(hover) / W * 100}%` }}>
                    <div className="mood-tooltip-title">{hb.label}</div>
                    {SERIES.filter(s => visible[s.id]).map(s => (
                        <div key={s.id} className="mood-tooltip-row">
                            <span className={`mood-swatch mood-bg-${s.id}`} />{s.label}<b>{fmt(hb[s.id])}</b>
                        </div>
                    ))}
                    <div className="mood-tooltip-foot">
                        {hb.n ? `${hb.n} log${hb.n === 1 ? '' : 's'}${hb.days ? ` over ${hb.days} day${hb.days === 1 ? '' : 's'}` : ''}` : 'No logs'}
                    </div>
                </div>
            )}
        </div>
    );
}

function DataTable({ buckets, firstCol }) {
    const rows = buckets.filter(b => b.n);
    if (rows.length === 0) return <p className="mood-muted mood-center">Nothing logged in this range.</p>;
    return (
        <div className="mood-scroll">
            <table className="mood-table">
                <thead><tr><th>{firstCol}</th>{SERIES.map(s => <th key={s.id}>{s.label}</th>)}<th>Logs</th></tr></thead>
                <tbody>{rows.map(b => (
                    <tr key={b.key}><td>{b.label}</td>{SERIES.map(s => <td key={s.id}>{fmt(b[s.id])}</td>)}<td>{b.n}</td></tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function useMediaQuery(q) {
    const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;
    const [matches, setMatches] = useState(get);
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const mq = window.matchMedia(q);
        const on = () => setMatches(mq.matches);
        on();
        if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
        return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
    }, [q]);
    return matches;
}

function YearHeatmap({ logs, year, source, metric, onPick }) {
    const [hover, setHover] = useState(null);
    const wrapRef = useRef(null);
    const scrollRef = useRef(null);
    const portrait = useMediaQuery('(orientation: portrait)');
    const todayKey = dateKey(new Date());

    // Portrait: the year is a long column, so open on the current week rather than January.
    useEffect(() => {
        if (!portrait || !scrollRef.current) return;
        const el = scrollRef.current;
        const cell = el.querySelector('.mood-cell.today');
        if (cell) el.scrollTop += cell.getBoundingClientRect().top - el.getBoundingClientRect().top - el.clientHeight / 3;
    }, [portrait, year]);

    const start = new Date(year, 0, 1), end = new Date(year, 11, 31);
    const daily = dailyValues(logsInRange(logs, dateKey(start), dateKey(end)), source);
    const gridStart = addDays(start, -((start.getDay() + 6) % 7));
    const C = 13, G = 3, LEFT = 30, TOP = 18;
    const cells = [];
    const monthCols = [];
    for (let d = gridStart, i = 0; d <= end; d = addDays(d, 1), i++) {
        const col = Math.floor(i / 7), row = i % 7;
        if (d < start) continue;
        if (d.getDate() === 1) monthCols.push({ m: d.getMonth(), col });
        const k = dateKey(d);
        const v = daily.get(k);
        cells.push({ k, d, col, row, val: v ? v[metric] : null, n: v ? v.logCount : 0 });
    }
    const cols = Math.max(...cells.map(c => c.col)) + 1;
    // Portrait: transpose so weekdays run across the top and weeks run down the page.
    const cellX = (c) => LEFT + (portrait ? c.row : c.col) * (C + G);
    const cellY = (c) => TOP + (portrait ? c.col : c.row) * (C + G);
    const W = portrait ? LEFT + 7 * (C + G) : LEFT + cols * (C + G);
    const H = portrait ? TOP + cols * (C + G) : TOP + 7 * (C + G);
    const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const label = SERIES.find(s => s.id === metric).label;

    // The SVG scales to fit the panel, so place the tooltip from the hovered cell's real box.
    const enter = (i, e) => {
        const box = wrapRef.current.getBoundingClientRect();
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ i, x: r.left + r.width / 2 - box.left, y: r.bottom - box.top + 4, left: r.left - box.left > box.width / 2 });
    };
    const hc = hover ? cells[hover.i] : null;

    return (
        <div className={`mood-heatmap ${portrait ? 'portrait' : ''}`} ref={scrollRef}>
            <div className="mood-heatmap-inner" ref={wrapRef} onMouseLeave={() => setHover(null)}>
                {/* Portrait: weekday letters live in their own strip so they can stay pinned while the year scrolls. */}
                {portrait && (
                    <svg className="mood-heat-dow" viewBox={`0 0 ${W} ${TOP}`} aria-hidden="true">
                        {DOW.map((t, i) => (
                            <text key={t} className="mood-tick" x={LEFT + i * (C + G) + C / 2} y={11} textAnchor="middle">{t.charAt(0)}</text>
                        ))}
                    </svg>
                )}
                <svg viewBox={portrait ? `0 ${TOP} ${W} ${H - TOP}` : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${label} by day in ${year}`}>
                    {monthCols.map(({ m, col }) => (portrait ? (
                        <text key={m} className="mood-tick" x={LEFT - 6} y={TOP + col * (C + G) + C / 2} textAnchor="end" dominantBaseline="middle">{MONTHS[m]}</text>
                    ) : (
                        <text key={m} className="mood-tick" x={LEFT + col * (C + G)} y={11}>{MONTHS[m]}</text>
                    )))}
                    {!portrait && ['Mon', '', 'Wed', '', 'Fri', '', ''].map((t, r) => t && (
                        <text key={r} className="mood-tick" x={LEFT - 6} y={TOP + r * (C + G) + C / 2} textAnchor="end" dominantBaseline="middle">{t}</text>
                    ))}
                    {cells.map((c, i) => (
                        <rect
                            key={c.k}
                            x={cellX(c)} y={cellY(c)} width={C} height={C} rx={3}
                            className={`mood-cell ${c.val == null ? 'empty' : `lvl-${Math.min(5, Math.max(1, Math.round(c.val)))}`} ${hover && hover.i === i ? 'hover' : ''} ${c.k === todayKey ? 'today' : ''}`}
                            onMouseEnter={(e) => enter(i, e)}
                            onClick={() => onPick(c.d)}
                        />
                    ))}
                </svg>
                {hc && (
                    <div className={`mood-tooltip ${hover.left ? 'left' : ''}`} style={{ left: hover.x, top: hover.y }}>
                        <div className="mood-tooltip-title">{hc.d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="mood-tooltip-row">{label}<b>{fmt(hc.val)}</b></div>
                        <div className="mood-tooltip-foot">{hc.n ? `${hc.n} log${hc.n === 1 ? '' : 's'} · click to open day` : 'No logs'}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HeatLegend() {
    return (
        <div className="mood-heat-legend">
            <span>1</span>
            {[1, 2, 3, 4, 5].map(l => <span key={l} className={`mood-cell-swatch lvl-${l}`} />)}
            <span>5</span>
            <span className="mood-cell-swatch empty" style={{ marginLeft: '0.1rem' }} /><span>no log</span>
        </div>
    );
}

function describeAffect(c) {
    if (!c) return '';
    const mag = Math.hypot(c.valence, c.arousal);
    if (mag < 0.2) return 'Mixed — no strong lean';
    const v = c.valence > 0.15 ? 'pleasant' : c.valence < -0.15 ? 'unpleasant' : '';
    const a = c.arousal > 0.15 ? 'activated' : c.arousal < -0.15 ? 'low-energy' : '';
    return `Leaning ${[v, a].filter(Boolean).join(' & ') || 'neutral'}`;
}

function EmotionSummary({ stats }) {
    const ref = useRef(null);
    const { width, height } = useSize(ref);
    const mobile = useMediaQuery(MOBILE_QUERY);
    if (stats.ranked.length === 0) return <p className="mood-muted mood-center">No emotions tagged in this range.</p>;
    const max = stats.ranked[0].count;
    const R = 38;
    // Keep the circumplex square: as big as the panel allows, leaving room for the bar list.
    // On phones the panel grows with its content, so size from the width alone.
    const stacked = mobile || width < 600;
    const fitted = mobile ? Math.min(width, 400) : stacked ? Math.min(width, height * 0.6) : Math.min(height, width * 0.5);
    const side = Math.max(120, Math.floor(fitted));
    return (
        <div className={`mood-emotions ${stacked ? 'stacked' : ''}`} ref={ref}>
            <div className="mood-emotion-map" style={{ width: side, height: side }}>
                <div className="mood-circle" />
                <div className="mood-axis mood-axis-v" />
                <div className="mood-axis mood-axis-h" />
                <span className="mood-axis-label" style={{ left: '50%', top: '6%' }}>activation</span>
                <span className="mood-axis-label" style={{ left: '50%', top: '94%' }}>deactivation</span>
                <span className="mood-axis-label side" style={{ left: '93%', top: '50%' }}>pleasant</span>
                <span className="mood-axis-label side" style={{ left: '7%', top: '50%' }}>unpleasant</span>
                {stats.ranked.map(e => {
                    const pos = circlePos(e, R);
                    const size = 3 + 8 * Math.sqrt(e.count / max);
                    return (
                        <React.Fragment key={e.id}>
                            <span className="mood-emotion-dot" title={`${e.label}: ${e.count}`}
                                style={{ left: `${pos.left}%`, top: `${pos.top}%`, width: `${size}%`, height: `${size}%` }} />
                            <span className="mood-emotion-dot-label" style={{ left: `${pos.left}%`, top: `calc(${pos.top + size / 2}% + 0.02rem)` }}>{e.label}</span>
                        </React.Fragment>
                    );
                })}
                {stats.center && (
                    <span className="mood-affect-center" title="Average position of tagged emotions"
                        style={{ left: `${50 + stats.center.valence * R}%`, top: `${50 - stats.center.arousal * R}%` }} />
                )}
            </div>
            <div className="mood-emotion-list">
                <p className="mood-affect-text">{describeAffect(stats.center)} <span className="mood-muted">· ◆ marks the average</span></p>
                {stats.ranked.slice(0, 8).map(e => (
                    <div key={e.id} className="mood-bar-row">
                        <span className="mood-bar-label">{e.label}</span>
                        <span className="mood-bar-track"><span className="mood-bar" style={{ width: `${e.count / max * 100}%` }} /></span>
                        <span className="mood-bar-value">{e.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Stat({ label, value, delta }) {
    const show = delta != null && !isNaN(delta);
    return (
        <div className="mood-stat">
            <span className="mood-stat-label">{label}</span>
            <span className="mood-stat-value">{value}</span>
            {show && (
                <span className={`mood-stat-delta ${delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : ''}`}
                    title="Change vs previous period">
                    {delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '■'}{Math.abs(delta).toFixed(1)}
                </span>
            )}
        </div>
    );
}

function LogList({ logs, onEdit, onDelete }) {
    const [limit, setLimit] = useState(30);
    const sorted = [...logs].sort((a, b) => b.ts - a.ts);
    if (!sorted.length) return <p className="mood-muted mood-center">No logs in this range.</p>;
    return (
        <div className="mood-loglist mood-scroll">
            {sorted.slice(0, limit).map(l => {
                const d = new Date(l.ts);
                return (
                    <div key={l.id} className="mood-logitem">
                        <div className="mood-logitem-head">
                            <span className={`mood-kind-badge ${l.kind}`}>{l.kind === 'day' ? 'Whole day' : 'Ad hoc'}</span>
                            <span className="mood-logitem-when">
                                {parseDateKey(l.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                {l.kind === 'moment' && ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                            <span className="mood-logitem-values">
                                {SERIES.map(s => (
                                    <span key={s.id} title={s.label}><span className={`mood-swatch mood-bg-${s.id}`} />{l[s.id] == null ? '–' : l[s.id]}</span>
                                ))}
                            </span>
                            {l.emotions && l.emotions.length > 0 && (
                                <span className="mood-chips">{l.emotions.map(id => <span key={id} className="mood-chip">{EMOTION_BY_ID[id] ? EMOTION_BY_ID[id].label : id}</span>)}</span>
                            )}
                            <span className="mood-logitem-actions">
                                <button type="button" onClick={() => onEdit(l)}>Edit</button>
                                <button type="button" onClick={() => onDelete(l)}>Delete</button>
                            </span>
                        </div>
                        {l.note && <div className="mood-logitem-note">{l.note}</div>}
                    </div>
                );
            })}
            {sorted.length > limit && (
                <button type="button" className="mood-btn small" onClick={() => setLimit(limit + 30)}>Show more ({sorted.length - limit} left)</button>
            )}
        </div>
    );
}

function LogModal({ children, title, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="settings-modal-overlay" onMouseDown={onClose}>
            <div className="mood-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>{title}</h2>
                    <button type="button" className="settings-close-btn" aria-label="Close" onClick={onClose}>&#10005;</button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ======================================================================
   Page
   ====================================================================== */

const PERIODS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
const CYCLES = [['hour', 'Hour of day'], ['weekday', 'Day of week'], ['monthday', 'Day of month'], ['month', 'Month of year']];
const LOOKBACKS = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last year'], ['all', 'All time']];
const SOURCES = [['blended', 'All logs'], ['day', 'Whole-day logs'], ['moment', 'Ad hoc logs']];
const VIEWS = [['trend', 'Trend'], ['calendar', 'Calendar'], ['emotions', 'Emotions'], ['logs', 'Logs']];

function Seg({ options, value, onChange, label }) {
    return (
        <div className="mood-seg" role="tablist" aria-label={label}>
            {options.map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={value === v}
                    className={value === v ? 'active' : ''} onClick={() => onChange(v)}>{l}</button>
            ))}
        </div>
    );
}

export default class MoodTracker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            logs: loadLogs(),
            modalOpen: false,
            editing: null,
            formKey: 0,
            formKind: 'moment',
            flash: '',
            mode: 'history',
            period: 'week',
            cycle: 'weekday',
            lookback: 'all',
            source: 'blended',
            anchor: new Date(),
            view: 'trend',
            trendAsTable: false,
            heatMetric: 'happiness',
            visible: { happiness: true, contentment: true, energy: true }
        };
    }

    componentDidMount() {
        window.addEventListener(MOOD_EVENT, this.handleExternalUpdate);
        window.addEventListener('storage', this.handleStorage);
    }

    componentWillUnmount() {
        window.removeEventListener(MOOD_EVENT, this.handleExternalUpdate);
        window.removeEventListener('storage', this.handleStorage);
        clearTimeout(this.flashTimer);
    }

    // Cloud sync or another tab changed the stored logs.
    handleExternalUpdate = (e) => {
        if (!e.detail || !e.detail.keys || e.detail.keys.includes(MOOD_KEY)) this.setState({ logs: loadLogs() });
    };
    handleStorage = (e) => { if (e.key === MOOD_KEY) this.setState({ logs: loadLogs() }); };

    persist(logs, flash) {
        saveLogs(logs);
        this.setState({ logs, editing: null, modalOpen: false, formKey: this.state.formKey + 1, flash });
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => this.setState({ flash: '' }), 2500);
    }

    handleSave = (log) => {
        const editing = !!this.state.editing;
        this.setState({ formKind: 'moment' });
        this.persist(upsertLog(loadLogs(), log), editing ? 'Log updated.' : 'Logged. Thanks for checking in!');
    };

    handleDelete = (log) => {
        if (!window.confirm('Delete this mood log?')) return;
        this.persist(loadLogs().filter(l => l.id !== log.id), 'Log deleted.');
    };

    openNew = () => this.setState({ modalOpen: true, editing: null, formKind: 'moment', formKey: this.state.formKey + 1 });

    handleEdit = (log) => this.setState({ modalOpen: true, editing: log, formKind: log.kind, formKey: this.state.formKey + 1 });

    closeModal = () => this.setState({ modalOpen: false, editing: null, formKind: 'moment', formKey: this.state.formKey + 1 });

    toggleSeries = (id) => this.setState(s => {
        const visible = { ...s.visible, [id]: !s.visible[id] };
        return Object.values(visible).some(Boolean) ? { visible } : null;
    });

    pickDay = (d) => this.setState({ mode: 'history', period: 'day', anchor: d, view: 'trend' });

    swipeStart = (e) => {
        const t = e.touches[0];
        this.swipe = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    };

    swipeEnd = (e) => {
        const st = this.swipe;
        this.swipe = null;
        if (!st) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - st.x, dy = t.clientY - st.y;
        // A deliberate, mostly-horizontal flick: left goes to the next tab, right to the previous.
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) this.stepView(dx < 0 ? 1 : -1);
    };

    stepView = (dir) => this.setState(s => {
        const i = VIEWS.findIndex(v => v[0] === s.view);
        return { view: VIEWS[(i + dir + VIEWS.length) % VIEWS.length][0] };
    });

    computeRange() {
        const { logs, mode, period, cycle, lookback, source, anchor } = this.state;
        const today = new Date();
        const r = { prevSummary: null };
        if (mode === 'history') {
            const { start, end } = periodRange(period, anchor);
            r.rangeLogs = logsInRange(logs, dateKey(start), dateKey(end));
            r.buckets = historicalBuckets(logs, period, anchor, source);
            const perMoment = period === 'day';
            r.summary = summarize(r.rangeLogs, source, perMoment);
            const prev = periodRange(period, shiftAnchor(period, anchor, -1));
            r.prevSummary = summarize(logsInRange(logs, dateKey(prev.start), dateKey(prev.end)), source, perMoment);
            r.title = periodTitle(period, anchor);
            r.firstCol = period === 'day' ? 'Hour' : period === 'year' ? 'Month' : 'Day';
            r.emptyText = period === 'day'
                ? (source === 'day' ? 'The hourly view uses ad hoc logs only.' : 'No ad hoc logs on this day.')
                : 'No logs in this range yet.';
        } else {
            const startKey = lookback === 'all' ? '0000-01-01' : dateKey(addDays(today, -Number(lookback) + 1));
            r.rangeLogs = logsInRange(logs, startKey, dateKey(today));
            r.buckets = cycleBuckets(logs, cycle, startKey, dateKey(today), source);
            r.summary = summarize(r.rangeLogs, source, cycle === 'hour');
            r.title = `Typical ${CYCLES.find(c => c[0] === cycle)[1].toLowerCase()}`;
            r.firstCol = CYCLES.find(c => c[0] === cycle)[1];
            r.emptyText = cycle === 'hour'
                ? (source === 'day' ? 'Hour-of-day cycles use ad hoc logs only.' : 'Log moods throughout the day to see your daily rhythm.')
                : 'Not enough logs yet to show a cycle.';
        }
        r.heatYear = (mode === 'history' ? anchor : today).getFullYear();
        return r;
    }

    renderView(r) {
        const { view, visible, heatMetric, source, logs, trendAsTable, mode, period } = this.state;
        if (view === 'trend') {
            const dayLog = mode === 'history' && period === 'day' ? r.rangeLogs.find(l => l.kind === 'day') : null;
            return (
                <>
                    {trendAsTable ? <DataTable buckets={r.buckets} firstCol={r.firstCol} />
                        : <LineChart buckets={r.buckets} visible={visible} emptyText={r.emptyText} />}
                    {dayLog && (
                        <p className="mood-muted mood-daylog-note">
                            Whole-day log: happiness {dayLog.happiness}, contentment {dayLog.contentment}{dayLog.energy ? `, energy ${dayLog.energy}` : ''}.
                        </p>
                    )}
                </>
            );
        }
        if (view === 'calendar') {
            return <YearHeatmap logs={logs} year={r.heatYear} source={source} metric={heatMetric} onPick={this.pickDay} />;
        }
        if (view === 'emotions') return <EmotionSummary stats={emotionStats(r.rangeLogs, source)} />;
        return <LogList logs={r.rangeLogs.filter(l => source === 'blended' || l.kind === source)} onEdit={this.handleEdit} onDelete={this.handleDelete} />;
    }

    renderViewTools(r) {
        const { view, visible, heatMetric, trendAsTable } = this.state;
        if (view === 'trend') {
            return (
                <>
                    {!trendAsTable && SERIES.map(s => (
                        <button key={s.id} type="button" aria-pressed={visible[s.id]}
                            className={`mood-legend-item ${visible[s.id] ? '' : 'off'}`} onClick={() => this.toggleSeries(s.id)}>
                            <span className={`mood-swatch mood-bg-${s.id}`} />{s.label}
                        </button>
                    ))}
                    <button type="button" className="mood-link-btn" onClick={() => this.setState({ trendAsTable: !trendAsTable })}>
                        {trendAsTable ? 'Show chart' : 'Show table'}
                    </button>
                </>
            );
        }
        if (view === 'calendar') {
            return (
                <>
                    <span className="mood-muted">{r.heatYear} · select a day to open it</span>
                    <HeatLegend />
                    <select className="mood-select" aria-label="Calendar metric" value={heatMetric} onChange={(e) => this.setState({ heatMetric: e.target.value })}>
                        {SERIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </>
            );
        }
        return null;
    }

    render() {
        const { logs, mode, period, cycle, lookback, source, anchor, view, modalOpen, editing, formKey, formKind, flash } = this.state;
        const r = this.computeRange();
        const today = new Date();
        const delta = (k) => (r.prevSummary && r.summary[k] != null && r.prevSummary[k] != null ? r.summary[k] - r.prevSummary[k] : null);
        const streak = currentStreak(logs);
        const viewIdx = VIEWS.findIndex(v => v[0] === view);

        return (
            <div className="mood-page">
                <div className="mood-toolbar">
                    <Seg label="View" options={[['history', 'Over time'], ['cycle', 'Typical cycle']]} value={mode} onChange={(v) => this.setState({ mode: v })} />
                    {mode === 'history'
                        ? <Seg label="Period" options={PERIODS} value={period} onChange={(v) => this.setState({ period: v })} />
                        : <Seg label="Cycle" options={CYCLES} value={cycle} onChange={(v) => this.setState({ cycle: v })} />}
                    {mode === 'cycle' && (
                        <select className="mood-select" aria-label="Time window" value={lookback} onChange={(e) => this.setState({ lookback: e.target.value })}>
                            {LOOKBACKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    )}
                    <select className="mood-select" aria-label="Which logs to include" value={source} onChange={(e) => this.setState({ source: e.target.value })}>
                        {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button type="button" className="mood-btn primary mood-log-btn" onClick={this.openNew}>+ Log mood</button>
                </div>

                <div className="mood-headline">
                    <div className="mood-range-title">
                        {mode === 'history' && <button type="button" className="mood-nav" aria-label="Previous" onClick={() => this.setState({ anchor: shiftAnchor(period, anchor, -1) })}>‹</button>}
                        <span>{r.title}</span>
                        {mode === 'history' && <button type="button" className="mood-nav" aria-label="Next" onClick={() => this.setState({ anchor: shiftAnchor(period, anchor, 1) })}>›</button>}
                        {mode === 'history' && dateKey(periodRange(period, anchor).start) !== dateKey(periodRange(period, today).start) && (
                            <button type="button" className="mood-btn small" onClick={() => this.setState({ anchor: new Date() })}>Today</button>
                        )}
                    </div>
                    <div className="mood-stats">
                        <Stat label="Happiness" value={fmt(r.summary.happiness)} delta={delta('happiness')} />
                        <Stat label="Contentment" value={fmt(r.summary.contentment)} delta={delta('contentment')} />
                        <Stat label="Energy" value={fmt(r.summary.energy)} delta={delta('energy')} />
                        <Stat label="Logs" value={r.summary.logs || 0} />
                        <Stat label="Streak" value={`${streak}d`} />
                    </div>
                </div>

                <section className="mood-panel">
                    <div className="mood-panel-head">
                        <div className="mood-carousel-nav">
                            <button type="button" className="mood-nav small" aria-label="Previous view" onClick={() => this.stepView(-1)}>‹</button>
                            <div className="mood-tabs" role="tablist" aria-label="Visualization">
                                {VIEWS.map(([v, l]) => (
                                    <button key={v} type="button" role="tab" aria-selected={view === v}
                                        className={`mood-tab ${view === v ? 'active' : ''}`} onClick={() => this.setState({ view: v })}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="mood-nav small" aria-label="Next view" onClick={() => this.stepView(1)}>›</button>
                        </div>
                        <div className="mood-view-tools">{this.renderViewTools(r)}</div>
                    </div>
                    <div className={`mood-panel-body view-${view}`} key={view} onTouchStart={this.swipeStart} onTouchEnd={this.swipeEnd}>{this.renderView(r)}</div>
                    <div className="mood-dots" aria-hidden="true">
                        {VIEWS.map(([v], i) => <span key={v} className={i === viewIdx ? 'on' : ''} />)}
                    </div>
                </section>

                {flash && <div className="mood-flash" role="status">{flash}</div>}

                {modalOpen && (
                    <LogModal title={editing ? 'Edit log' : 'Mood check-in'} onClose={this.closeModal}>
                        <MoodLogForm
                            key={formKey}
                            logs={logs}
                            editing={editing}
                            initialKind={formKind}
                            onSave={this.handleSave}
                            onEdit={this.handleEdit}
                            onCancel={this.closeModal}
                            onDelete={this.handleDelete}
                        />
                    </LogModal>
                )}
            </div>
        );
    }
}
