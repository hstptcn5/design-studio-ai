import {
  LineCounter,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
  stringify,
  type Node,
} from "yaml";
import { documentSchema, type DesignDocument } from "./schema";

export const DOCUMENT_YAML_MAX_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_YAML_MAX_DEPTH = 100;

export type DocumentYamlDiagnosticCode =
  | "yaml_too_large"
  | "yaml_syntax"
  | "yaml_multiple_documents"
  | "yaml_unsupported_feature"
  | "yaml_non_string_key"
  | "yaml_unsafe_key"
  | "yaml_too_deep"
  | "yaml_non_json_value"
  | "document_invalid";

export interface DocumentYamlDiagnostic {
  code: DocumentYamlDiagnosticCode;
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

export class DocumentYamlError extends Error {
  readonly diagnostic: DocumentYamlDiagnostic;
  constructor(diagnostic: DocumentYamlDiagnostic) {
    super(diagnostic.message);
    this.name = "DocumentYamlError";
    this.diagnostic = diagnostic;
  }
}

const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"]);
const pathName = (path: Array<string | number>) =>
  path.length
    ? path.reduce<string>((out, part) =>
        typeof part === "number" ? `${out}[${part}]` : `${out}.${part}`, "$" )
    : "$";

function fail(
  code: DocumentYamlDiagnosticCode,
  message: string,
  path?: Array<string | number>,
  position?: { line: number; col: number },
): never {
  throw new DocumentYamlError({
    code,
    message,
    path: path ? pathName(path) : undefined,
    line: position?.line,
    column: position?.col,
  });
}

function inspectNode(
  node: Node | null,
  lineCounter: LineCounter,
  path: Array<string | number> = [],
  depth = 0,
): void {
  const position = node?.range ? lineCounter.linePos(node.range[0]) : undefined;
  if (depth > DOCUMENT_YAML_MAX_DEPTH)
    fail("yaml_too_deep", `YAML nesting exceeds ${DOCUMENT_YAML_MAX_DEPTH} levels.`, path, position);
  if (!node) return;
  if (isAlias(node) || "anchor" in node && typeof node.anchor === "string")
    fail("yaml_unsupported_feature", "YAML anchors and aliases are not supported.", path, position);
  if (node.tag)
    fail("yaml_unsupported_feature", "Explicit YAML tags are not supported.", path, position);
  if (isMap(node)) {
    for (const pair of node.items) {
      const keyNode = pair.key as Node;
      const keyPosition = keyNode?.range ? lineCounter.linePos(keyNode.range[0]) : position;
      if (!isScalar(pair.key) || typeof pair.key.value !== "string")
        fail("yaml_non_string_key", "YAML mapping keys must be strings.", path, keyPosition);
      const key = pair.key.value;
      if (key === "<<")
        fail("yaml_unsupported_feature", "YAML merge keys are not supported.", [...path, key], keyPosition);
      if (forbiddenKeys.has(key))
        fail("yaml_unsafe_key", `The mapping key “${key}” is not allowed.`, [...path, key], keyPosition);
      inspectNode(pair.value as Node | null, lineCounter, [...path, key], depth + 1);
    }
  } else if (isSeq(node)) {
    node.items.forEach((item, index) => inspectNode(item as Node | null, lineCounter, [...path, index], depth + 1));
  } else if (!isScalar(node)) {
    fail("yaml_unsupported_feature", "Unsupported YAML node.", path, position);
  }
}

function assertJsonValue(value: unknown, path: Array<string | number> = [], seen = new WeakSet<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("yaml_non_json_value", "Numbers must be finite JSON numbers.", path);
    return;
  }
  if (typeof value !== "object") fail("yaml_non_json_value", "YAML values must be JSON-compatible.", path);
  if (seen.has(value)) fail("yaml_non_json_value", "Shared or cyclic values are not supported.", path);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, [...path, index], seen));
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    fail("yaml_non_json_value", "YAML values must be plain JSON objects.", path);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeys.has(key)) fail("yaml_unsafe_key", `The mapping key “${key}” is not allowed.`, [...path, key]);
    assertJsonValue(child, [...path, key], seen);
  }
}

export function parseDocumentYaml(source: string): DesignDocument {
  if (new TextEncoder().encode(source).byteLength > DOCUMENT_YAML_MAX_BYTES)
    fail("yaml_too_large", `YAML source must not exceed ${DOCUMENT_YAML_MAX_BYTES} bytes.`);
  const lineCounter = new LineCounter();
  const documents = parseAllDocuments(source, {
    version: "1.2",
    schema: "core",
    merge: false,
    resolveKnownTags: false,
    customTags: [],
    strict: true,
    uniqueKeys: true,
    stringKeys: false,
    lineCounter,
    prettyErrors: false,
  });
  if (documents.length !== 1)
    fail("yaml_multiple_documents", "Provide exactly one YAML document.");
  const document = documents[0]!;
  const parseError = document.errors[0] ?? document.warnings[0];
  if (parseError) {
    const position = parseError.linePos?.[0] ?? lineCounter.linePos(parseError.pos[0]);
    const code = parseError.code === "DUPLICATE_KEY" ? "yaml_unsupported_feature" : "yaml_syntax";
    fail(code, parseError.message, undefined, position);
  }
  inspectNode(document.contents as Node | null, lineCounter);
  let value: unknown;
  try {
    value = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch {
    fail("yaml_unsupported_feature", "The YAML document uses an unsupported feature.");
  }
  assertJsonValue(value);
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    fail("document_invalid", issue?.message ?? "The YAML value is not a valid DesignDocument.", issue?.path as Array<string | number> | undefined);
  }
  return parsed.data;
}

export function stringifyDocumentYaml(input: unknown): string {
  const document = documentSchema.parse(input);
  return stringify(document, {
    version: "1.2",
    schema: "core",
    aliasDuplicateObjects: false,
    collectionStyle: "block",
    indent: 2,
    lineWidth: 0,
  });
}
