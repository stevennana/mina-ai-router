# Product Sense

Mina AI Router helps a developer run multiple local Codex and Claude CLI agents as a visible collaboration mesh.

## Primary User

The primary user is a developer who already works with CLI AI coding tools and wants more than one agent to collaborate across local projects without losing terminal visibility.

## Problem

Multiple CLI agents are powerful but hard to coordinate:

- work gets copy-pasted between terminals
- agent capability is implicit and easy to forget
- terminal state is visible but not centrally tracked
- request history is scattered
- failures are hard to diagnose after the fact

## Product Promise

Mina AI Router keeps every agent visible while adding a local operations layer:

- local MCP routing between agents
- tmux-backed terminal visibility
- browser console for flow, inspector, terminal preview, and activity
- capability metadata that helps choose the right agent
- request history and diagnostics for collaboration work

## Non-Goals

- Replace Codex, Claude, LangGraph, CrewAI, AutoGen, or OpenAI Agents SDK.
- Become a hosted multi-user SaaS in the near term.
- Hide terminal sessions behind an opaque autonomous runtime.
- Execute destructive workflow automation without human steering.

## 0.2 Product Goal

Milestone 0.2 makes collaboration reliable enough for daily local development.

The user should be able to send work from one agent to another, understand what happened, retry or diagnose failed requests, and trust the displayed agent status and capability cards.
