# Leatherbound Mood API

A small REST API for reading and writing mood-tracker logs, intended for AI agents and scripts.
Logs written here show up in the Leatherbound mood page on every device within one sync pass
(about 10 seconds), and logs made in the app are visible here.

Base URL: your backend, e.g. `https://leatherbound.brandonssandbox.com`. All bodies are JSON.

## Authorization

1. Log in to Leatherbound, open **Settings → Data → API Access**, and create a token.
   Choose *Read & write* or *Read only*, and an expiry (default: never).
2. Copy the token (it starts with `lb_`; it is shown only once).
3. Send it on every request:

```
Authorization: Bearer lb_...
```

Tokens don't need refreshing. They stay valid until they expire (if you set an expiry) or
you revoke them in Settings. Only a hash is stored on the server. A token can only use the
mood API. It can't sync your other notes or create more tokens.

Errors use standard status codes with a JSON body `{"error": "..."}`:
`400` invalid input, `401` missing/invalid/expired/revoked token, `403` token lacks the
needed scope (`mood:read` or `mood:write`), `404` not found, `409` conflict.

## Data model

| Field | Type | Notes |
|---|---|---|
| `id` | string | Assigned by the server. |
| `kind` | `"moment"` \| `"day"` | `moment` = how you feel at a specific time; `day` = how the whole day went. |
| `time` | ISO 8601 | `moment` only. Must include a UTC offset (`-05:00` or `Z`); the offset sets the local `date`. Defaults to now. Returned in UTC. |
| `date` | `YYYY-MM-DD` | Required for `day`. For `moment` it is derived from `time`. **One `day` log per date**; creating another replaces it. |
| `happiness` | int 1–5 | **Required.** 1 = very unhappy, 5 = very happy. |
| `contentment` | int 1–5 | **Required.** 1 = very dissatisfied, 5 = very satisfied with how the day is going/went. |
| `energy` | int 1–5 \| null | Optional. 1 = drained, 5 = energized/motivated. |
| `emotions` | string[] | Optional. Ids from the circumplex (see `/schema`): `alert excited elated happy contented serene relaxed calm fatigued lethargic depressed sad upset stressed nervous tense surprise happiness sadness disgust anger fear`. |
| `note` | string | Optional, at most 100 words. |

## Endpoints

### `GET /api/v1/mood/schema`
No auth. Returns the scales with their question wording, the emotion ids and their positions on
the circumplex, and the field rules. Useful for an agent to discover what to ask.

### `GET /api/v1/mood/logs`
Scope `mood:read`. Query: `start`, `end` (`YYYY-MM-DD`, inclusive), `kind`, `limit` (default 100, max 1000).
Newest first.

```json
{"logs": [{"id": "9f2c...", "kind": "moment", "date": "2026-11-06", "time": "2026-11-07T03:30:00Z",
           "happiness": 4, "contentment": 5, "energy": 2, "emotions": ["relaxed"], "note": "Quiet evening.",
           "created_at_ms": 1794022200000, "updated_at_ms": 1794022200000}],
 "total": 1}
```

### `POST /api/v1/mood/logs`
Scope `mood:write`. Creates a log and returns `201` with `{"log": ...}`. For a `day` log on a date that already
has one, it replaces that log (same `id`) and returns `200` with `"replaced_existing_day_log": true`.

```bash
curl -X POST "$BASE/api/v1/mood/logs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"kind": "moment", "time": "2026-11-06T22:30:00-05:00", "happiness": 4, "contentment": 5,
       "energy": 2, "emotions": ["relaxed", "calm"], "note": "Quiet evening."}'

curl -X POST "$BASE/api/v1/mood/logs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"kind": "day", "date": "2026-11-06", "happiness": 3, "contentment": 4}'
```

If a `moment` log omits `time`, it is logged as now. Pass `"utc_offset": "-05:00"` so it lands on the
right local date (UTC otherwise).

### `GET /api/v1/mood/logs/<id>`
Scope `mood:read`. Returns `{"log": ...}`.

### `PATCH /api/v1/mood/logs/<id>`
Scope `mood:write`. Send only the fields to change; `kind` can't change. Returns `{"log": ...}`.

### `DELETE /api/v1/mood/logs/<id>`
Scope `mood:write`.

### `GET /api/v1/mood/summary`
Scope `mood:read`. Query: `start`, `end`, `kind`. Each day counts once: its whole-day log if
it has one, otherwise the average of that day's moment logs (the same as the app's "All logs" view).

```json
{"start": "2026-11-01", "end": "2026-11-07", "logs": 12, "days_logged": 5,
 "averages": {"happiness": 3.4, "contentment": 3.6, "energy": 2.9},
 "top_emotions": [{"emotion": "contented", "count": 4}],
 "daily": [{"date": "2026-11-02", "happiness": 3.0, "contentment": 3.5, "energy": 3.0, "logs": 3}]}
```

## Managing tokens programmatically

These endpoints need the normal login session (the JWT from `POST /api/login`), not an API token:

- `GET /api/tokens`: list active tokens (never includes the secret).
- `POST /api/tokens` with `{"name": "My assistant", "scopes": ["mood:read", "mood:write"], "expires_in_days": null}`:
  create a token. `expires_in_days` is 1–3650, or `null` for no expiry. The response includes `token` once.
- `DELETE /api/tokens/<id>`: revoke a token.

## Suggested agent instructions

> You can log the user's mood with the Leatherbound API. Before logging, ask how happy they are (1–5)
> and how content they are with how the day is going (1–5); optionally ask for energy (1–5), which
> emotions fit (from `/api/v1/mood/schema`), and a short note. Use `kind: "moment"` with the current
> time and the user's UTC offset for check-ins, or `kind: "day"` with the date for end-of-day reflections.
