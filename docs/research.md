# cmux-web — Research & Findings

> Status: draft · Last updated: 2026-07-21 · Author: k@ko.wal.ski
> Companion to [`PRD.md`](./PRD.md). This doc captures *what we learned*; the PRD captures *what we're building*.

## 1. Goal in one line

Run a small web app on the Mac that mirrors what cmux shows — workspace groups, workspaces, live terminal output — and lets us **nudge agents, type input, and answer "needs input" questions** from a phone browser, reached over Tailscale.

## 2. Context / motivation

- The operator runs **~30 agents (Claude Code / Codex / etc.) as cmux workspaces** on a single Mac, organised into collapsible **workspace groups** (observed: `Personal`, `Dice AI`, `Skylark`, `Observability`).
- The sidebar is the value: each workspace shows a title, a preview line (last agent/user message), a **status** (`Idle` / `Running` / `Needs input`), a git branch, a working directory, and a colour tag.
- The recurring need on a phone is: *which of my 30 agents is blocked on me right now, and let me unblock it* — plus occasionally read the terminal and nudge.
- cmux is a **native macOS app** (Ghostty-based); it has no built-in browser front-end. So we either mirror the Mac screen (rejected, see §5) or build a thin web client on cmux's control API (chosen).

## 3. cmux at a glance (verified on this machine)

| Fact | Value |
|---|---|
| Version | `cmux 0.64.20 (100)` |
| Binary | `/opt/homebrew/bin/cmux` |
| Control model | "control cmux via Unix socket" — CLI is a thin wrapper over a JSON socket |
| Socket path (this machine) | `CMUX_SOCKET_PATH=/Users/kristof/.local/state/cmux/cmux-501.sock` |
| Socket path (default docs) | `/tmp/cmux.sock` (release) / `/tmp/cmux-debug.sock` (debug) — **overridden here**, so always resolve via `CMUX_SOCKET_PATH` |
| Current access mode | `access_mode: "cmuxOnly"` → **external automation is NOT enabled yet** (see §7) |

## 4. The cmux control surface (the core finding)

The whole project hinges on cmux's socket API being rich enough. **It is.** `cmux capabilities` lists the full v2 method catalog. Two ways to call it:

- **CLI wrappers** — e.g. `cmux read-screen`, `cmux send`, `cmux send-key`, `cmux workspace list --json`, `cmux events`.
- **Raw RPC** — `cmux rpc <method> '<json-params>'` (e.g. `cmux rpc surface.read_text '{"surface_id":"..."}'`). Same transport; use this for methods without a friendly wrapper.
- **JSON framing** — one newline-terminated JSON object per request: `{"id":"req-1","method":"workspace.list","params":{}}`. Targets accept a UUID, a short ref (`workspace:2`, `surface:4`), or an index.

### 4.1 Methods that map to our features

| Our feature | cmux method(s) | Notes |
|---|---|---|
| List groups (the sidebar folders) | `workspace.group.list` | Also `.create/.rename/.collapse/.expand/.set_color/.set_icon/.move/.pin` |
| List workspaces (sessions) | `workspace.list` (CLI: `cmux workspace list --json`) | Rich object; see §4.4 |
| Select / focus a workspace | `workspace.select`, `workspace.focus`, `workspace.next/.previous/.last` | Drives which session is shown |
| **Read live terminal text** | `surface.read_text` (CLI: `cmux read-screen`) | Plain text; `--scrollback`, `--lines <n>`, `--surface`, `--workspace` |
| List panes/surfaces in a workspace | `surface.list`, `pane.list`, `pane.surfaces` | A workspace has ≥1 pane; a pane hosts surfaces (terminals/browser) |
| **Nudge / type into a terminal** | `surface.send_text`, `surface.send_key`, `terminal.input` | Keys: `enter, tab, escape, backspace, delete, up, down, left, right` |
| **Submit a prompt to the agent** | `workspace.prompt_submit` | Types into the agent prompt box + submits (higher-level than raw send) |
| **Answer "needs input" questions** | `feed.question.reply` | The feed is the agent Q&A channel |
| **Approve/deny permission prompts** | `feed.permission.reply` | e.g. Claude Code tool-permission prompts |
| **Reply to plan mode** | `feed.exit_plan.reply` | Accept/reject a proposed plan |
| Read the pending question/permission list | `feed.list`, `feed.jump`, `feed.push` | Source of truth for the `Needs input` state |
| Unread / notification pager | `notification.list`, `.mark_read`, `.jump_to_unread`, `.dismiss`, `.create*` | Drives badges + push |
| **Live push updates** | `cmux events` (NDJSON stream) | See §4.2 — avoids polling |
| Mobile-oriented shortcuts (used by iOS app) | `mobile.workspace.list`, `mobile.terminal.input`, `mobile.host.status` | Pre-shaped for a mobile client — worth reusing |
| Diffs (nice-to-have) | `cmux diff [--staged|--branch|--last-turn]` | Could render per-workspace changes |
| Windows | `window.list`, `window.current`, `window.displays` | Multi-window setups |

