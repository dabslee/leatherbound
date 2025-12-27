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
