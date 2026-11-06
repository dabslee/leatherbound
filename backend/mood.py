"""Mood tracker data helpers shared by the sync endpoint and the mood API.

Mood logs live in the user's synced "mood" key as a JSON array. Each record is either a log
or a tombstone ({"id", "deleted": true, "updatedAt"}) left behind by a delete, so that merging
copies from different devices (or from the API) never resurrects deleted logs.
"""
import datetime
import json
import re
import secrets
import time

MOOD_KEY = 'mood'
NOTE_WORD_LIMIT = 100
METRICS = ('happiness', 'contentment', 'energy')

# Emotion circumplex. Angle in degrees: 0 = pleasant, 90 = activation, 180 = unpleasant,
# -90 = deactivation. Mirrors EMOTIONS in src/moodUtils.js.
EMOTIONS = [
    ('alert', 67, False), ('excited', 45, False), ('elated', 31, False), ('happy', 14, False),
    ('contented', -14, False), ('serene', -29, False), ('relaxed', -44, False), ('calm', -65, False),
    ('fatigued', -116, False), ('lethargic', -137, False), ('depressed', -153, False), ('sad', -168, False),
    ('upset', 167, False), ('stressed', 154, False), ('nervous', 137, False), ('tense', 120, False),
    ('surprise', 90, True), ('happiness', 9, True), ('sadness', -164, True),
    ('disgust', 166, True), ('anger', 153, True), ('fear', 140, True),
]
EMOTION_IDS = {e[0] for e in EMOTIONS}

DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


class ValidationError(ValueError):
    pass


def now_ms():
    return int(time.time() * 1000)


def new_id():
    return secrets.token_hex(8)


# ---------------------------------------------------------------- storage

def parse_records(content):
    if not content:
        return []
    try:
        data = json.loads(content)
    except (TypeError, ValueError):
        return []
    return [r for r in data if isinstance(r, dict) and r.get('id')] if isinstance(data, list) else []


def is_log(r):
    return not r.get('deleted') and r.get('kind') in ('moment', 'day') and isinstance(r.get('date'), str)


def live_logs(records):
    return sorted((r for r in records if is_log(r)), key=lambda r: r.get('ts', 0))


def dump_records(records):
    return json.dumps(sorted(records, key=lambda r: (r.get('ts') or 0, r['id'])), separators=(',', ':'))


def merge_records(a, b):
    """Merge two record lists by id; the newer updatedAt wins (tombstones included).

    A date can only have one whole-day log, so if both sides created one for the same date
    the newer one is kept and the other becomes a tombstone.
    """
    merged = {}
    for r in list(a) + list(b):
        cur = merged.get(r['id'])
        if cur is None or (r.get('updatedAt') or 0) >= (cur.get('updatedAt') or 0):
            merged[r['id']] = r
    day_by_date = {}
    for r in list(merged.values()):
        if not is_log(r) or r['kind'] != 'day':
            continue
        other = day_by_date.get(r['date'])
        if other is None:
            day_by_date[r['date']] = r
            continue
        keep, drop = (r, other) if (r.get('updatedAt') or 0) >= (other.get('updatedAt') or 0) else (other, r)
        day_by_date[r['date']] = keep
        merged[drop['id']] = tombstone(drop['id'], keep.get('updatedAt') or now_ms())
    return list(merged.values())


def tombstone(log_id, at=None):
    return {'id': log_id, 'deleted': True, 'updatedAt': at or now_ms()}


# ---------------------------------------------------------------- validation

def _scale(value, field, required):
    if value is None:
        if required:
            raise ValidationError(f'"{field}" is required (integer 1-5).')
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
        raise ValidationError(f'"{field}" must be an integer from 1 to 5.')
    return value


