# Decision log

Record each decision point here as we narrow down from candidates to the final idea. Append new
entries — don't overwrite previous ones, so we can see how our thinking evolved if we need to
pivot.

---

## 2026-10-03 — Home request is a voice recording inside one PWA

**Decision**: Ship one Next.js PWA with three routes (home, coordinator, volunteer). The person at home holds one control and speaks. Audio is uploaded and transcribed (Groq Whisper, Polish). An LLM drafts a one-line task and lifts a spoken recipe code out of the text the volunteer will see. The coordinator confirms the line and assigns one volunteer already on the filia list. Secrets (address, PESEL, 4-digit code) are returned only from the reveal call, to that volunteer, until the job is marked done.

**Options considered**: native phone app; three physical category buttons; Web Speech API in the browser; open map of nearby volunteers.

**Why this one**: A native app does not fit the remaining time. A PWA installs on the home tablet and on both phones from one codebase. Recording a file works on iOS; live browser speech recognition does not. The closed list is the trust model.

**What we're explicitly not doing, and why**: Recruiting volunteers, a shared city-wide database, charging the senior, and treating transcription as required for the demo. If the model fails, the coordinator still has the audio.

**Reversible?**: yes — the home client and a later Linux button share `POST /api/device/:token/requests`.

## Template — copy for a new decision

```
## <date> — <what was decided>

**Decision**:

**Options considered**: (link back to entries in ideas.md)

**Why this one**:

**What we're explicitly not doing, and why**:

**Reversible?**: yes/no — how costly would it be to pivot away from this later
```