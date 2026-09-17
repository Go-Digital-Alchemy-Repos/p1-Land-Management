import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readLocalCareerResume } from "./career-resume-files";

let fixture: string;
let root: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "p1-resume-files-"));
  root = path.join(fixture, "career-resumes");
  await mkdir(path.join(root, "legacy"), { recursive: true });
  await writeFile(path.join(root, "legacy", "résumé.pdf"), Buffer.from([0, 255, 13, 10]));
  await mkdir(`${root}-private`);
  await writeFile(path.join(`${root}-private`, "secret.txt"), "outside storage");
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

it("preserves nested legacy names, binary bytes and configured symlink roots", async () => {
  const expected = Buffer.from([0, 255, 13, 10]);
  expect(await readLocalCareerResume(root, "legacy/résumé.pdf")).toEqual(expected);
  const alias = path.join(fixture, "configured-root");
  await symlink(root, alias);
  expect(await readLocalCareerResume(alias, "legacy/résumé.pdf")).toEqual(expected);
});

it("rejects traversal, neighboring prefixes, absolute paths and escaping symlinks", async () => {
  const outside = path.join(`${root}-private`, "secret.txt");
  await symlink(outside, path.join(root, "escape.pdf"));
  await symlink(`${root}-private`, path.join(root, "escape-dir"));
  for (const file of [
    "../career-resumes-private/secret.txt",
    outside,
    "escape.pdf",
    "escape-dir/secret.txt",
    "\0bad",
    "",
    ".",
    "legacy",
  ])
    expect(await readLocalCareerResume(root, file)).toBeNull();
});

it("returns unavailable for missing files, missing storage and broken links", async () => {
  await symlink(path.join(fixture, "missing"), path.join(root, "broken.pdf"));
  expect(await readLocalCareerResume(root, "missing.pdf")).toBeNull();
  expect(await readLocalCareerResume(root, "broken.pdf")).toBeNull();
  expect(await readLocalCareerResume(path.join(fixture, "absent"), "resume.pdf")).toBeNull();
});