### 4.2 The events stream (`cmux events`)

Our live-update backbone. Newline-delimited JSON, reconnectable, replayable:

- Filters: `--category <name>` (e.g. `notification`), `--name <event>` (e.g. `feed.item.received`), both repeatable.
- Resume: `--after <seq>` or `--cursor-file <path>`; `--reconnect` reconnects forever and resumes from last seq.
- First frame is an `ack`; resume metadata includes `after_seq`, `oldest_seq`, `latest_seq`, `next_seq`, `gap`.
- Every frame carries a monotonic `seq` and a stable `id` (dedupe on `id`).
- **Limits:** bounded to **4,096 replay events**; individual frames capped at **16 KiB**. (Implication: terminal *bulk* text comes from `surface.read_text`, not events — events signal *that* something changed, then we pull.)

### 4.3 Reading the terminal — `read-screen` / `surface.read_text`

```
cmux read-screen [--workspace <ref>] [--surface <ref>] [--scrollback] [--lines <n>]
```
Returns the surface's terminal text as plain text. `--lines <n>` implies `--scrollback`. This is the confirmed primitive that makes a **true terminal mirror** possible (not just a pager). Output is post-rendered text — ANSI styling/cursor state is *not* guaranteed, so the client renders it into a terminal view (xterm.js) and we treat updates as snapshots/diffs. Confirming exactly how much styling survives is an M0 spike item (see PRD §15).

### 4.4 Observed workspace object shape (`workspace.list`)

Fields seen on this machine (abbreviated):

```jsonc
{
  "ref": "workspace:28",
  "index": 1,
  "selected": true,
  "title": "⠐ View cmux app on phone via web browser",   // may embed a spinner/status glyph
  "custom_title": null,
  "has_custom_title": false,
  "custom_color": "#C0392B",                              // the coloured bar in the sidebar
  "current_directory": "/Users/kristof/Code/...",
  "description": null,
  "pinned": false,
  "latest_conversation_message": "Create the finds as a doc ...",  // the preview line
  "latest_submitted_message": "Create the finds as a doc ...",
  "latest_submitted_at": "2026-07-20T13:59:28.456Z",
  "listening_ports": [],
  "remote": { "enabled": false, "state": "disconnected", "daemon": {"state": "unavailable"}, "heartbeat": {...}, "proxy": {...}, "forwarded_ports": [] }
}
```

Notes:
- The **status** (`Idle`/`Running`/`Needs input`) shown in the sidebar is *derived*, not a single field. **Confirmed (2026-07-21):** `Needs input` maps directly to a `notification.list` entry for that workspace with `subtitle: "Waiting"` / `body: "Claude is waiting for your input"` (see §4.5); unread = `is_read == false`. `Running` = agent active (spinner glyph in `title`/`tab_title`, e.g. `✳`/`⠐`); `Idle` = otherwise.
- **Group membership** is authoritative via `workspace.group.list`, which returns each group's **ordered `member_workspace_refs`** (and `member_workspace_ids`). Join is group→members; the workspace object itself does not carry a `group_id`. See §4.5.
- `remote.*` describes SSH-backed workspaces (cmux can attach agents on remote hosts). Local workspaces show `enabled:false`.

### 4.5 Verified live shapes (2026-07-21, full socket access)

`cmux ping` → `PONG` (auth confirmed). Real payloads from this machine:

**`workspace.group.list`** → `{ groups: [...] }`, each group:
```jsonc
{
  "id": "BE296F3D-...", "ref": "workspace_group:6", "name": "Personal",
  "custom_color": null, "icon_symbol": null,
  "is_collapsed": false, "is_pinned": false,
  "member_count": 4,
  "member_workspace_refs": ["workspace:26","workspace:28","workspace:30","workspace:27"],  // ordered
  "member_workspace_ids":  ["D7AD755D-...", "..."],
  "anchor_workspace_ref": "workspace:26", "anchor_workspace_id": "D7AD755D-..."
}
```
Observed groups match the screenshot: `Personal` (4), `Dice AI` (4), `Skylark` (5), `Observability` (…).

**`notification.list`** → `{ notifications: [...] }`, each:
```jsonc
{
  "id": "06EFE8C0-...", "title": "Claude Code",
  "subtitle": "Waiting", "body": "Claude is waiting for your input",   // ← THE "Needs input" signal
  "is_read": true,
  "tab_title": "✳ skylark-marketing-site",
  "workspace_ref": "workspace:16", "workspace_id": "4DB4F17D-...",
  "surface_ref": "surface:19", "surface_id": "405173CC-...",
  "created_at": "2026-07-20T13:33:48Z"
}
```
These three "Waiting" notifications correspond exactly to the `Needs input` workspaces in the reference screenshot (skylark-marketing-site, Align Makefile iOS, Review PR for OpenTelemetry). **This is the primary status source.**

