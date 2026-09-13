# DSA-PROD-001 — YAML authoring implementation-ready specification

## Decision

**SELECT** a bounded YAML editable-source and interchange capability. YAML is an alternate textual representation of the existing canonical `DesignDocument`, never a new source of truth.

## User problem and behavior

Advanced users and agents can inspect and change a complete design more efficiently as readable text, but today the lossless text path is JSON only. Add a **YAML source** action to the authenticated editor. It opens generated YAML for the currently loaded saved/local document, supports editing, and provides **Validate**, **Preview**, **Apply and save**, **Reset from design**, **Download YAML**, and **Close**.

- Validate parses and validates without changing the canvas or server.
- Preview shows the parsed document through the existing renderer without saving and labels it as an unapplied source preview.
- Apply and save is explicit, requires the source still correspond to the observed project and brief revisions, and uses the existing server document-write service. Conflicts preserve the YAML buffer and require reload/reconciliation.
- Browser workspace import accepts `.yaml` and `.yml` as full native documents; JSON behavior remains unchanged.
- Browser and server export add `yaml` as a textual full-document format.
- CLI document input auto-detects `.yaml`/`.yml` (stdin requires `--format yaml`), `projects import` accepts it, `projects document get --format yaml` and `projects export --format yaml` emit it, and offline `render --format yaml` emits validated YAML without rendering.
- REST, MCP, and WebMCP continue to transport canonical JSON objects. Their capability/schema documentation advertises YAML import/export/source-format support where format inventories are exposed; they do not accept raw YAML bodies in v1.

## Source of truth and persistence

`DesignDocument` and `documentSchema` remain authoritative. YAML is converted to a plain JavaScript value, passed through `documentSchema`, then handled by the existing object-based preview/save/export paths. The database continues storing normalized JSON text. No migration or YAML column is added.

Never persist editor YAML buffers, comments, anchors, formatting, parse errors, or unsaved source in project storage. An optional browser-local crash-recovery draft may be considered only if encrypted/private draft conventions already exist and is otherwise excluded from v1.

## YAML structure and codec

The root is exactly the same mapping represented by canonical JSON export, including the existing `schemaVersion`. Add one shared module, proposed `src/shared/document-yaml.ts`, owning:

- `parseDocumentYaml(text): DesignDocument`
- `stringifyDocumentYaml(document): string`
- structured diagnostic conversion with line, column, path when available, and a stable error code

Use YAML 1.2 semantics and a pinned, audited `yaml` package. Parse exactly one document through its Document API. Reject parser warnings that affect meaning, all explicit/custom tags, anchors, aliases, merge keys, complex or non-string mapping keys, duplicate keys, multiple documents, cyclic/shared references, non-finite numbers, `undefined`, dates, binary values, maps/sets, and any non-JSON value. Enforce UTF-8 text, a proposed 2 MiB YAML input ceiling, bounded depth of 100, and existing document collection/field budgets. Do not evaluate code or resolve external resources.

After conversion, validate only with the shared `documentSchema`; do not duplicate its field contract in the codec. Preserve server-side ownership, asset, topology, revision, and authorization validation.

## Round-trip and ordering policy

Guarantee semantic round trips only:

1. `parseDocumentYaml(stringifyDocumentYaml(document))` deep-equals `documentSchema.parse(document)`.
2. JSON import → YAML export → YAML import preserves every schema-supported value.
3. YAML apply → JSON export preserves every schema-supported value.

Generated YAML uses deterministic object insertion order from the validated document, two-space indentation, block sequences, final newline, stable string quoting chosen by the library, and no generated anchors. YAML mappings are not a canonical ordering contract.

Comments and author formatting are accepted during a single edit session but are not persisted or guaranteed after Reset, Apply, reload, another editor change, or export. The UI must disclose this beside the source editor before Apply.

## Validation and errors

Validation is layered and never partially applies:

1. file/text size and UTF-8 checks;
2. YAML syntax and prohibited-feature checks with line/column diagnostics;
3. JSON-compatible value/depth checks;
4. `documentSchema.safeParse`, mapping Zod paths to YAML source ranges where the AST permits;
5. project identity/kind guard in the client for early feedback;
6. existing server identity, revision, brief revision, asset ownership, topology, and transition checks on save.

Show an error summary plus a navigable list. Do not include secrets or full source in telemetry/server logs. Unknown fields are rejected by the strict versioned document schema. Unsupported future `schemaVersion` values fail with an upgrade/client message; no implicit downgrade or best-effort field deletion occurs.

## AI-generated YAML

Treat AI-generated YAML exactly as untrusted user input. It receives the same prohibited-feature, budget, schema, identity, and save checks and must remain a preview until explicit Apply. V1 does not change provider prompts or make YAML the provider response contract. Agents may create YAML files for CLI/browser import, but cannot bypass scope approval, asset ownership, or revisions.

## Interaction and propagation

