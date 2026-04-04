# Next Actions

## RESUME FROM CHECKPOINT
> [2026-03-15 Session 1 Checkpoint](docs/sessions/2026-03-15-session-1-checkpoint.md)

---

## Next 3 Actions

1. **Production QA: Outfit font + label wrapping** — open the real Tableau workbook, hard-refresh, verify Outfit renders correctly on node labels, header, config panel, and tooltip. Check 2-line label wrapping in LR mode doesn't overlap the value line.

2. **Production QA: Keep Only filter** — right-click a node, select "Keep only this item", verify the Tableau filter applies, Active Filters panel shows the entry with blue "Keep" badge, and the x remove button clears it properly.

3. **Clean up dead code** — remove unused `clearAllExclusions` function from `src/lib/tableau.js`.
