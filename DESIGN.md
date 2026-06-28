# Mina AI Router UI Renovation

## Source
This UI renovation is based on the Stitch screen:

- Project: `Mina AI Router UI Renovation`
- Screen: `Mina AI Router - Live Operations Console`
- Screen resource: `projects/15320485979940199806/screens/c8fcc8896f6848fa90c08ac9c984bf19`
- Downloaded reference: `docs/stitch/mina-ai-router-live-operations-console.html`

## Product Fit
Mina AI Router is a local control plane for visible CLI AI agents. The UI should feel like an operational console for developers managing tmux-backed Codex and Claude sessions through a local MCP router.

The first screen is the product, not a landing page. It should immediately expose local server status, MCP endpoint, active agents, routed request flow, selected agent metadata, attach commands, and recent activity.

## Creative North Star
Calm local operations desk.

The visual tone is precise, grounded, and private. It should feel closer to an IDE, terminal multiplexer, and infrastructure control panel than a marketing SaaS dashboard. It avoids neon cyberpunk, purple gradients, oversized rounded blobs, and decorative hero treatments.

## Foundation Tokens
- Background: `#fcf9f8`
- Surface: `#ffffff`
- Surface low: `#f6f3f2`
- Surface container: `#f0eded`
- Surface high: `#eae7e7`
- Ink: `#1c1b1b`
- Muted: `#404846`
- Primary: `#18443b`
- Primary container: `#315c52`
- Secondary teal: `#006a6a`
- Teal fixed: `#7ed5d4`
- Success: `#16815f`
- Warning: `#a65f14`
- Danger: `#ba1a1a`
- Outline: `#c0c8c5`

## Typography
- Headings: Hanken Grotesk
- Body/UI: Work Sans
- Technical content: JetBrains Mono
- Icons: Material Symbols Outlined loaded as a font resource from Google Fonts

Use monospace for MCP URLs, paths, request IDs, tmux session names, attach commands, and terminal output.

## React Implementation Structure
The production UI is now implemented as a Vite React client under `apps/http-server/ui`.

Bottom-up structure:

- `src/foundation`: design tokens, responsive layout CSS, reusable component CSS.
- `src/primitives`: low-level UI primitives such as `Button`, `StatusPill`, `Kv`, and `Modal`.
- `src/domain`: UI-facing router types and pure display helpers.
- `src/lib`: API and clipboard utilities.
- `src/features`: composed feature elements such as command bar, side rail, live flow, inspector, activity table, terminal panel, forms, menus, and diagnostics.
- `src/App.tsx`: page composition and state/action orchestration.

## Foundation Elements
- App shell: top command bar, side rail, central canvas, right inspector, bottom activity strip.
- Command bar: local server health, port, MCP endpoint copy affordance, Connect Agent, Create tmux Agent, Refresh.
- Side rail: compact icon rail for Overview, Agents, Requests, MCP, Diagnostics.
- Live flow canvas: router node centered, agent nodes around it, SVG connection lines showing request states.
- Agent node: title, status dot, transport/session metadata, capability summary, latest request.
- Inspector panel: selected agent status, root, transport, session, attach command, capability summary, recent requests.
- Activity table: recent routed requests, status, latency, and summary.
- Context menus and modals: operational surfaces for details, history, ask, attach, terminal, restart, delete.

## Interaction Rules
- Waiting request lines pulse subtly.
- Selection never changes layout size.
- All destructive actions require confirmation.
- Empty states are compact and directly useful.
- Mobile prioritizes top bar, flow canvas, inspector, then activity. Side rail becomes a horizontal nav.

## Accessibility
- Minimum interactive target: 44px.
- AA contrast.
- Visible focus ring.
- No horizontal overflow at 390px.
- Status is expressed with both color and text.
