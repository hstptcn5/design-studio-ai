# DSA-PROD-001 repository research

## Classification and provenance

### OBSERVED

- The product creates web, slides, report, wireframe, 3D, and video projects. Users may begin from a prompt, template, blank document, or imported JSON/SVG/HTML; the brief and scope approval flow is distinct from document revision and generation (`src/app/app.tsx`, `src/app/design-brief.tsx`, `src/shared/schema.ts`).
- `src/shared/schema.ts` is the executable source of truth for `DesignDocument`. Zod accepts strict discriminated versions 1 and 2, with bounded pages, nodes, assets, timelines, creative boards/paintings, characters, IDs, URLs, topology, and cross-reference checks.
- Version 2 adds boards and paintings. `upgradeDocument()` is opt-in, preserves content, and does not mutate stored data merely by reading it (`src/shared/document-upgrade.ts`).
- The server persists a validated document as JSON text in the `projects.document` database column and advances a positive project revision with an owner-scoped atomic compare-and-swap (`migrations/0001-initial.sql`, `server/projects.ts`, `src/shared/document-write.ts`). Project identity and kind must match the row; server-side asset ownership and character evolution checks remain mandatory.
- UI saves use the same document endpoint and preserve uncertain writes and revision conflicts for reconciliation. Live collaboration performs a three-way merge over object structure, treating keyed arrays by IDs and rejecting overlapping edits (`src/app/document-request.ts`, `src/app/editor.tsx`, `src/shared/document-merge.ts`).
- Manual editor operations, REST writes, CLI writes, MCP, and WebMCP converge on `documentSchema`, `operationsSchema`, `mutateDocument()`, and `saveDocument()` rather than alternate document models (`src/shared/operations.ts`, `server/mcp.ts`, `src/app/browser-design-tools.ts`, `packages/cli/src/dsa.ts`).
- Provider document generation prompts for complete JSON, parses provider output with `JSON.parse`, validates with `documentSchema`, preserves identity/kind, and returns a proposal for explicit review and revision-checked application. Motion generation uses bounded operations (`server/providers.ts`, `src/app/editor.tsx`).
- JSON is the only lossless full-document interchange today. Browser import also converts a limited SVG/HTML subset; browser/server/CLI export support JSON plus rendered or specialized formats. Non-JSON formats often project, rasterize, embed, or otherwise cannot round-trip the full native document (`src/app/file-formats.ts`, `server/exports.ts`, `src/shared/export-contract.ts`, `packages/cli/src/dsa.ts`).
- Rendering consumes validated `DesignDocument` objects through shared SVG/HTML/layout/render logic and isolated browser rendering for complex/binary outputs; persistence format is not directly rendered (`src/shared/render.ts`, `src/app/export-page.ts`, `server/exports.ts`).
- No YAML parser dependency, YAML import/export path, YAML editor, YAML API contract, or YAML documentation exists. Repository YAML files are operational configuration only (`package.json`, repository-wide YAML search).
- Changes made through any current representation become visible elsewhere only after conversion to `DesignDocument`, schema validation, and a successful revision-checked save. Public snapshots are immutable projections; later private changes do not mutate them (`server/projects.ts`, `src/shared/public-creative-projection.ts`).
- DSA-STEW-002 closure commit `1839d1a964e51fa99ad70b2c1ad030c640c2a1f0` left the checkout clean and preserved content digest `691a11f3645577832339db2c767c93fdc78fff9b5e9822ce1b1afc7946c5e77c`. Repo Steward resume correctly reported metadata-only `HEAD_DRIFT` and `HISTORICAL_EVIDENCE`.

### DECIDED

- YAML must be an alternate representation of the existing canonical `DesignDocument`; JSON object persistence, schema versions, revisions, ownership, and save services remain authoritative.
- Version 1 will support one JSON-compatible YAML document only. It will reject aliases, anchors, merge keys, explicit/custom tags, complex/non-string keys, duplicate keys, non-finite numbers, multiple documents, and values outside JSON types.
- Applying source is explicit. Parsing or previewing does not save. A successful apply uses the revision and brief-revision protections already used by document proposals.
- Round-trip fidelity is semantic: YAML parse followed by `documentSchema.parse` yields the same supported document value. Comments, scalar spelling, quoting, anchors, and author key order are not persisted.

### ASSUMED

- People and agents who author large complete documents will find YAML materially easier to scan and edit than JSON. This should be tested in product review; repository evidence alone cannot quantify demand.
- A mature JavaScript YAML library with a document AST and bounded alias handling is preferable to a custom parser. The implementation checkpoint must pin and audit the selected dependency.

### UNRESOLVED

- Exact editor component choice and accessibility behavior should follow a focused UI design review; the contract requires a mobile fallback but does not prescribe a heavyweight code editor dependency.
- Whether provider generation should optionally request YAML is deferred. JSON generation already works, and changing provider prompts adds no prerequisite value to the first user-facing YAML slice.
- Telemetry event names and final size/depth limits should be fixed during implementation planning from existing analytics/privacy and document-budget owners; proposed ceilings appear in the specification.

## Narrow external evidence

- YAML 1.2.2 defines mappings as unordered, requires unique keys, and supports graph features such as aliases. Therefore lexical order/comment preservation cannot be inferred from the canonical object model, and aliases require an explicit product policy: https://yaml.org/spec/1.2.2/
- The `yaml` library's official API exposes `parseDocument()` for AST diagnostics/comments and `maxAliasCount` to bound alias expansion. This supports a shared parser with positional errors while allowing the product to prohibit aliases entirely: https://eemeli.org/yaml/ and https://github.com/eemeli/yaml/blob/main/docs/03_options.md

No broader external research was needed; the product decision is governed primarily by current repository contracts.
