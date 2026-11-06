/* Mood tracker: data model, storage, and aggregation helpers (pure, no React). */

export const MOOD_KEY = 'mood';
export const MOOD_EVENT = 'leatherbound:data-updated';
export const NOTE_WORD_LIMIT = 100;

export const METRICS = [
    { id: 'happiness', label: 'Happiness', required: true,
      low: 'Very unhappy', high: 'Very happy',
      prompt: { moment: 'How happy are you right now?', day: 'How happy were you today, generally?' } },
    { id: 'contentment', label: 'Contentment', required: true,
      low: 'Very dissatisfied', high: 'Very satisfied',
      prompt: { moment: 'How content are you with how your day is going?', day: 'How satisfied are you with how the day went?' } },
    { id: 'energy', label: 'Energy', required: false,
      low: 'Drained', high: 'Energized',
      prompt: { moment: 'How energized or motivated do you feel right now?', day: 'How energized or motivated did you feel today?' } }
];

// Emotion circumplex (Russell). Angle in degrees: 0 = pleasant, 90 = activation,
// 180 = unpleasant, -90 = deactivation. "core" emotions sit on the rim of the circle.
export const EMOTIONS = [
    { id: 'alert', label: 'alert', angle: 67 },
    { id: 'excited', label: 'excited', angle: 45 },
    { id: 'elated', label: 'elated', angle: 31 },
    { id: 'happy', label: 'happy', angle: 14 },
    { id: 'contented', label: 'contented', angle: -14 },
    { id: 'serene', label: 'serene', angle: -29 },
    { id: 'relaxed', label: 'relaxed', angle: -44 },
    { id: 'calm', label: 'calm', angle: -65 },
    { id: 'fatigued', label: 'fatigued', angle: -116 },
    { id: 'lethargic', label: 'lethargic', angle: -137 },
    { id: 'depressed', label: 'depressed', angle: -153 },
    { id: 'sad', label: 'sad', angle: -168 },
    { id: 'upset', label: 'upset', angle: 167 },
    { id: 'stressed', label: 'stressed', angle: 154 },
    { id: 'nervous', label: 'nervous', angle: 137 },
    { id: 'tense', label: 'tense', angle: 120 },
    { id: 'surprise', label: 'Surprise', angle: 90, core: true },
    { id: 'happiness', label: 'Happiness', angle: 9, core: true },
    { id: 'sadness', label: 'Sadness', angle: -164, core: true },
    { id: 'disgust', label: 'Disgust', angle: 166, core: true },
    { id: 'anger', label: 'Anger', angle: 153, core: true },
    { id: 'fear', label: 'Fear', angle: 140, core: true }
];
export const EMOTION_BY_ID = Object.fromEntries(EMOTIONS.map(e => [e.id, e]));

/* ---------- dates ---------- */

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    return r;
}

// Weeks start on Monday.
export function startOfWeek(d) {
    const day = (d.getDay() + 6) % 7;
    return addDays(d, -day);
}

