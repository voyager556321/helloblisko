# Architecture

One installable PWA. Three roles, one codebase. Voice is an audio file plus a derived summary. The browser recording is the product; a native app is out of scope.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind
- PWA: `manifest.webmanifest`, standalone display, HTTPS
- Supabase: Postgres + Storage only. No Supabase Auth
- Speech-to-text: Groq Whisper (`whisper-large-v3`, language `pl`)
- One short LLM call to draft a one-line task and pull secrets out of the transcript

Web Speech API is not the pipeline. It is unreliable on iOS. The phone records `audio/webm` with `MediaRecorder`, uploads it, and the server transcribes. If Whisper or the LLM fails, the coordinator still has the audio and types the line.

## Roles

| Route | Who | Sees |
| --- | --- | --- |
| `/d/[token]` | Home tablet, already paired to one senior | One hold-to-talk control. No list, no map, no login |
| `/coord` | Filia coordinator | Inbox, audio, editable summary, own volunteer list |
| `/v` | Volunteer | Only jobs assigned to them |

A Linux button later is the same `POST` as the home screen, with the device token. Tonight the home screen is the PWA.

## State

```
recorded → ready → assigned → revealed → done
                 ↘ cancelled
```

- `recorded` — audio stored. Volunteers do not see the request.
- `ready` — coordinator has a one-line summary. AI may draft it. Coordinator can edit it.
- `assigned` — one volunteer chosen. They see district, time, and the summary. Not the address, PESEL, or recipe code.
- `revealed` — that volunteer opens the job and receives address, PESEL, and the 4-digit code.
- `done` — volunteer marks it issued. Secret endpoints return nothing.
- `cancelled` — the home screen cancels the latest open request. Same control, second press.

Only one volunteer is ever assigned. The list is the filia's list. Nothing in the product searches for a new volunteer.

## Data

```
filia(id, name)

senior(id, filia_id, display_name, district, address, pesel)

volunteer(id, filia_id, display_name, phone, districts text[])

device(id, senior_id, token unique)

request(
  id, senior_id, status,
  audio_path, transcript,
  summary,          -- one line the coordinator confirms
  kind,             -- pharmacy | shopping | doctor | other
  due_label,        -- free text, "jutro 10:00"
  code4,            -- nullable, never selected in list queries
  created_at
)

assignment(
  request_id unique, volunteer_id,
  assigned_at, revealed_at, done_at
)
```

`pesel` lives on `senior`. `code4` lives on `request`. List and inbox queries must not select those columns. A dedicated reveal handler reads them.

Seed one filia, two seniors, three volunteers, two device tokens. No admin UI.

## API

Device token authenticates the home screen. Coordinator and volunteer use a demo login (one shared password each), stored in an httpOnly cookie. Sessions are filia-scoped.

| Call | Effect |
| --- | --- |
| `POST /api/device/:token/requests` | multipart audio → Storage → row `recorded` → transcribe → `ready` |
| `POST /api/device/:token/cancel` | latest open request → `cancelled` |
| `GET /api/coord/requests` | inbox without `pesel` or `code4` |
| `PATCH /api/coord/requests/:id` | edit summary, kind, due label |
| `POST /api/coord/requests/:id/assign` | `{ volunteerId }` → `assigned` |
| `GET /api/v/jobs` | jobs assigned to the logged-in volunteer, no secrets |
| `POST /api/v/jobs/:id/reveal` | `revealed`, returns address, pesel, code4 once |
| `POST /api/v/jobs/:id/done` | `done` |

Polling every 2 seconds is enough. No websocket.

## Voice

1. Hold control, `MediaRecorder` starts, release stops.
2. Upload the blob. The file is the source of truth.
3. If `GROQ_API_KEY` is set, Whisper returns Polish text. No LLM. A 4-digit code is lifted from the transcript with a regex and stored on the request, not in the line the volunteer sees first.
4. Coordinator plays the audio, edits the line, and assigns a person. The demo works with no API key.

The volunteer never receives the audio file. The senior may have spoken the code.

## Demo script

1. Home PWA: hold, say «Apteka, jutro o dziesiątej».
2. Coordinator plays it, confirms the line, picks one name from the filia list.
3. Volunteer phone shows the job without the address.
4. Volunteer reveals. Address, PESEL, and code appear.
5. Volunteer marks `wydane`. The secret screen is gone.
6. Coordinator sees the closed job.

## Cut first

Push notifications, maps, multi-filia admin, volunteer signup, payments, native wrappers, GPIO button, live speech recognition.
