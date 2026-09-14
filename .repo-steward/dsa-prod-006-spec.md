# DSA-PROD-006 — YAML Semantic Change Review Specification

## Outcome

Specify one bounded enhancement to the merged YAML authoring workflow: after strict parsing and DesignDocument validation, show a deterministic semantic change summary against the design revision captured when the dialog opened. The summary must help a user understand the structural impact before explicit apply; it must not mutate, save, or weaken the existing revision guard.

This is a research/specification artifact only. Product implementation is **NOT AUTHORIZED**.

## Repository basis

- Repository: `https://github.com/hstptcn5/design-studio-ai.git`
- Base branch: `main`
- Reconciled base commit: `b73b1f71d93c6995eb7e2498c9242ab0d5a746a8`
- Reconciled checkout content digest: `411d528ca194ce6c60120dae3746f93e01251884e1695d59ba476797ccdab75f`
- Existing YAML product identity: `1769de9258c6be285162a3cee9259600871462c1`
- Existing YAML product digest: `64060021fbace8978e7b540b430ad549bc4c194f9a33de4fb432321687f6bd67`

## User problem

The YAML dialog currently validates source and renders a first-page visual preview. A valid YAML edit can nevertheless change nonvisual fields, other pages, node ordering, themes, assets, boards, paintings, or timeline data. Because apply replaces the complete validated DesignDocument, visual preview alone does not tell the user the scope of the pending mutation.

## Included scope

- A shared, deterministic, side-effect-free DesignDocument change-summary function.
- Comparison of the parsed YAML candidate against the immutable document snapshot captured when the dialog opens.
- A human-readable summary grouped by top-level product concepts: document, theme, pages, nodes/layers, assets, boards, paintings, and timeline.
- Counts for added, removed, and modified entities where stable IDs exist.
- Field-path details for scalar/object changes, with values redacted or summarized when large or sensitive.
- Explicit unchanged state when the parsed candidate is semantically equal to the opening document.
- Summary generation as part of Preview; Preview remains local and non-mutating.
- Apply remains explicit and continues to use the opening revision and brief revision.
- A stale server revision continues to fail without discarding the edited source or computed summary.
- Accessible, responsive presentation inside the existing YAML modal.
- Focused shared-unit and browser workflow coverage.
- Small owning documentation updates describing that Preview includes both rendered output and semantic scope.

## Excluded scope

- Canonical YAML storage or YAML persistence.
- Comment/format-preserving editing or YAML AST diffs.
- Three-way merge, automatic conflict resolution, collaborative editing, presence, or WebSockets.
- A generic repository-wide object-diff framework or public API contract.
- Applying individual hunks, selective field apply, undo redesign, or revision model changes.
- Visual pixel diffing, accessibility certification, AI-generated explanations, or provider calls.
- Changes to import/export, CLI, MCP, WebMCP, database schema, DesignDocument schema, migrations, or authentication.
- Dependency upgrades, audit remediation, unrelated editor redesign, or repository-wide refactors.

## Functional requirements

1. The comparison input is two schema-valid `DesignDocument` objects: the immutable opening document and the locally parsed YAML candidate.
2. Summary generation is deterministic, synchronous, side-effect free, and does not mutate either input.
3. Entities with stable `id` fields are matched by ID, not array index. Reordering must be reported separately from add/remove/modify.
4. A modified entity must expose bounded field paths sufficient to locate the change. Paths use existing product concepts and stable IDs where possible.
5. Volatile bookkeeping such as `metadata.updatedAt` must not create a misleading user-visible change when it is the only difference.
6. Values are not required in the default summary. If values are shown, long strings, data URLs, asset URLs, embedded/binary-like content, and large arrays/objects must be length-bounded and privacy-safe.
7. At most 200 detailed change rows may render. The complete aggregate counts must remain accurate and the UI must state when details are truncated.
8. Preview first runs the existing strict YAML parser/schema validator. Invalid source shows the existing diagnostic and no stale summary.
9. A successful Preview shows both the existing rendered first-page preview and the semantic change summary. If no page is renderable, the semantic summary still appears.
10. Changing source after Preview invalidates both rendered preview and semantic summary until Preview is run again.
11. Preview performs no network mutation. Apply remains the only save action.
12. Apply with the correct opening revision sends the same complete validated document through the existing server-owned save path.
13. Apply with a stale revision is rejected; source and summary remain available for reconciliation.
14. The summary uses user-facing terms and must not expose raw internal implementation jargon as the primary label.
15. The summary is keyboard reachable, has meaningful headings/status semantics, does not rely on color alone, reflows without horizontal page scroll, and preserves the existing mobile full-screen modal behavior.

## Expected implementation surfaces

- New shared owner, expected: `src/shared/document-change-summary.ts`.
- YAML workflow: `src/app/yaml-source-dialog.tsx`.
- YAML modal layout/states: `src/app/yaml-source.css`.
- Shared unit tests, expected: `tests/document-change-summary.test.ts`.
- Browser critical path: `tests/yaml-source-ui.spec.ts`.
- Test-plan mapping only if repository selection rules require it: `scripts/test-plan.mjs`.
- Small owning documentation updates where current YAML Preview behavior is described, expected in `docs/agents.md` and/or the existing user guide source. Derived docs must be regenerated only through their owning build.

