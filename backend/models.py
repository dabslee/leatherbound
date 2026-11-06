from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    data = db.relationship('UserData', backref='user', lazy=True)

class UserData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    key = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=True) # JSON string or HTML string
    timestamp = db.Column(db.Float, nullable=False, default=0.0)

    __table_args__ = (db.UniqueConstraint('user_id', 'key', name='_user_key_uc'),)

class ApiToken(db.Model):
    """Long-lived personal access token for programmatic clients (e.g. an AI agent).

    Only a SHA-256 hash of the secret is stored; the plaintext is shown once at creation.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    prefix = db.Column(db.String(16), nullable=False)       # first chars, to help identify a token
    scopes = db.Column(db.String(200), nullable=False)       # space-separated, e.g. "mood:read mood:write"
    created_at = db.Column(db.DateTime, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)       # None = never expires
    last_used_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
