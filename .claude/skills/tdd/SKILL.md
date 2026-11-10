---
name: tdd
description: Test-driven loop - write failing tests from the requirement, confirm they fail, then implement until they pass without editing the tests. Use when the user says TDD or test first, or for logic with clear inputs and outputs.
argument-hint: "[what to build]"
---

# /tdd — tests first

Task: $ARGUMENTS

1. **Tests first.** Write tests for the behavior, including edge cases and the failure path.
   Prefer real objects over mocks. Do not write any implementation yet.
2. **Watch them fail.** Run only the new tests. Confirm they fail for the right reason
   (missing function / wrong result), not a typo or import error. Show the output.
3. **Commit the tests** (`test: add tests for ...`) so the target is locked in.
4. **Implement** the smallest code that makes them pass. Do not edit the tests to make them pass.
   If a test is truly wrong, stop and explain why instead of changing it.
5. **Run the full check** (`./scripts/check.sh`) so nothing else broke. Show the output.
6. **Refactor** only with tests green, re-running after each change.
