# cmux-web — Product Requirements Document

> Status: draft v0.1 · Date: 2026-07-21 · Owner: k@ko.wal.ski
> Research basis: [`research.md`](./research.md). Target stack: **TanStack Start** + ecosystem.

## 1. Summary

A responsive, mobile-first web app that mirrors the cmux experience — **workspace groups, workspaces, live terminal output** — and lets the operator **triage and unblock ~30 agents from a phone**: see who needs input, answer questions and permission prompts, nudge/prompt agents, and read the terminal. It runs on the Mac and is reached over Tailscale.

The mental model: **cmux's sidebar + terminal, as a web page you can drive from your pocket.**

## 2. Problem & motivation

- The operator runs ~30 agents as cmux workspaces on one Mac. The bottleneck is *human input*: agents pause on questions ("Needs input"), permission prompts, and plan approvals.
- Away from the Mac, there's no good way to see which agent is blocked and unblock it. VNC (multi-monitor stitching) and raw tmux (no triage layer at 30 sessions) don't fit. The first-party iOS app is native/beta and not a browser.
- cmux exposes a complete Unix-socket control API (verified — see research §4) that covers every interaction we need. So a thin web client is the right shape.

## 3. Goals / non-goals

### Goals (what success looks like)
- **G1 — Triage:** at a glance, see all groups + workspaces with accurate status (`Idle` / `Running` / `Needs input`) and unread badges, sorted so "needs me" floats to the top.
- **G2 — Unblock:** answer a pending question, approve/deny a permission prompt, and accept/reject a plan — in ≤2 taps from the list.
- **G3 — Nudge:** type text and send keys/prompts into any workspace's terminal/agent.
- **G4 — Read:** view live terminal output (with scrollback) for the selected workspace.
- **G5 — Anywhere:** usable one-handed on a phone browser over Tailscale; installable as a PWA.

### Non-goals (v1)
- Not a full terminal emulator replacement (no tmux-grade pane management, no local shell).
- No editing files / running arbitrary shell beyond sending input to existing agent surfaces.
- No creating/deleting workspaces or groups (read + interact only; creation is P2).
- No multi-user/tenant support; single operator, single Mac.
- No relaying cmux traffic through any third-party server (Tailscale is the transport).

## 4. Users & primary use cases

**Primary persona:** the operator, away from the desk, on a phone.

1. *"Who needs me?"* — open app → sorted list shows 3 workspaces `Needs input` → tap the top one.
2. *"Answer the question"* — see the agent's question + context → type/select an answer → `feed.question.reply` → workspace flips to `Running`.
3. *"Approve the tool"* — permission prompt (e.g. run command) → Approve/Deny → `feed.permission.reply`.
4. *"Nudge it"* — agent idle/stuck → send "continue" / a correction via `workspace.prompt_submit` or `surface.send_text` + Enter.
5. *"What's it doing?"* — open a workspace → read live terminal (scrollback) to understand state.
6. *"Pager"* — receive a push/badge when any workspace transitions to `Needs input`.

## 5. Functional requirements (prioritised)

Priority: **P0** = v1 must-have · **P1** = v1 should-have · **P2** = later.

| ID | Requirement | Priority | cmux method(s) |
|---|---|---|---|
| F1 | List workspace **groups** with collapse/expand state | P0 | `workspace.group.list` |
| F2 | List **workspaces** per group: title, preview line, colour, branch/cwd, selected | P0 | `workspace.list` |
| F3 | Derive + show **status** (`Idle`/`Running`/`Needs input`) and unread badge | P0 | `notification.list` (primary: `subtitle:"Waiting"` ⇒ needs input, `is_read` ⇒ badge) + activity glyph ⇒ running |
| F4 | **Sort/float** `Needs input` to top; filter/search across all 30 | P0 | client-side over F2/F3 |
| F5 | Open a workspace → **live terminal view** with scrollback | P0 | `surface.read_text` / `cmux read-screen` |
| F6 | **Answer a question** | P0 | `feed.question.reply` |
| F7 | **Approve/deny permission** prompt | P0 | `feed.permission.reply` |
| F8 | **Send text + keys** (nudge) to the focused surface | P0 | `surface.send_text`, `surface.send_key` |
| F9 | **Submit an agent prompt** | P0 | `workspace.prompt_submit` |
| F10 | **Reply to plan mode** (accept/reject) | P1 | `feed.exit_plan.reply` |
| F11 | **Live updates** without manual refresh (status, new questions, terminal changed) | P0 | `cmux events` stream |
| F12 | **Push notifications** when a workspace needs input | P1 | `cmux events --category notification` → web push |
| F13 | Select/focus a workspace to keep parity with the desktop app | P1 | `workspace.select`, `surface.focus` |
| F14 | Per-workspace **diff** view (last-turn / staged) | P2 | `cmux diff` |
| F15 | Multi-pane workspaces: list panes/surfaces, switch | P1 | `pane.list`, `surface.list` |
| F16 | Create workspace / group; rename; set colour | P2 | `workspace.create`, `workspace.group.*` |

