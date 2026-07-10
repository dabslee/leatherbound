import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, UserData
import time
import jwt
import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///leatherbound.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
CORS(app) # Allow CORS for all domains for now, or specify origin
db.init_app(app)

with app.app_context():
    db.create_all()

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

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

    return jsonify({'updates': updates}), 200

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

if __name__ == '__main__':
    app.run(debug=True)
