# HackYeah 2026 — available challenges (research summary)

Compiled from web research on 2026-10-03. The official live task page
(`hackyeah.pl/tasks-prizes`) renders client-side and couldn't be fetched directly, so everything
below comes from partner/press announcements and participant repos — treat exact figures as
indicative, not authoritative, and verify against the on-site task boards if anything here
matters for a final decision.

## Event logistics

- **Dates**: October 3–4, 2026 (12th edition) — we are inside the event window as of this doc.
- **Location/format**: TAURON Arena, Kraków, in-person. Billed as Europe's largest stationary
  hackathon.
- **Schedule**: coding starts Sat 11:00, ends Sun 11:00 (24h). Finalists announced Sun 15:00,
  winners/closing 17:45.
- **Team size**: up to 6 people.
- **Submission**: via ChallengeRocket.
- **Prize pool**: conflicting totals across sources (25k / 50k / ~241k PLN) — not reliable, ignore
  the aggregate and look at per-track figures below instead.

## Open (organizer-set) tracks

| Track | Summary | Prize |
| --- | --- | --- |
| Defence | Earlier threat detection, reduced impact, protecting users/data/systems | 8,000 PLN |
| Sport & Healthcare | Tools combining sport, wellbeing, and healthcare data access | 8,000 PLN |
| Artificial Intelligence | Practical AI applications for real-world problems | 8,000 PLN |
| Smart City | Mobility, resource management, citizen communication, crisis response | 8,000 PLN |
| ImpactHer | First SheHacks track — real problems/needs, especially for women | 8,000 PLN |

## Partner tasks

### HubMI.pl — matches our "HubMI" candidate

> "Jak sprawić, by dobre pomysły na rozwiązywanie problemów społecznych nie pozostawały
> niezauważone?" — How to make sure good ideas for solving social problems don't go unnoticed.

Connect residents' ideas for solving local/social problems with existing knowledge, proven
solutions, and the right official channel to act on them — a local initiative, participatory
budget, district council, micro-grant, NGO, or city service report — including help drafting the
actual application.

- Prize: 15,000 PLN
- Sponsoring org beyond the "HubMI.pl" name: unconfirmed. One unaffiliated fan page hints at a
  link to Województwo Małopolskie (the regional government, a known recurring HackYeah host-side
  partner), but this is unverified — treat as a lead, not a fact.
- **No connection found to ReFi / quadratic funding / blockchain.** The brief is a plain civic-tech
  routing problem. A QF/ReFi angle (e.g. framing "which ideas get funded" as a quadratic-funding
  allocation problem) would be our own design choice layered on top, not something the brief asks
  for.
- Reference: a live participant repo building a Next.js + FastAPI app for this exact track —
  [github.com/ofideveloper/hackyeah-2026-hubmi](https://github.com/ofideveloper/hackyeah-2026-hubmi)

### Cracow without barriers — matches our "accessibility" candidate

Design a tool assessing physical accessibility of urban routes/places (stairs, thresholds, ramps,
elevators, entrance width, surface type, restroom availability, rest areas) for people with varied
needs.

- Prize: 5,000 PLN for best prototype
- Judging emphasis: usefulness over feature count; every data point must show its source, last
  update date, and a reliability/trust indicator; bonus for reusability beyond Kraków (other
  cities, hotels, event venues).
- Can draw on open data, OpenStreetMap, property-owner data, and user reports.

### Finance Without Intermediaries — matches our "funding/ReFi" candidate

Build an application using blockchain smart contracts enabling transactions between parties
without intermediaries, relying on on-chain trust/reputation mechanisms instead of traditional
institutions.

- Prize: 11,300 PLN
- Sponsoring organization: unconfirmed in any source found.

### Smart City (open track) — matches our "smart city" candidate

See the open-tracks table above; no separate partner brief found beyond the organizer-set summary.

### AI Control Layer

Configurable control/governance layer for interactions between applications, AI agents, models,
MCP servers, tools, and data — pre-execution policy enforcement (allow/deny/require-human), scoped
ephemeral agent identities instead of shared API keys, a mid-action kill-switch, tamper-evident
(hash-chained) audit receipts.

- Prize: 15,000 PLN
- Attributed to Goldman Sachs only via a participant's own repo title, not an official page —
  unconfirmed.

### IMAGINE WHAT'S NEXT (Huawei)

- Tech constraint: must build on HarmonyOS / OpenHarmony.
- Prize: 25,000 PLN — the largest single partner-task prize found.

### REENTRY CTF

Story-driven cybersecurity CTF: web security, cryptography, reverse engineering, pwn, forensics,
real hardware, AI-themed challenges.

- Prize: 5,000 PLN + 5 IDA Pro licenses.
- Sponsoring partner unconfirmed (a claim that HubMI.pl sponsors this could not be verified —
  disregard it).

## Mapping back to our candidates (see `ideas.md`)

| Our candidate | Matching real track |
| --- | --- |
| HubMI | HubMI.pl partner task |
| Accessibility | Cracow without barriers |
| Smart city | Open Smart City track |
| Funding / ReFi | Finance Without Intermediaries |

All four of our brainstormed domains have a real, live 2026 challenge behind them — worth
reconciling `ideas.md` against the actual briefs above before we commit to one.
