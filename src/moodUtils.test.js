import {
    loadLogs, saveLogs, countWords, dailyValues, historicalBuckets, cycleBuckets, upsertLog, periodRange,
    dateKey, currentStreak, emotionStats, summarize
} from './moodUtils';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const moment = (id, y, m, d, h, happiness, contentment, energy = null, emotions = []) => ({
    id, kind: 'moment', date: dateKey(new Date(y, m - 1, d)), ts: at(y, m, d, h), happiness, contentment, energy, emotions
});
const day = (id, y, m, d, happiness, contentment, energy = null, emotions = []) => ({
    id, kind: 'day', date: dateKey(new Date(y, m - 1, d)), ts: at(y, m, d), happiness, contentment, energy, emotions
});

describe('moodUtils', () => {
    test('countWords', () => {
        expect(countWords('')).toBe(0);
        expect(countWords('  one two\nthree  ')).toBe(3);
    });

    test('blended daily values prefer the whole-day log, else average moments', () => {
        const logs = [
            moment('a', 2026, 11, 2, 9, 2, 3, 4),
            moment('b', 2026, 11, 2, 15, 4, 5),
            day('c', 2026, 11, 2, 5, 5),
            moment('d', 2026, 11, 3, 9, 1, 3, 2),
            moment('e', 2026, 11, 3, 18, 3, 5, 4)
        ];
        const blended = dailyValues(logs, 'blended');
        expect(blended.get('2026-11-02').happiness).toBe(5);
        expect(blended.get('2026-11-02').energy).toBe(4); // filled from moments
        expect(blended.get('2026-11-02').logCount).toBe(3);
        expect(blended.get('2026-11-03').happiness).toBe(2);
        expect(blended.get('2026-11-03').energy).toBe(3);

        const momentsOnly = dailyValues(logs, 'moment');
        expect(momentsOnly.get('2026-11-02').happiness).toBe(3);
        expect(dailyValues(logs, 'day').has('2026-11-03')).toBe(false);
    });

    test('historical week buckets start Monday', () => {
        const logs = [moment('a', 2026, 11, 4, 9, 4, 4)]; // Wednesday
        const buckets = historicalBuckets(logs, 'week', new Date(2026, 10, 6), 'blended');
        expect(buckets).toHaveLength(7);
        expect(buckets[0].short).toBe('Mon');
        expect(buckets[2].happiness).toBe(4);
        expect(buckets[3].happiness).toBeNull();
    });

    test('historical day buckets are hourly from ad hoc logs', () => {
        const logs = [moment('a', 2026, 11, 4, 9, 4, 4), moment('b', 2026, 11, 4, 9, 2, 2), day('c', 2026, 11, 4, 1, 1)];
        const buckets = historicalBuckets(logs, 'day', new Date(2026, 10, 4), 'blended');
        expect(buckets).toHaveLength(24);
        expect(buckets[9].happiness).toBe(3);
        expect(buckets[9].n).toBe(2);
    });

    test('cycle buckets aggregate by weekday and hour', () => {
        const logs = [
            moment('a', 2026, 11, 2, 8, 2, 2), // Mon
            moment('b', 2026, 11, 9, 8, 4, 4), // Mon
            moment('c', 2026, 11, 8, 20, 5, 5) // Sun
        ];
        const wk = cycleBuckets(logs, 'weekday', '0000-01-01', '2026-12-31', 'blended');
        expect(wk[0].happiness).toBe(3);
        expect(wk[0].days).toBe(2);
        expect(wk[6].happiness).toBe(5);
        const hr = cycleBuckets(logs, 'hour', '0000-01-01', '2026-12-31', 'blended');
        expect(hr[8].happiness).toBe(3);
        expect(hr[20].happiness).toBe(5);
    });

    test('upsertLog keeps one whole-day log per date', () => {
        const a = day('a', 2026, 11, 2, 2, 2);
        const b = day('b', 2026, 11, 2, 4, 4);
        const result = upsertLog([a, moment('m', 2026, 11, 2, 9, 3, 3)], b);
        expect(result.filter(l => l.kind === 'day').map(l => l.id)).toEqual(['b']);
        expect(result).toHaveLength(2);
    });

    test('periodRange month and year', () => {
        const m = periodRange('month', new Date(2026, 1, 10));
        expect(dateKey(m.start)).toBe('2026-02-01');
        expect(dateKey(m.end)).toBe('2026-02-28');
        const y = periodRange('year', new Date(2026, 5, 1));
        expect(dateKey(y.end)).toBe('2026-12-31');
    });

    test('streak counts back from today or yesterday', () => {
        const logs = [moment('a', 2026, 11, 4, 9, 3, 3), moment('b', 2026, 11, 5, 9, 3, 3)];
        expect(currentStreak(logs, new Date(2026, 10, 6))).toBe(2);
        expect(currentStreak(logs, new Date(2026, 10, 8))).toBe(0);
    });

    test('emotion stats rank and locate', () => {
        const logs = [moment('a', 2026, 11, 4, 9, 3, 3, null, ['happy', 'excited']), moment('b', 2026, 11, 4, 10, 3, 3, null, ['happy'])];
        const s = emotionStats(logs, 'blended');
        expect(s.ranked[0]).toMatchObject({ id: 'happy', count: 2 });
        expect(s.center.valence).toBeGreaterThan(0.5);
    });

    test('summarize averages days, not raw logs', () => {
        const logs = [moment('a', 2026, 11, 4, 9, 1, 1), moment('b', 2026, 11, 4, 10, 1, 1), moment('c', 2026, 11, 5, 9, 5, 5)];
        const s = summarize(logs, 'blended');
        expect(s.happiness).toBe(3);
        expect(s.days).toBe(2);
        expect(s.logs).toBe(3);
    });

    test('saveLogs keeps tombstones for removed logs', () => {
        localStorage.clear();
        const a = moment('a', 2026, 11, 4, 9, 3, 3);
        const b = moment('b', 2026, 11, 4, 10, 4, 4);
        saveLogs([a, b]);
        saveLogs([a]);
        const raw = JSON.parse(localStorage.getItem('mood'));
        expect(raw.find(r => r.id === 'b')).toMatchObject({ deleted: true });
        expect(loadLogs().map(l => l.id)).toEqual(['a']);
        saveLogs([a]);
        expect(JSON.parse(localStorage.getItem('mood')).filter(r => r.deleted)).toHaveLength(1);
    });
});
