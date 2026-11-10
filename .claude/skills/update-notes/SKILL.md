---
name: update-notes
description: Saves a short handoff note for the current task to docs/notes/ so the next session can pick up without the conversation. Use at the end of a work session, before /clear, or after a PR.
---

# /update-notes — leave a note for future sessions

Write or update `docs/notes/<task-or-branch-name>.md` with:

```markdown
# <Task name>
Updated: <today's date>

## Goal
One or two lines.

## Status
- Done: ...
- In progress: ...
- Next step: the single next thing to do

## Decisions
- <decision> because <reason>

## Gotchas found
- <thing that surprised us and how to avoid it>

## Files touched
- path/to/file — what changed
```

Keep it under 40 lines; it's a handoff, not a log. Replace stale content rather than appending.
If a gotcha would apply to every future session, also add it as a one-line rule to the narrowest CLAUDE.md that fits, and say which.
Make sure `docs/notes/README.md` lists this note.
