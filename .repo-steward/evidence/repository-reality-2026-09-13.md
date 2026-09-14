# Repository reality — 2026-09-13

Evidence scope: remote GitHub repository objects and source-file reads. This is not local-checkout or runtime evidence.

## Exact repository identity

- Target: `hstptcn5/design-studio-ai`
- Git identity used by the Implementation Request: `https://github.com/hstptcn5/design-studio-ai.git`
- Repository is a fork of `bestagentkits/design-studio-ai`.
- Default branch: `main`
- Base/HEAD observed immediately before implementation: `6b3cd5c1006ad586f10f1784aa56abd7b39d1001`
- Base tree: `6abcfbb4f21f4e567268357e1a2a0a083aaecd3c`
- Base commit message: `Merge pull request #60 from bestagentkits/codex/creature-preview-upload-fixes`
- At discovery time the fork had only `main`, no open pull request and no `.repo-steward/` tree.

## Implementation versus documentation

The repository is a mature TypeScript/React/Vite/Hono design workspace with shared document contracts, REST/MCP/WebMCP/CLI surfaces, tests, 3D/motion/export code, and deployment configuration. `docs/product-brief.md` explicitly states that requested scope is not proof of implementation, so source/tests remain the behavioral authority.

Current `package.json` is version `0.4.3` and requires Node `>=24`. `AGENTS.md` requires local focused/shared verification and forbids claiming unexecuted checks passed.

## Verification evidence on this fork

No commit status and no pull-request-triggered workflow run were attached to `6b3cd5c1006ad586f10f1784aa56abd7b39d1001` in the fork when inspected. Upstream commit/PR history may contain historical verification claims, but those are not relabeled as current fork verification.

The active container could not clone the repository because DNS resolution for `github.com` failed. Therefore local npm/typecheck/unit/browser verification is unavailable in this session and remains `NOT_RUN`.

## Upstream signals, not accepted fork decisions

- Upstream issue #16 proposes optional safe YAML authoring at CLI/MCP boundaries.
- Upstream issue #17 proposes a complete offline-runnable source-project handoff export.
- Upstream PR #37 is a broad in-flight feature branch touching design systems, SSRF, agent installation, motion, live artifacts and prompts.

These are evidence for future Brainstorm/Research-to-Spec work only. None grants authority to mutate this fork.

## Authority boundary

The active user instruction authorizes implementation of one selected bounded checkpoint. It explicitly does **not** authorize merge to `main`, deployment, release, production database mutation, production secret changes, destructive actions or irreversible external actions.
