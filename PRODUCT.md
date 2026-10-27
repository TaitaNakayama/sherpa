# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript, Tailwind) with one API route and one page, no database, no auth. Set by the user's brief.

## Users

People holding (or looking at) Hyperliquid perp positions who have never traded perps. It is demoed live at a hackathon.

## Product Purpose

Paste a wallet and understand, in plain English, what could go wrong with its open positions. Then review 2–3 suggested actions. Success means a first-time viewer understands each position's risk within seconds.

## Constraints

- Read-only. Approve only shows a simulated confirmation, no order is ever placed, and private keys are never handled.
- All numbers are computed in code. The LLM only words recommendations and may only quote given numbers.
- A demo-data mode must work with the network off.
- Visual direction pinned by the user: minimal, dark, Apple.com-like.