No server route, schema, database, CLI, MCP, WebMCP, or dependency file should change unless implementation reality reveals a contradiction; such a contradiction stops the checkpoint for re-authorization rather than expanding scope silently.

## Dependency and migration expectations

- New runtime dependency: none expected.
- Lockfile changes: none expected.
- Database migration: none.
- DesignDocument migration/schema change: none.
- Stored documents and revisions remain byte/semantic compatible with the current JSON model.

## Acceptance criteria

- **AC-PROD-006-01:** For valid changed YAML, Preview shows accurate aggregate added/removed/modified/reordered counts and bounded field-path detail against the opening DesignDocument.
- **AC-PROD-006-02:** Semantically unchanged YAML reports no changes; key ordering, YAML formatting, and comments never appear as product changes.
- **AC-PROD-006-03:** ID-keyed page/node/asset additions, removals, modifications, and reorder-only changes are classified correctly, including changes outside the first rendered page.
- **AC-PROD-006-04:** Invalid or unsupported YAML preserves existing diagnostics and clears any prior preview/summary.
- **AC-PROD-006-05:** Preview makes no request that mutates repository data; correct-revision Apply persists through the existing save path.
- **AC-PROD-006-06:** Stale-revision Apply is rejected and preserves source plus the last valid summary for user recovery.
- **AC-PROD-006-07:** Detail rendering is capped at 200 rows with accurate totals and an explicit truncation message; large/sensitive values are not dumped into the UI.
- **AC-PROD-006-08:** Keyboard, status/error semantics, focus visibility, 375/768/1024/1440 layout behavior, long paths, and zoom/text scaling remain usable.
- **AC-PROD-006-09:** Existing strict parsing, JSON persistence, import/export, CLI, auth, revision, and YAML round-trip behavior regressions remain green.
- **AC-PROD-006-10:** No schema, persistence, migration, public API, dependency, provider, or unrelated product change is introduced.

## Verification plan

- Add focused unit tests for equality, scalar modification, ID-keyed add/remove/modify, reorder-only changes, changes across multiple pages and top-level collections, ignored volatile metadata, deterministic ordering, immutability, truncation, and privacy-safe value handling.
- Extend `tests/yaml-source-ui.spec.ts` to verify summary visibility and accuracy, unchanged state, change-after-preview invalidation, non-mutation before Apply, successful correct-revision Apply, stale-revision recovery, invalid YAML clearing, keyboard access, and mobile layout.
- Run under the Node version declared by `package.json`: `npm ci`, `npm ci --prefix packages/cli`, focused shared tests, `npm run build:cli` before CLI regression tests, `npm run typecheck`, `npm test`, and `npm run build`.
- Reproduce the repository-selected browser lane with `npm run test:e2e -- $(node scripts/test-plan.mjs --format=args)` or the PowerShell-equivalent argument expansion. At minimum run the YAML UI spec in Chromium and its mapped mobile/cross-browser targets if selected by the plan.
- Record Windows symlink inability as host capability if it recurs; use capable-host evidence separately and do not relabel historical results.
- GitHub Actions are not required when equivalent local verification is complete.

## Rollback

Revert only the bounded change-summary utility, YAML dialog presentation/integration, corresponding tests, and owning documentation. No data rollback or migration reversal is expected because storage, schema, revisions, and saved YAML behavior do not change.

## Known risks

- A naive deep diff can misclassify reorder as delete/add or produce noisy paths; stable-ID matching and deterministic ordering are mandatory.
- Very large documents can overwhelm the modal; aggregate-first presentation and the 200-row detail cap are mandatory.
- Showing raw before/after values can disclose embedded content or make the UI unreadable; values are optional and must be bounded/redacted.
- The summary is advisory. The authoritative mutation remains server validation plus optimistic revision checking.
- Render preview covers only page 1 today; the semantic summary must explicitly cover the complete document without implying full visual coverage.

## Unresolved non-blocking questions

- Whether default detail should show changed field paths only or also short primitive before/after values. Start with paths and aggregate counts unless usability evidence supports values.
- Whether reorder detail should list every moved ID or only count and parent collection. Start with count plus bounded identifiers.
- Whether unchanged Apply should remain enabled. Preserve current behavior unless implementation review finds a clear reason to disable it.

## Authority and next gate

- Research/specification and durable handoff: authorized and complete.
- Product implementation: **NOT AUTHORIZED**.
- New PR, merge, deploy, release, production mutation, secrets, destructive actions: **NOT AUTHORIZED**.
- `READY_FOR_IMPLEMENTATION_HANDOFF: YES` — the next bounded checkpoint should convert this specification into an exact Implementation Request pinned to the then-current repository identity before any product code changes.
