import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, UserData, ApiToken
import time
import jwt
import datetime
import hashlib
import secrets
import mood

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///leatherbound.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
CORS(app) # Allow CORS for all domains for now, or specify origin
db.init_app(app)

with app.app_context():
    db.create_all()

# Tokens last 30 days, but an actively-syncing client is handed a fresh one once it is past
# the halfway mark (see /api/sync). So a session in regular use never expires out from under
# the user; only a client that stays idle for the full window has to log in again.
TOKEN_LIFETIME = datetime.timedelta(days=30)
TOKEN_REFRESH_AFTER = TOKEN_LIFETIME / 2

def generate_token(user_id):
    now = datetime.datetime.utcnow()
    payload = {
        'user_id': user_id,
        'iat': now,
        'exp': now + TOKEN_LIFETIME
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def bearer_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1]
    return None

def token_should_refresh(token):
    """True if the token is valid but already past the halfway point of its lifetime."""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except jwt.InvalidTokenError:
        return False
    exp = payload.get('exp')
    if not exp:
        return False
    exp_dt = datetime.datetime.utcfromtimestamp(exp)
    return (exp_dt - datetime.datetime.utcnow()) < TOKEN_REFRESH_AFTER

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def authenticate_request():
    """Return (user_id, None) on success or (None, (response, status)) on failure."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, (jsonify({'error': 'Missing or invalid Authorization header'}), 401)

    token = auth_header.split(' ')[1]
    user_id = verify_token(token)
    if not user_id:
        return None, (jsonify({'error': 'Invalid or expired token'}), 401)

    if not User.query.get(user_id):
        return None, (jsonify({'error': 'User not found'}), 404)

    return user_id, None

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    user = User(username=username, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        token = generate_token(user.id)
        return jsonify({'message': 'Login successful', 'token': token, 'user_id': user.id}), 200

    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/sync', methods=['POST'])
def sync():
    user_id, error = authenticate_request()
    if error:
        return error

    data = request.json
    client_data = data.get('data') # Map of key -> {timestamp, content (optional)}

    updates = {}

    # Check each key sent by client
    for key, info in client_data.items():
        client_ts = info.get('timestamp', 0)
        client_content = info.get('content')

        server_entry = UserData.query.filter_by(user_id=user_id, key=key).first()

        # Mood logs are merged record-by-record instead of last-write-wins, so a log written
        # through the API (or on another device) isn't lost when this device pushes its copy.
        if key == mood.MOOD_KEY and server_entry and client_content is not None:
            merged = mood.dump_records(mood.merge_records(
                mood.parse_records(server_entry.content), mood.parse_records(client_content)))
            merged_ts = max(client_ts, server_entry.timestamp)
            server_entry.content = merged
            server_entry.timestamp = merged_ts
            db.session.add(server_entry)
            if merged != mood.dump_records(mood.parse_records(client_content)):
                updates[key] = {'content': merged, 'timestamp': merged_ts}
            continue

        if server_entry:
            if client_ts > server_entry.timestamp:
                # Client is newer, update server
                if client_content is not None:
                    server_entry.content = client_content
                    server_entry.timestamp = client_ts
                    db.session.add(server_entry)
            elif server_entry.timestamp > client_ts:
                # Server is newer, send to client
                updates[key] = {
                    'content': server_entry.content,
                    'timestamp': server_entry.timestamp
                }
        else:
            # New key for server
            if client_content is not None:
                new_entry = UserData(user_id=user_id, key=key, content=client_content, timestamp=client_ts)
                db.session.add(new_entry)

    # Check for keys on server that client didn't send
    server_keys = UserData.query.filter_by(user_id=user_id).all()
    for entry in server_keys:
        if entry.key not in client_data:
            updates[entry.key] = {
                'content': entry.content,
                'timestamp': entry.timestamp
            }

    db.session.commit()

    response = {'updates': updates}

    # Slide the session forward: if the caller's token is past halfway, hand back a fresh one
    # so a continuously-open client never gets logged out mid-use.
    token = bearer_token()
    if token and token_should_refresh(token):
        response['token'] = generate_token(user_id)

    return jsonify(response), 200

@app.route('/api/pull', methods=['POST'])
def pull():
    """Force pull: return the full server-side copy so the client can replace local."""
    user_id, error = authenticate_request()
    if error:
        return error

    entries = UserData.query.filter_by(user_id=user_id).all()
    data = {
        entry.key: {'content': entry.content, 'timestamp': entry.timestamp}
        for entry in entries
    }

    return jsonify({'data': data}), 200

@app.route('/api/push', methods=['POST'])
def push():
    """Force push: replace the entire server-side copy with the client's data."""
    user_id, error = authenticate_request()
    if error:
        return error

    payload = request.json or {}
    client_data = payload.get('data', {}) # Map of key -> {timestamp, content}

    # Overwrite every key the client sent, unconditionally.
    for key, info in client_data.items():
        content = info.get('content')
        timestamp = info.get('timestamp', 0)

        server_entry = UserData.query.filter_by(user_id=user_id, key=key).first()
        if server_entry:
            server_entry.content = content
            server_entry.timestamp = timestamp
            db.session.add(server_entry)
        else:
            db.session.add(UserData(user_id=user_id, key=key, content=content, timestamp=timestamp))

    # Drop any server keys the client did not send, so the cloud mirrors local exactly.
    for entry in UserData.query.filter_by(user_id=user_id).all():
        if entry.key not in client_data:
            db.session.delete(entry)

    db.session.commit()

    return jsonify({'message': 'Push successful'}), 200

