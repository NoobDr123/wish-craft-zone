# PawprintSong Public API — for Manus

Two endpoints. Both auth with the same bearer token.

**Base URL:** `https://ribbonsong.com`
**Auth header (every request):** `Authorization: Bearer <MANUS_API_KEY>`

---

## 1. Trigger a song generation

`POST /api/public/songs/generate`

### Request body (JSON)

| Field | Type | Required | Notes |
|---|---|---|---|
| `buyerEmail` | string (email) | yes | Where the song will be sent |
| `buyerName` | string | no | |
| `dogName` | string | yes | Used throughout the lyrics |
| `dogGender` | `"she" \| "he" \| "they"` | no | Default `"she"` |
| `dogBreed` | string | no | e.g. `"Golden Retriever"` |
| `personality` | string | yes | What she was like (free text) |
| `memory` | string | yes | A favorite memory |
| `message` | string | yes | A letter / message to the dog |
| `genre` | `"acoustic" \| "country" \| "folk" \| "lullaby" \| "cinematic" \| "instrumental"` | no | Default `"acoustic"` |
| `voice` | `"female" \| "male"` | no | Default `"female"` |
| `hasExtraVerse` | boolean | no | Adds bridge + extra verse |
| `isRush` | boolean | no | 24h delivery |
| `hasUnlimitedEdits` | boolean | no | |
| `photoUrl` | string (url) | no | Reference photo of the dog |
| `songTitleIdea` | string | no | |
| `externalRef` | string | no | Your own id, stored on the order |

### Response 200

```json
{
  "ok": true,
  "orderId": "9f3c...",
  "status": "upsells_complete",
  "statusUrl": "/api/public/songs/status?orderId=9f3c..."
}
```

### Errors

| Status | When |
|---|---|
| `400` | Invalid JSON or schema (response includes `issues[]`) |
| `401` | Missing or wrong bearer token |
| `500` | Server / database error |

### Example

```bash
curl -X POST https://ribbonsong.com/api/public/songs/generate \
  -H "Authorization: Bearer $MANUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerEmail": "client@example.com",
    "dogName": "Pippa",
    "dogGender": "she",
    "dogBreed": "Cavalier King Charles",
    "personality": "Gentle, loved sunbeams, always greeted everyone at the door",
    "memory": "Our last walk on the beach at sunset, she ran like a puppy again",
    "message": "I miss you every single day. Thank you for choosing me",
    "genre": "acoustic",
    "voice": "female",
    "hasExtraVerse": false,
    "externalRef": "manus-job-123"
  }'
```

---

## 2. Poll status

`GET /api/public/songs/status?orderId=<id>`

### Response 200

```json
{
  "orderId": "9f3c...",
  "status": "music_generating",
  "progress": 65,
  "dogName": "Pippa",
  "songUrl": null,
  "coverImageUrl": null,
  "lyrics": null,
  "title": null,
  "shareSlug": null,
  "deliveredAt": null,
  "estimatedDelivery": "2026-05-11T12:00:00Z",
  "kieTaskId": "task_abc",
  "flagged": false,
  "flagReason": null
}
```

### Status values + approx progress

| `status` | `progress` |
|---|---|
| `received` / `pending_payment` | 5 |
| `upsells_complete` | 15 |
| `brief_generating` | 30 |
| `brief_ready` | 45 |
| `music_generating` | 65 |
| `music_ready` | 85 |
| `ready_to_deliver` | 95 |
| `delivered` | 100 |
| `failed` | 0 |

When `status === "delivered"`, `songUrl`, `coverImageUrl`, `lyrics`, `title`, and `shareSlug` are populated.

### Polling guidance

Poll every 30s. Standard delivery completes in ~5 days; rush in ~24h. Stop polling once `status === "delivered"` or `"failed"`.

---

## How it works internally

1. We insert an order with `status = upsells_complete` and `payment_status = paid` (you handle billing on your side).
2. A DB trigger enqueues lyric generation (Claude writes the brief, scores it, retries up to 3x).
3. Lyrics are submitted to KIE / Suno for music generation.
4. KIE webhook fires back, audio is downloaded, QC'd, and the order moves to `delivered`.
5. The customer gets a delivery email with the private listening link.

You don't have to do anything between steps 1 and 5 — just poll status (or wait for the delivery email).

---

## Rate limits & retries

- No hard rate limit currently. Be reasonable (< 60 req/min).
- If you get a `5xx`, retry with exponential backoff (1s, 2s, 4s, ...) up to 3 times.
- Idempotency: if you need it, send a unique `externalRef` and de-dupe on your side. The API will create a new order on every call.
