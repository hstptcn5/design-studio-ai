import { expect, test } from "./authenticated-browser";
import { createDocument } from "../src/shared/catalog";
import { stringifyDocumentYaml } from "../src/shared/document-yaml";
import type { Project } from "../src/shared/schema";

test("YAML source validates, previews without mutation, applies explicitly, and preserves conflicts", async ({ page, baseURL }) => {
  const headers = { Origin: baseURL! };
  const document = createDocument("web", "YAML UI verification");
  const created = await page.request.post("/api/projects", { headers, data: { name: document.name, kind: document.kind, document } });
  const project = (await created.json() as { project: Project }).project;
  try {
    await page.goto(`/?project=${project.id}`);
    await expect(page.getByRole("button", { name: "Back to workspace" })).toBeVisible();
    await page.getByRole("button", { name: "Edit YAML source" }).click();
    const yamlDialog = page.getByRole("dialog", { name: "YAML source" });
    const source = page.getByLabel("DesignDocument YAML");
    await expect(source).toBeVisible();
    const changed = (await source.inputValue()).replace("YAML UI verification", "YAML preview only");
    await source.fill(changed);
    await yamlDialog.getByRole("button", { name: "Validate" }).click();
    await expect(page.locator("#yaml-source-status")).toContainText("Nothing has been changed or saved");
    await yamlDialog.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByRole("region", { name: "YAML preview" })).toBeVisible();
    let saved = (await (await page.request.get(`/api/projects/${project.id}`)).json() as { project: Project }).project;
    expect(saved.document.name).toBe("YAML UI verification");
    await yamlDialog.getByRole("button", { name: "Apply and save" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    saved = (await (await page.request.get(`/api/projects/${project.id}`)).json() as { project: Project }).project;
    expect(saved.document.name).toBe("YAML preview only");

    await page.getByRole("button", { name: "Edit YAML source" }).click();
    const conflictDialog = page.getByRole("dialog", { name: "YAML source" });
    const conflictSource = page.getByLabel("DesignDocument YAML");
    await conflictSource.fill((await conflictSource.inputValue()).replace("YAML preview only", "Must remain buffered"));
    const external = structuredClone(saved.document); external.name = "Concurrent save";
    const externalSave = await page.request.put(`/api/projects/${project.id}/document`, { headers, data: { document: external, expectedRevision: saved.revision } });
    expect(externalSave.status()).toBe(200);
    await conflictDialog.getByRole("button", { name: "Apply and save" }).click();
    await expect(conflictDialog.getByRole("alert")).toContainText(/revision|changed|reload/i);
    await expect(conflictSource).toContainText("Must remain buffered");
  } finally {
    await page.request.delete(`/api/projects/${project.id}`, { headers });
  }
});

test("workspace imports a YAML DesignDocument", async ({ page, baseURL }) => {
  const document = createDocument("slides", "Imported YAML workspace");
  await page.goto("/");
  await page.getByLabel("Import a design").setInputFiles({ name: "imported.yaml", mimeType: "application/yaml", buffer: Buffer.from(stringifyDocumentYaml(document)) });
  const dialog = page.getByRole("dialog", { name: "Import your design" });
  await expect(dialog.getByText("YAML design document imported")).toBeVisible();
  await expect(dialog.getByLabel("Project name")).toHaveValue("Imported YAML workspace");
  await dialog.getByRole("button", { name: "Import into workspace" }).click();
  await expect(page.getByRole("button", { name: "Back to workspace" })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("project");
  if (id) await page.request.delete(`/api/projects/${id}`, { headers: { Origin: baseURL! } });
});