## 6. Non-functional requirements

- **Performance:** list view renders 30+ workspaces in <150 ms after data; status updates arrive via stream (no busy-poll). Terminal snapshot for a surface returns in <300 ms on tailnet.
- **Latency budget (input round-trip):** tap → cmux acts → UI reflects, target <500 ms on a good connection.
- **Reliability:** the `events` connection auto-reconnects and resumes by `seq` (cursor file); on reconnect, re-sync snapshots. Handle the 4,096-event replay bound and 16 KiB frame cap (bulk terminal text always via `read_text`, never events).
- **Responsiveness:** mobile-first; one-handed; works on iOS Safari + Android Chrome; installable PWA; respects safe-area insets; light/dark.
- **Security:** see §11.
- **Accessibility:** status conveyed by more than colour (icon + label); adequate tap targets; screen-reader labels for actions.
- **Offline/degraded:** clear "disconnected from Mac / cmux" state; queued actions are *not* silently retried (avoid double-sends).

## 7. UX / information architecture

**Layout**
- **Phone:** two-level — (1) **List** (groups → workspaces, sorted, searchable) → tap → (2) **Detail** (terminal + input bar + pending-request panel). Back returns to list. Bottom input bar with a send button and a key toolbar (Enter, Esc, Ctrl-C, arrows).
- **Desktop/tablet:** persistent left sidebar (mirrors cmux) + main pane (terminal + input) — approximates the native app.

**Status model (matches the cmux sidebar in the reference screenshot)**
- `Needs input` — pending `feed` question/permission/plan → **blue, bell icon, sorted to top, badge**.
- `Running` — agent active (spinner glyph / activity) → **green, activity icon**.
- `Idle` — nothing pending, agent quiet → **muted/grey**.
- Unread count badge from `notification.list`.

**Key states to design:** loading, empty (no workspaces), disconnected (cmux down / socket unreachable), auth required, action in-flight, action failed, question/permission modal, terminal streaming vs stalled.

## 8. Architecture

```
  Phone browser (PWA)
        │  HTTPS over Tailscale (tailscale serve)
        ▼
  ┌─────────────────────────── TanStack Start app (on the Mac) ──────────────────────────┐
  │  Web / SSR + client (React, TanStack Router)                                          │
  │    • Route: /  (list)   • Route: /w/$ref (detail)                                     │
  │    • TanStack Query for snapshot state (groups/workspaces/feed/notifications)         │
  │    • xterm.js terminal view                                                           │
  │  Server (Start server functions + a server route for streaming)                       │
  │    • cmuxClient: Unix-socket JSON-RPC client → CMUX_SOCKET_PATH (+ password auth)     │
  │    • /api/events (SSE)  ← subscribes to `cmux events`, fans out to clients            │
  │    • App auth gate (token/cookie) in front of everything                              │
  └───────────────────────────────────────────────────────────────────────────────────────┘
        │  Unix domain socket (local only, never networked)
        ▼
     cmux app (native macOS)  ── controls ──▶  ~30 agent workspaces
```

**Why TanStack Start + ecosystem**
- **Start server functions** run on the Mac → the *only* place that touches the cmux socket. The socket is never exposed; the browser only sees our authenticated HTTP(S) API. Good security boundary.
- **TanStack Router** gives typed routes/loaders for `/` and `/w/$ref`; loaders prefetch snapshots for instant navigation.
- **TanStack Query** manages snapshot caching, background refetch, and reconciliation with the live event stream (stream signals "invalidate workspace X" → Query refetches its slice).
- Vite-based, SSR + streaming, deployable as a plain Node server bound to the tailnet.

