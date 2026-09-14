import assert from "node:assert/strict";
import { test } from "node:test";
import { createDocument } from "../src/shared/catalog";
import {
  DocumentYamlError,
  parseDocumentYaml,
  stringifyDocumentYaml,
} from "../src/shared/document-yaml";
import { documentSchema } from "../src/shared/schema";

test("YAML codec preserves schema v1 and v2 documents semantically", () => {
  for (const document of [
    createDocument("slides", "YAML presentation"),
    createDocument("web", "YAML board", undefined, "creative-board"),
    createDocument("video", "YAML motion"),
    createDocument("3d", "YAML scene"),
  ]) {
    const yaml = stringifyDocumentYaml(document);
    assert.match(yaml, /\n$/);
    assert.doesNotMatch(yaml, /(^|\s)[&*][A-Za-z0-9_-]+/);
    assert.deepEqual(parseDocumentYaml(yaml), documentSchema.parse(document));
  }
});

test("YAML codec returns stable syntax and schema diagnostics", () => {
  assert.throws(
    () => parseDocumentYaml("name: [broken"),
    (error: unknown) => error instanceof DocumentYamlError && error.diagnostic.code === "yaml_syntax" && error.diagnostic.line === 1,
  );
  assert.throws(
    () => parseDocumentYaml("name: incomplete\n"),
    (error: unknown) => error instanceof DocumentYamlError && error.diagnostic.code === "document_invalid" && !!error.diagnostic.path,
  );
});

test("YAML codec rejects prohibited YAML features", () => {
  const cases: Array<[string, string]> = [
    ["anchor: &value 1\nalias: *value\n", "anchors"],
    ["base: &base { value: 1 }\nmerged: { <<: *base }\n", "merge keys"],
    ["value: !custom tagged\n", "custom tags"],
    ["value: !!str tagged\n", "explicit standard tags"],
    ["same: one\nsame: two\n", "duplicate keys"],
    ["1: value\n", "non-string keys"],
    ["first: true\n---\nsecond: true\n", "multiple documents"],
    ["__proto__: polluted\n", "prototype keys"],
    ["value: .nan\n", "non-finite values"],
  ];
  for (const [source, label] of cases)
    assert.throws(() => parseDocumentYaml(source), DocumentYamlError, label);
});

test("YAML comments are accepted for a session but are not serialized", () => {
  const document = createDocument("slides", "Comment semantics");
  const source = `# session-only comment\n${stringifyDocumentYaml(document)}`;
  const regenerated = stringifyDocumentYaml(parseDocumentYaml(source));
  assert.doesNotMatch(regenerated, /session-only comment/);
  assert.deepEqual(parseDocumentYaml(regenerated), parseDocumentYaml(source));
});

test("YAML codec enforces byte and depth ceilings", () => {
  assert.throws(
    () => parseDocumentYaml(`name: ${"x".repeat(2 * 1024 * 1024)}\n`),
    (error: unknown) => error instanceof DocumentYamlError && error.diagnostic.code === "yaml_too_large",
  );
  const deeplyNested = `${Array.from({ length: 102 }, (_, index) => `${"  ".repeat(index)}level${index}:`).join("\n")}\n${"  ".repeat(102)}value\n`;
  assert.throws(
    () => parseDocumentYaml(deeplyNested),
    (error: unknown) => error instanceof DocumentYamlError && error.diagnostic.code === "yaml_too_deep",
  );
});
