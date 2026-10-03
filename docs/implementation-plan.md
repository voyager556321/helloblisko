# Implementation plan

Architecture detail lives in `CLAUDE.md`. This file is the overnight cut.

## Selected idea

Closed-list errands for one MOPS filia. Home voice request, coordinator assigns one known volunteer, recipe code revealed only to that person. See `docs/vova/idea.md` and the 2026-10-03 entry in `decision-log.md`.

## Demo scope (must-have for the final demo)

- Installable PWA, three routes: home, coordinator, volunteer
- Hold-to-talk, audio stored, Polish transcript, editable one-line summary
- Assign one seeded volunteer
- Reveal address, PESEL, and 4-digit code only after that assignment
- Mark done; secrets disappear
- Cancel from the home screen
- Demo works when Whisper is down: coordinator types the line while the audio plays

## Data model additions

The earlier generic model (`User`, `Project`, `Need`, `Resource`, `Contribution`, `Impact`) is not used. Tables are `filia`, `senior`, `volunteer`, `device`, `request`, `assignment` as specified in `CLAUDE.md`.

## Feature folder(s)

- `src/app/d/[token]` — home
- `src/app/coord` — inbox and assign
- `src/app/v` — volunteer jobs
- `src/app/api/device`, `src/app/api/coord`, `src/app/api/v`
- `src/server/voice.ts` — Whisper + summary
- `src/server/requests.ts` — state transitions

## Task breakdown

| Task | Owner | Status |
| --- | --- | --- |
| Next.js app, Tailwind, PWA manifest, three empty routes | web | todo |
| Supabase schema, seed, storage bucket `requests-audio` | web | todo |
| Device upload + cancel | web | todo |
| Coordinator inbox, audio player, assign | web | todo |
| Volunteer list / reveal / done | web | todo |
| Whisper + redacting summary | web | todo |
| Home, inbox, and volunteer screens | design + web | todo |

## Cut list (dropped first if we run out of time)

- LLM summary. Coordinator types the line. Audio upload still ships.
- Pretty empty states beyond one sentence.
- Web push.
- Second filia, login screens fancier than a password field.
- Linux device. Same endpoint, not tonight.

## Demo script

1. Home PWA: hold and say «Apteka, jutro o dziesiątej. Kod 4821».
2. Coordinator hears the clip, sees the draft line without the code, picks one volunteer.
3. Volunteer sees «Apteka, jutro o dziesiątej» and the district only.
4. Volunteer reveals. Address, PESEL, and `4821` show.
5. Volunteer marks `wydane`. Refresh shows no code.
6. Coordinator sees the job closed.