# ============================================================================
# API tokens (long-lived credentials for agents / scripts)
# ============================================================================

API_TOKEN_PREFIX = 'lb_'
ALL_SCOPES = ('mood:read', 'mood:write')
MAX_TOKENS_PER_USER = 20


def hash_token(raw):
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def token_json(t):
    iso = lambda d: d.replace(tzinfo=datetime.timezone.utc).isoformat().replace('+00:00', 'Z') if d else None
    return {
        'id': t.id, 'name': t.name, 'prefix': t.prefix, 'scopes': t.scopes.split(),
        'created_at': iso(t.created_at), 'expires_at': iso(t.expires_at), 'last_used_at': iso(t.last_used_at),
    }


def api_error(message, status):
    return jsonify({'error': message}), status


def authenticate_api(scope):
    """Accept either a personal API token (lb_...) or a normal login session token.

    Returns (user_id, None) or (None, error_response).
    """
    raw = bearer_token()
    if not raw:
        return None, api_error('Missing "Authorization: Bearer <token>" header.', 401)

    if raw.startswith(API_TOKEN_PREFIX):
        t = ApiToken.query.filter_by(token_hash=hash_token(raw)).first()
        now = datetime.datetime.utcnow()
        if not t or t.revoked_at is not None:
            return None, api_error('Invalid or revoked API token.', 401)
        if t.expires_at is not None and t.expires_at <= now:
            return None, api_error('API token expired. Create a new one in Settings > Data.', 401)
        if scope not in t.scopes.split():
            return None, api_error(f'This token lacks the "{scope}" scope.', 403)
        # Record usage, at most once a minute to avoid a write on every call.
        if t.last_used_at is None or (now - t.last_used_at).total_seconds() > 60:
            t.last_used_at = now
            db.session.commit()
        user_id = t.user_id
    else:
        user_id = verify_token(raw)
        if not user_id:
            return None, api_error('Invalid or expired token.', 401)

    if not User.query.get(user_id):
        return None, api_error('User not found.', 404)
    return user_id, None


@app.route('/api/tokens', methods=['GET'])
def list_tokens():
    user_id, error = authenticate_request()
    if error:
        return error
    tokens = ApiToken.query.filter_by(user_id=user_id, revoked_at=None).order_by(ApiToken.created_at.desc()).all()
    return jsonify({'tokens': [token_json(t) for t in tokens]}), 200


@app.route('/api/tokens', methods=['POST'])
def create_token():
    # Only an interactive login session can mint tokens; an API token can't create more.
    user_id, error = authenticate_request()
    if error:
        return error
    body = request.json or {}
    name = (body.get('name') or '').strip()[:80]
    if not name:
        return api_error('"name" is required, e.g. "My assistant".', 400)
    scopes = body.get('scopes') or list(ALL_SCOPES)
    if not isinstance(scopes, list) or not scopes or any(s not in ALL_SCOPES for s in scopes):
        return api_error(f'"scopes" must be a non-empty subset of {list(ALL_SCOPES)}.', 400)
    days = body.get('expires_in_days')
    if days is not None and (isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 3650):
        return api_error('"expires_in_days" must be an integer from 1 to 3650, or null for no expiry.', 400)
    if ApiToken.query.filter_by(user_id=user_id, revoked_at=None).count() >= MAX_TOKENS_PER_USER:
        return api_error(f'You can have at most {MAX_TOKENS_PER_USER} active tokens; revoke one first.', 400)

    raw = API_TOKEN_PREFIX + secrets.token_urlsafe(32)
    now = datetime.datetime.utcnow()
    t = ApiToken(
        user_id=user_id, name=name, token_hash=hash_token(raw), prefix=raw[:10],
        scopes=' '.join(dict.fromkeys(scopes)), created_at=now,
        expires_at=now + datetime.timedelta(days=days) if days else None,
    )
    db.session.add(t)
    db.session.commit()
    # The plaintext token is only ever returned here.
    return jsonify({'token': raw, **token_json(t)}), 201


@app.route('/api/tokens/<int:token_id>', methods=['DELETE'])
def revoke_token(token_id):
    user_id, error = authenticate_request()
    if error:
        return error
    t = ApiToken.query.filter_by(id=token_id, user_id=user_id, revoked_at=None).first()
    if not t:
        return api_error('Token not found.', 404)
    t.revoked_at = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Token revoked'}), 200


# ============================================================================
# Mood tracker API (v1)
# ============================================================================

