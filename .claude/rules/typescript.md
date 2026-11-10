# TypeScript / web rules

- TypeScript strict mode. No `any`; use `unknown` and narrow.
- Prefer string literal unions over `enum`.
- Components: function components, one per file, named exports. Follow the nearest existing component's pattern.
- Styling: use the design tokens in `src/styles/tokens.css` (see DESIGN.md). Never hard-code colours, font sizes or spacing; `scripts/check.sh` fails on raw colours.
- Use the existing component library before writing a new component.
- Every data-fetching view needs empty, loading, and error states.
- Tests: colocate as `*.test.ts(x)`. Test behavior the user sees, not implementation details.
- Server code: validate all external input at the boundary (e.g. zod).
- Env vars: read through one config module; client-side vars must be explicitly public-prefixed.
- After UI changes, check the page in the browser at 375px and 1280px, in light and dark, before calling it done.
