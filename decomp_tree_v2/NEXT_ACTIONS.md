# Next Actions

## RESUME FROM CHECKPOINT
→ [2026-03-11 Session 1 Checkpoint](docs/sessions/2026-03-11-session-1-checkpoint.md)

---

## Next 3 Actions

1. **Implement Exclude Items feature** — plan at `.claude/plans/synchronous-herding-cherny.md`
   - `src/stores/treeState.js` — add `excludedLabels` writable store
   - `src/components/Tooltip.svelte` — add exclude button, dispatcher, pointer-events fix
   - `src/components/DecompTree.svelte` — filter in visibleChildren, subscribe, pill/panel UI

2. **Test dark mode in Tableau** — verify heading text, expand button color, col-header labels

3. **WCAG contrast check (deferred)** — binary isDarkBg threshold may miss mid-range backgrounds
