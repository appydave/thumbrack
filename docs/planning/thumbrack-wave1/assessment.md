# Assessment: ThumbRack Wave 1

**Campaign**: thumbrack-wave1
**Date**: 2026-03-08 → 2026-03-08 (single session)
**Results**: 12/12 complete, 0 failed

---

## Results Summary

| Work Unit | Tests | Status |
|---|---|---|
| server-folder-api | 18 | ✅ |
| server-rename-api | 28 | ✅ |
| server-manifest-api | 24 | ✅ |
| client-app-shell | 8 | ✅ |
| client-sorted-pane | 16 | ✅ |
| client-preview-pane | 10 | ✅ |
| client-unsorted-pane | 16 | ✅ |
| client-drag-drop | 12 | ✅ |
| client-manual-entry | 19 | ✅ |
| client-exclusion | 37 | ✅ |
| client-manifest-ui | 12 | ✅ |
| client-keyboard | 20 | ✅ |
| **Total** | **220 new tests** | **12/12** |

Final suite: **372 tests passing** (223 client + 149 server), zero failures.

---

## What Worked Well

1. **Wave structure** — 4 waves (server → foundation → core → polish) meant agents never blocked each other. Server units ran first in parallel cleanly; client units followed with no dependency conflicts.
2. **AGENTS.md reference patterns** — agents consistently used the shared type definitions, naming conventions, and two-pass rename strategy as specified. No agent invented its own approach.
3. **Hook extraction pattern** — every agent pulled logic into a dedicated hook (`useDragDrop`, `useManualEntry`, `useExclusion`, `useKeyboardNav`). This made each work unit independently testable without UI simulation.
4. **Pre-existing test conflicts self-resolved** — the 2 pre-existing failures flagged by the keyboard agent (toast assertions in ThumbRackApp.test.tsx) were resolved naturally when the manifest-ui agent arrived and added the ToastProvider to the test helpers.
5. **Port mismatch caught early** — `env.test.ts` was asserting the scaffold default (5501) not the registered port (5021). Fixed at wave 1 completion before any client work began.

---

## What Didn't Work

1. **Concurrent agent file contention** — app-shell, sorted-pane, and preview-pane agents all wrote placeholder components. The app-shell agent created placeholders; the other two replaced them. This worked, but created unnecessary write cycles. Future: the shell agent should create the layout file only and leave component files for dedicated agents.
2. **dnd-kit test approach** — the drag-drop agent correctly chose to test via the `useDragDrop` hook rather than UI simulation, but this means the drag UX is untested at the integration level. Manual smoke test required before shipping.

---

## Key Learnings — Application

- **Two-pass rename is non-negotiable** — without it, reordering `05→02` while `02` exists causes a collision. The strategy (temp rename first, then final rename) was unit-tested and works correctly.
- **dnd-kit doesn't simulate well with Testing Library** — test the hook logic, not the drag UI. Accept this limitation and document it.
- **Manifest is graceful by design** — missing or malformed `.thumbrack.json` returns an empty manifest, never crashes. This is correct for a local tool where the manifest may not exist yet.
- **`VITE_API_URL` env var** — all client API calls use this; no hardcoded ports anywhere. Critical for the dev-proxy setup.

---

## Key Learnings — Ralph Loop

- **4 waves × 3-4 agents = right granularity** — no wave had agents fighting over the same files. File ownership was clear per agent.
- **Wave 3 (4 agents) was the most complex** — agents modified `SortedPane.tsx` and `UnsortedPane.tsx` concurrently. It worked because each agent touched different sections of those files. Marginal — worth being more careful next time.
- **Agent prompts should specify "replace placeholder if found"** — the sorted-pane and preview-pane agents handled this correctly because they were told to; without that instruction they might have created duplicate files.

---

## Promote to Main KDD?

- Two-pass rename strategy pattern → worth promoting
- dnd-kit testing approach (test hook, not UI) → worth promoting
- AppyStack port convention fix in env.test.ts → project-specific, not worth promoting

---

## Suggestions for Next Campaign

If a wave 2 is needed (post-smoke-test fixes, enhancements):
- Inherit this AGENTS.md — it's rich with working patterns
- Likely candidates for next wave: zoom/fit on preview (B013), undo (B014), E2E smoke test via Playwright
- Consider adding the `npm run dev` smoke test as a quality gate step before declaring complete