**`feed.list`** → `{ items: [...] }` — the agent activity/Q&A stream. Sample items were `kind:"toolUse"`, `source:"claude"`, `status:"telemetry"` with `title`, `tool_name`, `tool_input`, `cwd`, `workstream_id`, `created_at`/`updated_at`, `id`. Interactive items (the ones we reply to) are distinguished by `kind`/`status` and are answered via `feed.question.reply` / `feed.permission.reply` / `feed.exit_plan.reply` targeting the item `id`. **Still to capture: a live question/permission item's exact shape** (none pending at capture time — all were `telemetry`).

## 5. Alternatives considered (and why we build)

| Approach | Verdict | Why |
|---|---|---|
| **macOS Screen Sharing / VNC** (noVNC, Guacamole, Chrome Remote Desktop) | Rejected as primary | Built-in VNC stitches **all monitors into one canvas** — painful on a phone; per-monitor selection needs Jump Desktop / RealVNC Server. Pixels, not structure. |
| **SSH + tmux / ttyd** | Rejected | Doesn't scale to ~30 sessions on a phone; loses the group/status/needs-input triage layer that is the whole point. |
| **cmux official iOS app** (Mobile Connect → TestFlight "cmux BETA") | Recommended in parallel | First-party: pairs the phone, shows workspaces/terminals, forwards notifications (`Hide content` option), P2P over Tailscale/WireGuard (cmux does not relay traffic). **But** it's a native app, not a web page, and it's beta. Great fallback / benchmark for UX. |
| **amux** (separate multiplexer with a built-in web dashboard + REST API) | Rejected | Would mean migrating off cmux; different tool. |
| **Build web client on the cmux socket API** (this project) | **Chosen** | Feasibility now confirmed: `read-screen`, `send_text/key`, `feed.*.reply`, `prompt_submit`, `events`, `workspace.group.list` all exist. Gives a structured, responsive, browser-native mirror of exactly the cmux model. |

## 6. Deployment model

Per the operator: **run the app on the Mac, reach it over Tailscale addresses.** No public exposure.

- The web server binds locally (or to the tailnet interface) and is reached at the Mac's Tailscale IP / MagicDNS name (e.g. `http://mac.tailnet-name.ts.net:PORT`).
- Prefer **`tailscale serve`** to get HTTPS + a stable hostname (needed for PWA install, secure cookies, clipboard, service workers on iOS).
- The app talks to the cmux Unix socket **locally on the Mac** — the socket is never exposed to the network; only the HTTP(S) app is, and only on the tailnet.

## 7. Security notes / prerequisites

- **Enable external socket access.** Current `access_mode` is `cmuxOnly`, so the socket only accepts cmux's own calls. External automation (our server) must be enabled in cmux Settings (`cmux settings open`, and `cmux docs api` / `cmux docs settings` for the toggle). This is the first setup step — the app can't do anything until it's on.
- **Socket password.** cmux socket auth precedence: `--password` → `CMUX_SOCKET_PASSWORD` → password saved in Settings. Our server reads the password from env; if `CMUX_SOCKET_PASSWORD` and `--password` are both set and differ, the CLI refuses to run.
- **Tailnet-only.** Bind to the tailnet; never `0.0.0.0` on a public interface. Add an app-level auth gate (see PRD §11) in addition to Tailscale ACLs.
- **Sensitive terminal content.** Terminal text can contain secrets. Mirror the iOS app's **"hide content"** idea for notifications/previews, and require auth before any `read_text` is served.

## 8. Open questions (tracked in PRD §15)

1. ~~Exact derivation of the `Needs input` / `Running` / `Idle` status.~~ **Resolved (§4.5):** `Needs input` = `notification.list` "Waiting" entry; unread = `!is_read`; `Running` = activity glyph; else `Idle`.
2. ~~Group↔workspace join key.~~ **Resolved (§4.5):** groups return ordered `member_workspace_refs`.
3. How much ANSI/colour survives `read_text` (affects terminal rendering fidelity).
4. Best live-terminal strategy: `events` signal + `read_text` pull, vs a PTY bridge (`workspace.remote.pty_*` exists but is remote-oriented).
5. Whether to reuse `mobile.*` methods (pre-shaped for phones) instead of the general workspace/surface methods.
6. Capture a **live question/permission feed item** shape (all items were `telemetry` at capture time) and confirm exact params for `feed.question.reply` / `feed.permission.reply` / `feed.exit_plan.reply` — via `cmux docs api` (CLI contract + skill).

## 9. References

- `cmux docs api` → CLI contract: <https://raw.githubusercontent.com/manaflow-ai/cmux/main/docs/cli-contract.md>; skill: <https://raw.githubusercontent.com/manaflow-ai/cmux/main/skills/cmux/SKILL.md>
- cmux CLI / socket API: <https://cmux.com/docs/api>
- cmux iOS app: <https://cmux.com/docs/ios> · SSH/remote: <https://cmux.com/docs/ssh> · custom sidebars: <https://cmux.com/docs/custom-sidebars>
- Local discovery commands used: `cmux capabilities`, `cmux read-screen --help`, `cmux events --help`, `cmux rpc --help`, `cmux workspace list --json`, `cmux docs api`.