**Live data strategy (from research §4.2)**
- Snapshots (groups, workspaces, feed, notifications, terminal text) via server functions calling `workspace.group.list` / `workspace.list` / `feed.list` / `notification.list` / `surface.read_text`.
- A single server-side subscription to `cmux events` (with `--cursor-file` + `--reconnect`) fans out to browser clients over **SSE**; each event triggers a targeted Query invalidation. Terminal bulk text is always *pulled* via `surface.read_text` after an event says a surface changed.
- **Terminal rendering:** xterm.js. v1 = snapshot/diff (poll-on-event) written into the terminal; evaluate a true PTY bridge later if fidelity/latency needs it.

## 9. Feature → cmux method map

See §5 table. Params/return shapes to be pinned from `cmux docs api` (CLI contract + skill) during M0. Raw calls available as `cmux rpc <method> '<json>'`; friendly wrappers (`read-screen`, `send`, `send-key`, `events`, `workspace list`) used where they exist.

## 10. Data model (client-side, normalised)

Aligned to verified payloads (research §4.5):
```ts
// workspace.group.list → groups[]
type Group = {
  id: string; ref: string;                 // "workspace_group:6"
  name: string;                            // "Personal"
  color?: string; icon?: string;           // custom_color, icon_symbol
  collapsed: boolean; pinned: boolean;     // is_collapsed, is_pinned
  memberRefs: string[];                    // member_workspace_refs (ordered) — the join
  anchorRef?: string;
}
// workspace.list → workspaces[]
type Workspace = {
  ref: string; index: number;              // groupId resolved via Group.memberRefs
  title: string; color?: string;           // title (may embed glyph), custom_color
  cwd: string; branch?: string;
  preview?: string;                        // latest_conversation_message
  lastSubmittedAt?: string;
  selected: boolean;
  status: 'idle' | 'running' | 'needs_input';   // derived (F3) — see below
  unread: number;
  remote?: { enabled: boolean; state: string };
}
type Surface = { ref: string; workspaceRef: string; kind: 'terminal' | 'browser'; title?: string }
// notification.list → notifications[]  — drives F3 status + F12 pager
type Notification = {
  id: string; title: string;               // "Claude Code"
  subtitle?: string; body?: string;        // "Waiting" / "Claude is waiting for your input"
  read: boolean;                           // is_read
  workspaceRef?: string; surfaceRef?: string; tabTitle?: string;
  createdAt: string;
}
// feed.list → items[]  — activity + interactive prompts
type FeedItem = {
  id: string; kind: string;                // observed: "toolUse"; interactive kinds answered via feed.*.reply
  source: string;                          // "claude"
  status: string;                          // "telemetry" for activity; interactive statuses TBD (M0)
  title?: string; toolName?: string; toolInput?: string;
  cwd?: string; workstreamId?: string; createdAt: string; updatedAt: string;
}
```
> **Status derivation (F3), confirmed:** a `Notification` with `subtitle:"Waiting"` for a workspace ⇒ `needs_input`; `unread` counts `!read`; activity glyph in `title` ⇒ `running`; else `idle`.

## 11. Security model

- **Transport:** HTTPS via `tailscale serve`; app bound to the tailnet interface, never a public one. Rely on Tailscale ACLs *plus* app auth (defence in depth).
- **App auth:** a login gate (single shared secret / passkey / token cookie) in front of all routes and server functions. No unauthenticated route serves terminal text or accepts input.
- **cmux socket:** requires `access_mode` = full (enabled by operator) + socket password. Server reads the password from `CMUX_SOCKET_PASSWORD`; socket path from `CMUX_SOCKET_PATH`. Socket access stays local to the Mac.
- **Sensitive output:** terminal text may contain secrets. Provide a **"hide content"** mode (blur/redact previews + notification bodies, reveal on tap), mirroring the iOS app. Never log terminal text server-side.
- **Action safety:** no automatic retry of input-sending actions (prevents double-sends of destructive commands); explicit confirm for permission "approve".

## 12. Milestones