export function toDateTimeLocal(ts) {
    const d = new Date(ts);
    return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function hourLabel(h) {
    const suffix = h < 12 ? 'a' : 'p';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${suffix}`;
}

/* ---------- notes ---------- */

export function countWords(text) {
    const t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
}

/* ---------- storage ---------- */

// Raw stored records: logs plus tombstones ({ id, deleted: true, updatedAt }) for deleted logs.
// Tombstones let the server merge copies from other devices and the API without
// resurrecting anything that was deleted.
function loadRecords() {
    try {
        const raw = localStorage.getItem(MOOD_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(r => r && r.id) : [];
    } catch (e) {
        return [];
    }
}

export function loadLogs() {
    return loadRecords().filter(r => !r.deleted && isValidLog(r));
}

// Save the full set of live logs. Any log that was stored before but is missing now
// (deleted, or a whole-day log replaced by another) is recorded as a tombstone.
export function saveLogs(logs) {
    const now = Date.now();
    const keep = new Set(logs.map(l => l.id));
    const tombstones = loadRecords()
        .filter(r => !keep.has(r.id))
        .map(r => (r.deleted ? r : { id: r.id, deleted: true, updatedAt: now }));
    localStorage.setItem(MOOD_KEY, JSON.stringify([...logs, ...tombstones]));
    const timestamps = JSON.parse(localStorage.getItem('leatherbound-timestamps') || '{}');
    timestamps[MOOD_KEY] = now;
    localStorage.setItem('leatherbound-timestamps', JSON.stringify(timestamps));
}

function isValidLog(l) {
    return l && (l.kind === 'moment' || l.kind === 'day') && typeof l.date === 'string'
        && typeof l.happiness === 'number' && typeof l.contentment === 'number';
}

export function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Insert or replace a log. A day can have only one whole-day log, so saving a day log
// replaces any other day log for the same date.
export function upsertLog(logs, log) {
    const rest = logs.filter(l => l.id !== log.id
        && !(log.kind === 'day' && l.kind === 'day' && l.date === log.date));
    return [...rest, log].sort((a, b) => a.ts - b.ts);
}

/* ---------- aggregation ---------- */

const METRIC_IDS = ['happiness', 'contentment', 'energy'];

function mean(values) {
    const v = values.filter(x => typeof x === 'number');
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function averageOf(items) {
    const out = { n: items.length };
    METRIC_IDS.forEach(m => { out[m] = mean(items.map(i => i[m])); });
    return out;
}

// One value set per calendar day. "blended": the whole-day log if there is one, otherwise
// the mean of that day's ad hoc logs. "day"/"moment": only that kind of log.
export function dailyValues(logs, source = 'blended') {
    const byDate = new Map();
    logs.forEach(l => {
        if (source !== 'blended' && l.kind !== source) return;
        if (!byDate.has(l.date)) byDate.set(l.date, { day: null, moments: [] });
        const entry = byDate.get(l.date);
        if (l.kind === 'day') entry.day = l; else entry.moments.push(l);
    });
    const result = new Map();
    byDate.forEach((entry, date) => {
        let values;
        if (entry.day && source !== 'moment') {
            values = { n: 1 };
            METRIC_IDS.forEach(m => { values[m] = typeof entry.day[m] === 'number' ? entry.day[m] : null; });
            // Fill a skipped optional metric from the day's ad hoc logs when blending.
            if (values.energy == null && source === 'blended') values.energy = mean(entry.moments.map(x => x.energy));
        } else {
            values = averageOf(entry.moments);
        }
        values.logCount = (entry.day ? 1 : 0) + entry.moments.length;
        result.set(date, values);
    });
    return result;
}

function inRange(dateStr, start, end) {
    return dateStr >= start && dateStr <= end;
}

export function logsInRange(logs, startKey, endKey) {
    return logs.filter(l => inRange(l.date, startKey, endKey));
}

// The calendar period that contains `anchor` for a historical view.
export function periodRange(period, anchor) {
    const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    if (period === 'day') return { start: a, end: a };
    if (period === 'week') { const s = startOfWeek(a); return { start: s, end: addDays(s, 6) }; }
    if (period === 'month') return { start: new Date(a.getFullYear(), a.getMonth(), 1), end: new Date(a.getFullYear(), a.getMonth() + 1, 0) };
    return { start: new Date(a.getFullYear(), 0, 1), end: new Date(a.getFullYear(), 11, 31) };
}

export function shiftAnchor(period, anchor, dir) {
    const a = new Date(anchor);
    if (period === 'day') return addDays(a, dir);
    if (period === 'week') return addDays(a, 7 * dir);
    if (period === 'month') return new Date(a.getFullYear(), a.getMonth() + dir, Math.min(a.getDate(), 28));
    return new Date(a.getFullYear() + dir, a.getMonth(), Math.min(a.getDate(), 28));
}

export function periodTitle(period, anchor) {
    const { start, end } = periodRange(period, anchor);
    if (period === 'day') return start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (period === 'week') {
        const sameMonth = start.getMonth() === end.getMonth();
        const s = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const e = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
        return `Week of ${s}–${e}, ${end.getFullYear()}`;
    }
    if (period === 'month') return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return String(start.getFullYear());
}

// Historical buckets for the period containing `anchor`.
// Returns [{ key, label, short, happiness, contentment, energy, n }].
export function historicalBuckets(logs, period, anchor, source) {
    const { start, end } = periodRange(period, anchor);
    const startKey = dateKey(start), endKey = dateKey(end);

    if (period === 'day') {
        const moments = logs.filter(l => l.kind === 'moment' && l.date === startKey && source !== 'day');
        return Array.from({ length: 24 }, (_, h) => {
            const items = moments.filter(m => new Date(m.ts).getHours() === h);
            return { key: h, label: `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`, short: hourLabel(h), ...averageOf(items) };
        });
    }

    const daily = dailyValues(logsInRange(logs, startKey, endKey), source);

    if (period === 'year') {
        return MONTHS.map((m, i) => {
            const items = [];
            daily.forEach((v, k) => { if (parseDateKey(k).getMonth() === i) items.push(v); });
            return { key: i, label: `${m} ${start.getFullYear()}`, short: m, ...averageDaily(items) };
        });
    }

    const buckets = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
        const k = dateKey(d);
        const v = daily.get(k);
        buckets.push({
            key: k,
            label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            short: period === 'week' ? WEEKDAYS[(d.getDay() + 6) % 7] : String(d.getDate()),
            ...(v ? { happiness: v.happiness, contentment: v.contentment, energy: v.energy, n: v.logCount } : { happiness: null, contentment: null, energy: null, n: 0 })
        });
    }
    return buckets;
}

function averageDaily(items) {
    const out = averageOf(items);
    out.n = items.reduce((s, i) => s + (i.logCount || 0), 0);
    out.days = items.length;
    return out;
}

// Typical cycle buckets across all logs in [startKey, endKey].
export function cycleBuckets(logs, cycle, startKey, endKey, source) {
    const ranged = logsInRange(logs, startKey, endKey);
    if (cycle === 'hour') {
        const moments = source === 'day' ? [] : ranged.filter(l => l.kind === 'moment');
        return Array.from({ length: 24 }, (_, h) => {
            const items = moments.filter(m => new Date(m.ts).getHours() === h);
            return { key: h, label: `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`, short: hourLabel(h), ...averageOf(items) };
        });
    }
    const daily = dailyValues(ranged, source);
    const groups = { weekday: 7, monthday: 31, month: 12 }[cycle];
    const bins = Array.from({ length: groups }, () => []);
    daily.forEach((v, k) => {
        const d = parseDateKey(k);
        const idx = cycle === 'weekday' ? (d.getDay() + 6) % 7 : cycle === 'monthday' ? d.getDate() - 1 : d.getMonth();
        bins[idx].push(v);
    });
    return bins.map((items, i) => {
        const names = cycle === 'weekday'
            ? { label: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i], short: WEEKDAYS[i] }
            : cycle === 'monthday' ? { label: `Day ${i + 1} of the month`, short: String(i + 1) }
            : { label: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i], short: MONTHS[i] };
        return { key: i, ...names, ...averageDaily(items) };
    });
}

// Summary for a set of logs: averages of daily values (or of moments for a single day).
export function summarize(logs, source, perMoment = false) {
    if (perMoment) {
        const items = logs.filter(l => source === 'blended' || l.kind === source);
        return { ...averageOf(items), logs: items.length };
    }
    const daily = Array.from(dailyValues(logs, source).values());
    const avg = averageOf(daily);
    return { ...avg, days: daily.length, logs: daily.reduce((s, d) => s + d.logCount, 0) };
}

// Emotion frequency and the mean position on the circumplex.
export function emotionStats(logs, source) {
    const counts = {};
    let x = 0, y = 0, total = 0;
    logs.forEach(l => {
        if (source !== 'blended' && l.kind !== source) return;
        (l.emotions || []).forEach(id => {
            const e = EMOTION_BY_ID[id];
            if (!e) return;
            counts[id] = (counts[id] || 0) + 1;
            const rad = e.angle * Math.PI / 180;
            x += Math.cos(rad); y += Math.sin(rad); total += 1;
        });
    });
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count, ...EMOTION_BY_ID[id] }));
    return { ranked, total, center: total ? { valence: x / total, arousal: y / total } : null };
}

// Consecutive days (ending today or yesterday) that have at least one log.
export function currentStreak(logs, today = new Date()) {
    const dates = new Set(logs.map(l => l.date));
    let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!dates.has(dateKey(d))) d = addDays(d, -1);
    let streak = 0;
    while (dates.has(dateKey(d))) { streak += 1; d = addDays(d, -1); }
    return streak;
}
