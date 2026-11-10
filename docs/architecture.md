# Architecture

> Claude reads this before structural changes (linked from CLAUDE.md). Keep it to one or two pages.
> Update it when the shape of the system changes, not for every feature.

## What this is
One paragraph: what the system does and for whom.

## Main pieces
| Part | Where | Responsibility |
| --- | --- | --- |
| e.g. API | `src/api/` | HTTP routes, input validation |
| e.g. Core logic | `src/core/` | Business rules, no I/O |
| e.g. Storage | `src/db/` | Schema, queries, migrations |

## How a request flows
1. ...
2. ...

## Data
- Where it's stored, main tables/collections, and where the schema lives.

## External services
- Name — what we use it for — where the client code lives — env var names (never values).

## Rules of the road
- e.g. Core logic never imports from the API layer.
- e.g. All DB access goes through `src/db/`.

## Known weak spots
- Things that are fragile or due for a rewrite, so Claude handles them carefully.