- **M0 — Spike / de-risk (1–2 days).** With full socket access enabled: dump live `workspace.group.list`, `workspace.list`, `feed.list`, `notification.list`, `surface.list`, `surface.read_text`, and a sample `cmux events` stream. Resolve research §8 open questions (status derivation, group↔workspace join, ANSI fidelity, feed reply params). Prove a round-trip: read a surface + send a keystroke + reply to a question from a script.
- **M1 — Read-only mirror (P0 read path).** TanStack Start app: groups + workspaces list (F1–F4), terminal view (F5), live updates via SSE + `events` (F11). Tailscale serve + auth gate. Deployed and usable on phone.
- **M2 — Interaction (P0 write path).** Send text/keys (F8), prompt submit (F9), answer questions (F6), permission replies (F7). Confirm dialogs + hide-content.
- **M3 — Pager + polish.** Web push on `Needs input` (F12), plan replies (F10), pane switching (F15), PWA install, offline/disconnected states, focus/select parity (F13).
- **M4 — Nice-to-haves (P2).** Diffs (F14), workspace/group creation (F16), theming to match cmux colours/icons.

## 13. Prerequisites / setup

1. **cmux socket full access** — enabled by operator (done 2026-07-21). Verify with a live `cmux rpc workspace.group.list '{}'`.
2. **Socket env** — `CMUX_SOCKET_PATH` (this machine: `/Users/kristof/.local/state/cmux/cmux-501.sock`) and `CMUX_SOCKET_PASSWORD` available to the server process.
3. **Tailscale** — installed on Mac + phone; `tailscale serve` configured for the app's port (HTTPS + MagicDNS).
4. **Node + pnpm** and a TanStack Start scaffold in this repo (`cmux-web`).

## 14. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `read_text` drops colour/cursor detail | Terminal view less faithful | Accept text-first v1; spike PTY bridge if needed (M0) |
| Status derivation wrong → false "needs input" | Bad triage | Validate against live feed/notification data in M0; conservative rules |
| Events replay bound (4,096) / frame cap (16 KiB) | Missed/oversized updates | Always pull bulk via `read_text`; resync snapshots on reconnect |
| cmux API is beta and may change across versions | Breakage on upgrade | Pin cmux version; centralise all calls in `cmuxClient`; smoke tests |
| Terminal text leaks secrets over the wire | Security | Auth gate + Tailscale + hide-content; no server logging of text |
| Sending input double-fires | Destructive commands | No silent retries; idempotency guard; confirm on approve |

## 15. Open questions

1. ~~Status derivation~~ **Resolved:** `notification.list` `subtitle:"Waiting"` ⇒ needs input; `!is_read` ⇒ badge (research §4.5).
2. ~~Group↔workspace join~~ **Resolved:** `Group.member_workspace_refs` (ordered).
3. ANSI/colour fidelity of `read_text`; PTY bridge vs snapshot. → M0
4. Capture a **live** question/permission feed item + precise params/returns for `feed.question.reply`, `feed.permission.reply`, `feed.exit_plan.reply`, `workspace.prompt_submit`. → M0 via `cmux docs api`
5. Reuse `mobile.*` methods (pre-shaped for phones) vs general methods? → M0
6. Web push on iOS PWA — feasibility/limitations for F12. → M3
7. App auth mechanism choice (shared secret vs passkey). → M1

## 16. Out of scope (v1)

Local shell / arbitrary command exec beyond agent surfaces; file editing; multi-user; non-Tailscale remote access; managing cmux settings; cloud VM / remote-workspace provisioning.

---

### Appendix A — cmux method catalog (relevant subset, verified via `cmux capabilities`)

`workspace.group.{list,create,delete,rename,collapse,expand,move,pin,unpin,set_color,set_icon,ungroup,add,remove,focus,new_workspace}` ·
`workspace.{list,current,select,focus,next,previous,last,rename,reorder,prompt_submit,env,close}` ·
`surface.{list,read_text,send_text,send_key,create,close,focus,split,current,health,refresh,report_pwd,report_tty}` · `terminal.input` ·
`pane.{list,surfaces,create,focus,resize,swap}` ·
`feed.{list,question.reply,permission.reply,exit_plan.reply,push,jump}` ·
`notification.{list,create,create_for_surface,create_for_target,mark_read,jump_to_unread,dismiss,clear}` ·
`window.{list,current,displays,focus,create,close}` ·
`mobile.{workspace.list,terminal.input,host.status}` ·
Stream: `cmux events [--category <c>] [--name <n>] [--cursor-file <p>] [--reconnect]`
