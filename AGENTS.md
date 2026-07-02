# Agent Guide

This repository uses Mina AI Router's Ralph loop for milestone work.

Read in this order:

1. `README.md` for product purpose and quick start.
2. `ROADMAP.md` for milestone direction.
3. `ARCHITECTURE.md` for system boundaries.
4. `docs/PRODUCT_SENSE.md`, `docs/RELIABILITY.md`, and `docs/SECURITY.md` for product and operational constraints.
5. `docs/product-specs/` for user-visible feature specs.
6. `docs/exec-plans/active/` for the current Ralph task queue.

Rules:

- Keep local-first behavior and visible tmux sessions central.
- Do not promote a task when required commands fail.
- Prefer small protocol and UI slices over broad milestone work.
- Preserve package publishing through GitHub Actions trusted publishing.
- Runtime state under `data/` and Ralph runtime artifacts under `state/` are local operator data.
