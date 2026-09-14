import { useMemo, useRef, useState } from "react";
import { Check, Download, Eye, RotateCcw, Save } from "lucide-react";
import type { DesignDocument } from "../shared/schema";
import {
  DocumentYamlError,
  parseDocumentYaml,
  stringifyDocumentYaml,
  type DocumentYamlDiagnostic,
} from "../shared/document-yaml";
import { renderSvg } from "../shared/render";
import { download } from "./api";
import { Busy, Modal } from "./ui";
import "./yaml-source.css";

export function YamlSourceDialog({
  document,
  revision,
  briefRevision,
  onApply,
  onClose,
}: {
  document: DesignDocument;
  revision: number;
  briefRevision?: number;
  onApply: (document: DesignDocument, revision: number, briefRevision?: number) => Promise<void>;
  onClose: () => void;
}) {
  const generated = useMemo(() => stringifyDocumentYaml(document), [document]);
  const [source, setSource] = useState(generated);
  const [preview, setPreview] = useState<DesignDocument | null>(null);
  const [diagnostic, setDiagnostic] = useState<DocumentYamlDiagnostic | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const observed = useRef({ revision, briefRevision });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const changed = source !== generated;

  const parse = () => {
    try {
      const parsed = parseDocumentYaml(source);
      setDiagnostic(null);
      return parsed;
    } catch (error) {
      const next = error instanceof DocumentYamlError
        ? error.diagnostic
        : { code: "yaml_syntax" as const, message: error instanceof Error ? error.message : "YAML validation failed." };
      setDiagnostic(next);
      setStatus("");
      requestAnimationFrame(() => textarea.current?.focus());
      return null;
    }
  };
  const close = () => {
    if (changed && !confirmDiscard) { setConfirmDiscard(true); return; }
    onClose();
  };
  const reset = () => {
    setSource(generated); setPreview(null); setDiagnostic(null); setStatus("Source reset from the current design."); setConfirmDiscard(false);
  };
  const validate = () => {
    if (parse()) setStatus("Valid DesignDocument YAML. Nothing has been changed or saved.");
  };
  const showPreview = () => {
    const parsed = parse();
    if (parsed) { setPreview(parsed); setStatus("Preview generated locally. Nothing has been changed or saved."); }
  };
  const apply = async () => {
    const parsed = parse();
    if (!parsed) return;
    setBusy(true); setStatus("");
    try {
      await onApply(parsed, observed.current.revision, observed.current.briefRevision);
      onClose();
    } catch (error) {
      setDiagnostic({ code: "document_invalid", message: error instanceof Error ? error.message : "The design could not be saved." });
    } finally { setBusy(false); }
  };
  const saveYaml = () => {
    const parsed = parse();
    if (!parsed) return;
    const name = parsed.name.replace(/[^a-z0-9 _-]/gi, "").trim() || "design";
    download(`${name}.yaml`, stringifyDocumentYaml(parsed), "application/yaml;charset=utf-8");
  };
  const previewPage = preview?.pages[0];

  return <Modal title="YAML source" wide className="yaml-source-modal" onClose={close}>
    <div className="yaml-source-body">
      <p className="modal-description">Edit an interchange view of this design. JSON remains canonical; comments and formatting are not persisted.</p>
      <div className={`yaml-source-layout ${preview ? "with-preview" : ""}`}>
        <div className="yaml-source-editor">
          <label htmlFor="yaml-source-input">DesignDocument YAML</label>
          <textarea ref={textarea} id="yaml-source-input" value={source} spellCheck={false} onChange={event => { setSource(event.target.value); setPreview(null); setDiagnostic(null); setStatus(""); setConfirmDiscard(false); }} aria-invalid={!!diagnostic} aria-describedby="yaml-source-help yaml-source-status" />
          <small id="yaml-source-help">Strict YAML 1.2 only. Anchors, aliases, merge keys, tags, duplicate or non-string keys, and multiple documents are rejected.</small>
        </div>
        {preview && previewPage && <section className="yaml-source-preview" aria-label="YAML preview">
          <h3>Preview · {previewPage.name}</h3>
          <div className="yaml-source-canvas" style={{ aspectRatio: `${previewPage.width}/${previewPage.height}` }}>
            <div dangerouslySetInnerHTML={{ __html: renderSvg(preview, 0) }}/>
          </div>
        </section>}
      </div>
      <div id="yaml-source-status" className={diagnostic ? "inline-error" : "yaml-source-status"} role={diagnostic ? "alert" : "status"} aria-live="polite">
        {diagnostic ? <><strong>{diagnostic.code}</strong>: {diagnostic.message}{diagnostic.path ? ` (${diagnostic.path})` : ""}{diagnostic.line ? ` at ${diagnostic.line}:${diagnostic.column ?? 1}` : ""}</> : status}
      </div>
      {confirmDiscard && <div className="yaml-source-discard" role="alert">Discard the unsaved YAML source? <button className="button danger small" onClick={onClose}>Discard and close</button> <button className="button small" onClick={() => setConfirmDiscard(false)}>Keep editing</button></div>}
      <div className="modal-actions yaml-source-actions">
        <button className="button" disabled={busy} onClick={validate}><Check size={16}/> Validate</button>
        <button className="button" disabled={busy} onClick={showPreview}><Eye size={16}/> Preview</button>
        <button className="button" disabled={busy || !changed} onClick={reset}><RotateCcw size={16}/> Reset from design</button>
        <button className="button" disabled={busy} onClick={saveYaml}><Download size={16}/> Download YAML</button>
        <button className="button primary" disabled={busy} onClick={() => void apply()}>{busy ? <Busy label="Applying…"/> : <><Save size={16}/> Apply and save</>}</button>
      </div>
    </div>
  </Modal>;
}
