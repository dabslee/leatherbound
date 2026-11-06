"""Tests for API tokens, the mood API, and mood merging during sync.

Run from the backend folder:  python -m unittest test_api
"""
import json
import os
import unittest

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ.setdefault('FLASK_SECRET_KEY', 'test-secret-key-that-is-long-enough-for-hs256')

from app import app, db  # noqa: E402
import mood  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        with app.app_context():
            db.drop_all()
            db.create_all()
        self.client.post('/api/register', json={'username': 'brandon', 'password': 'pw'})
        res = self.client.post('/api/login', json={'username': 'brandon', 'password': 'pw'})
        self.session = res.get_json()['token']

    def auth(self, token):
        return {'Authorization': f'Bearer {token}'}

    def make_token(self, **body):
        body.setdefault('name', 'agent')
        res = self.client.post('/api/tokens', json=body, headers=self.auth(self.session))
        self.assertEqual(res.status_code, 201, res.get_data(as_text=True))
        return res.get_json()

    # ---------------------------------------------------------------- tokens

    def test_token_lifecycle(self):
        created = self.make_token()
        self.assertTrue(created['token'].startswith('lb_'))
        self.assertIsNone(created['expires_at'])

        listed = self.client.get('/api/tokens', headers=self.auth(self.session)).get_json()['tokens']
        self.assertEqual(len(listed), 1)
        self.assertNotIn('token', listed[0])

        tok = created['token']
        self.assertEqual(self.client.get('/api/v1/mood/logs', headers=self.auth(tok)).status_code, 200)
        self.assertIsNotNone(self.client.get('/api/tokens', headers=self.auth(self.session)).get_json()['tokens'][0]['last_used_at'])

        self.assertEqual(self.client.delete(f'/api/tokens/{created["id"]}', headers=self.auth(self.session)).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/mood/logs', headers=self.auth(tok)).status_code, 401)

    def test_api_token_cannot_mint_tokens(self):
        tok = self.make_token()['token']
        res = self.client.post('/api/tokens', json={'name': 'x'}, headers=self.auth(tok))
        self.assertEqual(res.status_code, 401)

    def test_read_only_scope(self):
        tok = self.make_token(scopes=['mood:read'])['token']
        res = self.client.post('/api/v1/mood/logs', json={'happiness': 3, 'contentment': 3}, headers=self.auth(tok))
        self.assertEqual(res.status_code, 403)

    def test_expired_token(self):
        created = self.make_token(expires_in_days=1)
        from models import ApiToken
        import datetime
        with app.app_context():
            t = db.session.get(ApiToken, created['id'])
            t.expires_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=1)
            db.session.commit()
        self.assertEqual(self.client.get('/api/v1/mood/logs', headers=self.auth(created['token'])).status_code, 401)

    def test_bad_token(self):
        self.assertEqual(self.client.get('/api/v1/mood/logs', headers=self.auth('lb_nope')).status_code, 401)
        self.assertEqual(self.client.get('/api/v1/mood/logs').status_code, 401)

    # ---------------------------------------------------------------- mood API

    def test_create_list_update_delete(self):
        h = self.auth(self.make_token()['token'])
        res = self.client.post('/api/v1/mood/logs', headers=h, json={
            'kind': 'moment', 'time': '2026-11-06T22:30:00-05:00', 'happiness': 4, 'contentment': 5,
            'energy': 2, 'emotions': ['relaxed', 'calm'], 'note': 'Quiet evening.'})
        self.assertEqual(res.status_code, 201, res.get_data(as_text=True))
        log = res.get_json()['log']
        self.assertEqual(log['date'], '2026-11-06')  # local date, not the UTC date (Nov 7)

        logs = self.client.get('/api/v1/mood/logs?start=2026-11-01&end=2026-11-30', headers=h).get_json()
        self.assertEqual(logs['total'], 1)

        res = self.client.patch(f'/api/v1/mood/logs/{log["id"]}', headers=h, json={'happiness': 2})
        self.assertEqual(res.get_json()['log']['happiness'], 2)
        self.assertEqual(res.get_json()['log']['contentment'], 5)

        self.assertEqual(self.client.delete(f'/api/v1/mood/logs/{log["id"]}', headers=h).status_code, 200)
        self.assertEqual(self.client.get(f'/api/v1/mood/logs/{log["id"]}', headers=h).status_code, 404)

    def test_session_token_also_works(self):
        res = self.client.post('/api/v1/mood/logs', headers=self.auth(self.session),
                               json={'happiness': 3, 'contentment': 3})
        self.assertEqual(res.status_code, 201)

    def test_validation(self):
        h = self.auth(self.make_token()['token'])
        bad = [
            {'contentment': 3},
            {'happiness': 6, 'contentment': 3},
            {'happiness': 3, 'contentment': 3, 'emotions': ['ecstatic']},
            {'happiness': 3, 'contentment': 3, 'note': 'word ' * 101},
            {'happiness': 3, 'contentment': 3, 'time': '2026-11-06T10:00:00'},
            {'kind': 'day', 'happiness': 3, 'contentment': 3},
        ]
        for body in bad:
            self.assertEqual(self.client.post('/api/v1/mood/logs', headers=h, json=body).status_code, 400, body)

    def test_one_day_log_per_date(self):
        h = self.auth(self.make_token()['token'])
        first = self.client.post('/api/v1/mood/logs', headers=h,
                                 json={'kind': 'day', 'date': '2026-11-05', 'happiness': 2, 'contentment': 2}).get_json()
        res = self.client.post('/api/v1/mood/logs', headers=h,
                               json={'kind': 'day', 'date': '2026-11-05', 'happiness': 5, 'contentment': 4})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()['replaced_existing_day_log'])
        self.assertEqual(res.get_json()['log']['id'], first['log']['id'])
        self.assertEqual(self.client.get('/api/v1/mood/logs?kind=day', headers=h).get_json()['total'], 1)

    def test_summary(self):
        h = self.auth(self.make_token()['token'])
        for t, hap in (('2026-11-02T09:00:00Z', 2), ('2026-11-02T18:00:00Z', 4), ('2026-11-03T09:00:00Z', 5)):
            self.client.post('/api/v1/mood/logs', headers=h,
                             json={'time': t, 'happiness': hap, 'contentment': 3, 'emotions': ['happy']})
        s = self.client.get('/api/v1/mood/summary?start=2026-11-01&end=2026-11-07', headers=h).get_json()
        self.assertEqual(s['days_logged'], 2)
        self.assertEqual(s['averages']['happiness'], 4.0)  # mean of daily means (3 and 5)
        self.assertEqual(s['top_emotions'][0], {'emotion': 'happy', 'count': 3})

    def test_schema_is_public(self):
        res = self.client.get('/api/v1/mood/schema')
        self.assertEqual(res.status_code, 200)
        self.assertIn('excited', [e['id'] for e in res.get_json()['emotions']])

    # ---------------------------------------------------------------- sync merging

    def test_sync_merges_api_and_device_logs(self):
        h = self.auth(self.make_token()['token'])
        api_log = self.client.post('/api/v1/mood/logs', headers=h,
                                   json={'time': '2026-11-06T12:00:00Z', 'happiness': 4, 'contentment': 4}).get_json()['log']

        # A device that hasn't pulled the API log yet pushes its own copy with a newer timestamp.
        device_log = {'id': 'dev1', 'kind': 'moment', 'date': '2026-11-06', 'ts': 1, 'happiness': 2,
                      'contentment': 2, 'energy': None, 'emotions': [], 'note': '', 'updatedAt': 5}
        res = self.client.post('/api/sync', headers=self.auth(self.session), json={'data': {
            'mood': {'timestamp': 10 ** 13, 'content': json.dumps([device_log])}}})
        update = res.get_json()['updates']['mood']
        ids = {r['id'] for r in json.loads(update['content'])}
        self.assertEqual(ids, {api_log['id'], 'dev1'})

        # Deleting on the device (tombstone) removes the log for the API too.
        tomb = {'id': api_log['id'], 'deleted': True, 'updatedAt': 10 ** 13}
        self.client.post('/api/sync', headers=self.auth(self.session), json={'data': {
            'mood': {'timestamp': 10 ** 13 + 1, 'content': json.dumps([device_log, tomb])}}})
        self.assertEqual(self.client.get('/api/v1/mood/logs', headers=h).get_json()['total'], 1)


class MergeTestCase(unittest.TestCase):
    def test_newer_wins_and_one_day_log_per_date(self):
        a = [{'id': 'x', 'kind': 'day', 'date': '2026-11-01', 'happiness': 1, 'contentment': 1, 'updatedAt': 1}]
        b = [{'id': 'y', 'kind': 'day', 'date': '2026-11-01', 'happiness': 5, 'contentment': 5, 'updatedAt': 2}]
        merged = {r['id']: r for r in mood.merge_records(a, b)}
        self.assertTrue(merged['x'].get('deleted'))
        self.assertEqual(merged['y']['happiness'], 5)


if __name__ == '__main__':
    unittest.main()