Opening source snapshots the local document and its observed project/brief revisions. Visual edits while source contains changes require an explicit choice to discard or keep the source buffer; do not silently overwrite either representation. Preview uses the parsed in-memory document. Apply goes through the same save endpoint as a full document proposal, then replaces local editor state with the returned server document. Other clients observe it through normal project reads/change polling. Concurrent changes use existing conflict/reload/merge behavior; v1 does not implement textual YAML merging.

On mobile, use a full-screen source surface with persistent validation/apply status and reachable actions. Keyboard operation, focus restoration, screen-reader error association, and non-color error cues are required. Browser support follows the existing supported editor baseline; feature-detect any optional editor enhancement and retain a textarea fallback.

## Security

- No executable tags, constructors, code evaluation, includes, environment interpolation, or network/file resolution.
- Disallow aliases/anchors/merge keys and bound size/depth before expensive schema work.
- Prevent prototype-pollution keys during recursive conversion and rely on strict schemas for document fields.
- Keep authorization, ownership, asset isolation, and revision checks on the server.
- Escape YAML and diagnostics in the UI; never render source as HTML.
- Do not send YAML contents to providers or telemetry without a separate user-authorized feature.

## Exact implementation scope

Included:

- shared YAML codec and diagnostics;
- one pinned YAML parser dependency and lockfile update;
- editor YAML source modal/panel with validate, preview, explicit apply, reset, download, accessible responsive fallback, and conflict preservation;
- `.yaml`/`.yml` browser import and YAML browser/server export;
- CLI YAML input/output flags and extension detection;
- capability/API reference, MCP/WebMCP format inventory, official docs, CLI docs, agent skill, `llms.txt`, and regenerated `llms-full.txt` updates required by repository ownership;
- focused unit, integration, CLI, browser mobile/desktop, security, and documentation tests;
- test-plan routing for any new browser spec.

Excluded:

- YAML as database or canonical storage;
- persistence of comments, lexical formatting, key order, anchors, or aliases;
- raw `application/yaml` REST request bodies;
- a second YAML-specific document schema or migration system;
- provider prompt/output changes;
- textual collaboration/merge, live co-editing of YAML, or background autosave from the source buffer;
- general-purpose templates, variables, includes, macros, expressions, scripts, or configuration language features;
- product implementation in DSA-PROD-001.

## Acceptance criteria

1. A full valid v1 or v2 document can be exported to YAML and imported back with deep semantic equality after `documentSchema.parse`.
2. Browser YAML import, editor source preview/apply, server YAML export, and CLI YAML flows all use the same shared codec and existing validators/services.
3. Applying valid YAML requires explicit action and the exact observed project and brief revisions; stale writes preserve source and return actionable conflict recovery.
4. Syntax and schema errors show stable codes, YAML line/column when available, and document paths without mutating local or saved design state.
5. Duplicate keys, multiple documents, aliases, anchors, merge keys, explicit/custom tags, non-string keys, non-JSON values, excessive depth/size, unsafe URLs, unavailable assets, identity/kind changes, and prototype-pollution attempts are rejected.
6. Unknown fields and unsupported schema versions fail without dropping data; v1-to-v2 behavior remains opt-in and existing reads never rewrite storage.
7. Comments may be typed but the UI clearly warns that comments/formatting are not persisted; tests prove no claim of lexical round-trip fidelity.
8. JSON import/export and all existing editor, REST, MCP, WebMCP, CLI, render, publication, and revision behavior remain backward compatible.
9. The source workflow is keyboard accessible and usable in mobile and desktop Chromium; affected fallback behavior is exercised without relying on Chromium-only APIs. Any Firefox/WebKit claim requires an actually run targeted check.
10. Documentation and generated references are updated from their owning sources, with no hand-edited generated bundles.

## Test strategy

- Unit: codec golden cases, semantic round trips for catalog templates and representative v1/v2 creative/motion/3D documents, deterministic output, diagnostics, all prohibited YAML features, size/depth limits, prototype keys, and comment-loss policy.
- Existing contract tests: `document.test.ts`, `document-v2.test.ts`, `structured-design.test.ts`, merge/asset/security/export tests.
- Server/integration: YAML export authorization/revision/content type; parsing remains client/CLI-side unless an authenticated import endpoint is deliberately added.
- CLI: extension/flag/stdin behavior, YAML get/import/export/render, structured errors, JSON backward compatibility.
- Browser: import, source validate/preview/apply/reset/conflict, unsaved-close guard, focus/errors, mobile and desktop layouts.
- Repository gates: `npm run build:cli`, focused tests, `npm run typecheck`, `npm test`, `npm run build`, then selected E2E from `scripts/test-plan.mjs`; no production smoke or Actions for routine verification.

## Rollback

Remove the YAML UI/format registrations, shared codec, parser dependency, tests, and source documentation in one focused revert. Because canonical persistence remains JSON and no migration occurs, existing projects require no data rollback. YAML files already downloaded remain external artifacts and can still be converted through a compatible tool.

## Implementation authority

This specification is implementation-ready, but product implementation, PR creation, merge, deploy, and release are **NOT AUTHORIZED** by DSA-PROD-001.