def _parse_time(value):
    """ISO 8601 with a UTC offset (the offset decides the local date), or epoch milliseconds."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        dt = datetime.datetime.fromtimestamp(value / 1000, tz=datetime.timezone.utc)
        return int(value), dt.date().isoformat()
    if not isinstance(value, str):
        raise ValidationError('"time" must be an ISO 8601 string with a UTC offset, e.g. "2026-11-06T14:30:00-05:00".')
    try:
        dt = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise ValidationError('"time" is not a valid ISO 8601 timestamp.')
    if dt.tzinfo is None:
        raise ValidationError('"time" must include a UTC offset (e.g. "-05:00" or "Z") so the local date is unambiguous.')
    return int(dt.timestamp() * 1000), dt.date().isoformat()


def _parse_date(value):
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise ValidationError('"date" must be YYYY-MM-DD.')
    try:
        d = datetime.date.fromisoformat(value)
    except ValueError:
        raise ValidationError('"date" is not a real calendar date.')
    return d


def build_log(payload, existing=None):
    """Validate an API payload into a stored log. With `existing`, fields not given are kept."""
    if not isinstance(payload, dict):
        raise ValidationError('Request body must be a JSON object.')
    base = dict(existing or {})
    kind = payload.get('kind', base.get('kind', 'moment'))
    if kind not in ('moment', 'day'):
        raise ValidationError('"kind" must be "moment" (right now / a specific time) or "day" (the whole day).')
    if existing and kind != existing['kind']:
        raise ValidationError('"kind" cannot be changed; delete the log and create a new one.')

    def pick(field):
        return payload[field] if field in payload else base.get(field)

    log = {
        'id': base.get('id') or new_id(),
        'kind': kind,
        'happiness': _scale(pick('happiness'), 'happiness', True),
        'contentment': _scale(pick('contentment'), 'contentment', True),
        'energy': _scale(pick('energy'), 'energy', False),
    }

    emotions = pick('emotions') or []
    if not isinstance(emotions, list) or not all(isinstance(e, str) for e in emotions):
        raise ValidationError('"emotions" must be a list of emotion ids.')
    unknown = [e for e in emotions if e not in EMOTION_IDS]
    if unknown:
        raise ValidationError(f'Unknown emotions: {", ".join(unknown)}. See GET /api/v1/mood/schema.')
    log['emotions'] = list(dict.fromkeys(emotions))

    note = pick('note') or ''
    if not isinstance(note, str):
        raise ValidationError('"note" must be a string.')
    note = note.strip()
    if len(note.split()) > NOTE_WORD_LIMIT:
        raise ValidationError(f'"note" is limited to {NOTE_WORD_LIMIT} words.')
    log['note'] = note

    if kind == 'moment':
        if 'time' in payload:
            log['ts'], log['date'] = _parse_time(payload['time'])
        elif existing:
            log['ts'], log['date'] = existing['ts'], existing['date']
        else:
            log['ts'] = now_ms()
            log['date'] = _local_date_from_offset(payload.get('utc_offset'), log['ts'])
    else:
        if 'date' in payload or not existing:
            if 'date' not in payload:
                raise ValidationError('"date" (YYYY-MM-DD) is required for a whole-day log.')
            d = _parse_date(payload['date'])
            log['date'] = d.isoformat()
            log['ts'] = int(datetime.datetime(d.year, d.month, d.day, 12, tzinfo=datetime.timezone.utc).timestamp() * 1000)
        else:
            log['ts'], log['date'] = existing['ts'], existing['date']

    stamp = now_ms()
    log['createdAt'] = base.get('createdAt') or stamp
    log['updatedAt'] = stamp
    return log


def _local_date_from_offset(offset, ts):
    """Local date for a log with no explicit time. `utc_offset` like "-05:00"; defaults to UTC."""
    tz = datetime.timezone.utc
    if offset:
        m = re.match(r'^([+-])(\d{2}):?(\d{2})$', str(offset))
        if not m:
            raise ValidationError('"utc_offset" must look like "-05:00".')
        delta = datetime.timedelta(hours=int(m.group(2)), minutes=int(m.group(3)))
        tz = datetime.timezone(delta if m.group(1) == '+' else -delta)
    return datetime.datetime.fromtimestamp(ts / 1000, tz=tz).date().isoformat()


# ---------------------------------------------------------------- reporting

def public_log(r):
    out = {k: r.get(k) for k in ('id', 'kind', 'date', 'happiness', 'contentment', 'energy', 'emotions', 'note')}
    out['time'] = (datetime.datetime.fromtimestamp(r['ts'] / 1000, tz=datetime.timezone.utc)
                   .isoformat().replace('+00:00', 'Z')) if r['kind'] == 'moment' and r.get('ts') else None
    out['created_at_ms'] = r.get('createdAt')
    out['updated_at_ms'] = r.get('updatedAt')
    return out


def filter_logs(logs, start=None, end=None, kind=None):
    for v, name in ((start, 'start'), (end, 'end')):
        if v is not None and not DATE_RE.match(v):
            raise ValidationError(f'"{name}" must be YYYY-MM-DD.')
    if kind not in (None, 'moment', 'day'):
        raise ValidationError('"kind" must be "moment" or "day".')
    return [l for l in logs
            if (start is None or l['date'] >= start) and (end is None or l['date'] <= end)
            and (kind is None or l['kind'] == kind)]


def _mean(values):
    vals = [v for v in values if isinstance(v, (int, float))]
    return round(sum(vals) / len(vals), 2) if vals else None


def daily_values(logs):
    """Per-day values: the whole-day log if there is one, otherwise the mean of that day's
    ad hoc logs (same "All logs" blending the dashboard uses)."""
    by_date = {}
    for l in logs:
        by_date.setdefault(l['date'], {'day': None, 'moments': []})
        if l['kind'] == 'day':
            by_date[l['date']]['day'] = l
        else:
            by_date[l['date']]['moments'].append(l)
    out = {}
    for date, e in sorted(by_date.items()):
        if e['day']:
            v = {m: e['day'].get(m) for m in METRICS}
            if v['energy'] is None:
                v['energy'] = _mean([x.get('energy') for x in e['moments']])
        else:
            v = {m: _mean([x.get(m) for x in e['moments']]) for m in METRICS}
        v['logs'] = (1 if e['day'] else 0) + len(e['moments'])
        out[date] = v
    return out


def summarize(logs):
    daily = daily_values(logs)
    counts = {}
    for l in logs:
        for e in l.get('emotions') or []:
            counts[e] = counts.get(e, 0) + 1
    return {
        'logs': len(logs),
        'days_logged': len(daily),
        'averages': {m: _mean([d[m] for d in daily.values()]) for m in METRICS},
        'top_emotions': [{'emotion': k, 'count': v} for k, v in sorted(counts.items(), key=lambda kv: -kv[1])[:10]],
        'daily': [{'date': d, **{m: v[m] for m in METRICS}, 'logs': v['logs']} for d, v in daily.items()],
    }


SCHEMA = {
    'scales': {
        'happiness': {'required': True, 'range': [1, 5],
                      'moment': 'How happy are you right now?', 'day': 'How happy were you today, generally?',
                      'low': 'Very unhappy', 'high': 'Very happy'},
        'contentment': {'required': True, 'range': [1, 5],
                        'moment': 'How content are you with how your day is going?',
                        'day': 'How satisfied are you with how the day went?',
                        'low': 'Very dissatisfied', 'high': 'Very satisfied'},
        'energy': {'required': False, 'range': [1, 5],
                   'moment': 'How energized or motivated do you feel right now?',
                   'day': 'How energized or motivated did you feel today?',
                   'low': 'Drained', 'high': 'Energized'},
    },
    'kinds': {
        'moment': 'An ad hoc log for a specific time. Give "time" as ISO 8601 with a UTC offset; defaults to now.',
        'day': 'A whole-day log for "date" (YYYY-MM-DD). One per date: creating another replaces it.',
    },
    'emotions': [{'id': e[0], 'angle_degrees': e[1], 'core': e[2]} for e in EMOTIONS],
    'emotion_axes': 'Russell circumplex: angle 0 = pleasant, 90 = activation, 180 = unpleasant, -90 = deactivation.',
    'note': {'required': False, 'max_words': NOTE_WORD_LIMIT},
}