def load_mood(user_id):
    entry = UserData.query.filter_by(user_id=user_id, key=mood.MOOD_KEY).first()
    return entry, mood.parse_records(entry.content if entry else None)


def save_mood(user_id, entry, records):
    """Persist and bump the timestamp past the stored one so every device pulls the change
    on its next sync (even one whose clock runs a little ahead of the server's)."""
    ts = max(float(mood.now_ms()), (entry.timestamp if entry else 0) + 1)
    if entry is None:
        entry = UserData(user_id=user_id, key=mood.MOOD_KEY)
    entry.content = mood.dump_records(records)
    entry.timestamp = ts
    db.session.add(entry)
    db.session.commit()


@app.route('/api/v1/mood/schema', methods=['GET'])
def mood_schema():
    return jsonify(mood.SCHEMA), 200


@app.route('/api/v1/mood/logs', methods=['GET'])
def mood_list():
    user_id, error = authenticate_api('mood:read')
    if error:
        return error
    _, records = load_mood(user_id)
    try:
        logs = mood.filter_logs(mood.live_logs(records), request.args.get('start'), request.args.get('end'),
                                request.args.get('kind'))
    except mood.ValidationError as e:
        return api_error(str(e), 400)
    try:
        limit = min(max(int(request.args.get('limit', 100)), 1), 1000)
    except ValueError:
        return api_error('"limit" must be an integer.', 400)
    logs = sorted(logs, key=lambda l: l.get('ts', 0), reverse=True)
    return jsonify({'logs': [mood.public_log(l) for l in logs[:limit]], 'total': len(logs)}), 200


@app.route('/api/v1/mood/logs', methods=['POST'])
def mood_create():
    user_id, error = authenticate_api('mood:write')
    if error:
        return error
    try:
        log = mood.build_log(request.get_json(silent=True))
    except mood.ValidationError as e:
        return api_error(str(e), 400)
    entry, records = load_mood(user_id)
    replaced = None
    if log['kind'] == 'day':
        # One whole-day log per date: replace the existing one, keeping its id.
        existing = next((r for r in mood.live_logs(records) if r['kind'] == 'day' and r['date'] == log['date']), None)
        if existing:
            log['id'], log['createdAt'], replaced = existing['id'], existing.get('createdAt', log['createdAt']), existing['id']
    records = [r for r in records if r['id'] != log['id']] + [log]
    save_mood(user_id, entry, records)
    return jsonify({'log': mood.public_log(log), 'replaced_existing_day_log': bool(replaced)}), 200 if replaced else 201


@app.route('/api/v1/mood/logs/<log_id>', methods=['GET'])
def mood_get(log_id):
    user_id, error = authenticate_api('mood:read')
    if error:
        return error
    _, records = load_mood(user_id)
    log = next((r for r in mood.live_logs(records) if r['id'] == log_id), None)
    if not log:
        return api_error('Log not found.', 404)
    return jsonify({'log': mood.public_log(log)}), 200


@app.route('/api/v1/mood/logs/<log_id>', methods=['PATCH'])
def mood_update(log_id):
    user_id, error = authenticate_api('mood:write')
    if error:
        return error
    entry, records = load_mood(user_id)
    existing = next((r for r in mood.live_logs(records) if r['id'] == log_id), None)
    if not existing:
        return api_error('Log not found.', 404)
    try:
        log = mood.build_log(request.get_json(silent=True), existing=existing)
    except mood.ValidationError as e:
        return api_error(str(e), 400)
    if log['kind'] == 'day' and log['date'] != existing['date']:
        clash = next((r for r in mood.live_logs(records)
                      if r['kind'] == 'day' and r['date'] == log['date'] and r['id'] != log_id), None)
        if clash:
            return api_error(f'{log["date"]} already has a whole-day log ({clash["id"]}).', 409)
    records = [r for r in records if r['id'] != log_id] + [log]
    save_mood(user_id, entry, records)
    return jsonify({'log': mood.public_log(log)}), 200


@app.route('/api/v1/mood/logs/<log_id>', methods=['DELETE'])
def mood_delete(log_id):
    user_id, error = authenticate_api('mood:write')
    if error:
        return error
    entry, records = load_mood(user_id)
    if not any(r['id'] == log_id for r in mood.live_logs(records)):
        return api_error('Log not found.', 404)
    records = [r for r in records if r['id'] != log_id] + [mood.tombstone(log_id)]
    save_mood(user_id, entry, records)
    return jsonify({'message': 'Log deleted'}), 200


@app.route('/api/v1/mood/summary', methods=['GET'])
def mood_summary():
    user_id, error = authenticate_api('mood:read')
    if error:
        return error
    _, records = load_mood(user_id)
    try:
        logs = mood.filter_logs(mood.live_logs(records), request.args.get('start'), request.args.get('end'),
                                request.args.get('kind'))
    except mood.ValidationError as e:
        return api_error(str(e), 400)
    return jsonify({'start': request.args.get('start'), 'end': request.args.get('end'), **mood.summarize(logs)}), 200


if __name__ == '__main__':
    app.run(debug=True)
