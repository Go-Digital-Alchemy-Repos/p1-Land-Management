import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getWebsiteDocuments, createWebsiteDocument, saveWebsiteDocument,
  deleteWebsiteDocument, syncWebsiteDocuments,
  acquireWebsiteDocumentReservation, heartbeatWebsiteDocumentReservation,
  releaseWebsiteDocumentReservation,
} from "../lib/api-client-react/src/dashboard/generated";
import { ApiError } from "../lib/api-client-react/src/custom-fetch";
import { cmsOperations, cmsDestination } from "../artifacts/api-server/src/dashboard/marketing-cms.transport";

const id = "11111111-1111-4111-8111-111111111111";
const expectedVersion = "a".repeat(64);
const document = { title: "Synthetic guide", slug: "synthetic-guide", category: "Reference", content: "# Synthetic guide", sortOrder: 0, isPublished: false };

test("generated document clients preserve concurrency tokens and exact Owner-only destinations", async t => {
  const captured: {url:string; options:RequestInit}[] = [];
  t.mock.method(globalThis, "fetch", async (input: unknown, options: RequestInit) => {
    captured.push({url:String(input), options});
    return Response.json({docs:[], version:expectedVersion});
  });
  await getWebsiteDocuments();
  await createWebsiteDocument(document);
  await saveWebsiteDocument(id, {document, expectedVersion});
  await deleteWebsiteDocument(id, {expectedVersion});
  await syncWebsiteDocuments({expectedVersion});
  await acquireWebsiteDocumentReservation(id);
  await heartbeatWebsiteDocumentReservation(id);
  await releaseWebsiteDocumentReservation(id, {keepalive:true});
  const expected = [
    ["GET", "/website-system/docs", undefined],
    ["POST", "/website-system/docs", document],
    ["PUT", `/website-system/docs/${id}`, {document, expectedVersion}],
    ["DELETE", `/website-system/docs/${id}`, {expectedVersion}],
    ["POST", "/website-system/docs/sync", {expectedVersion}],
    ["POST", `/editor-locks/doc/${id}/acquire`, undefined],
    ["POST", `/editor-locks/doc/${id}/heartbeat`, undefined],
    ["POST", `/editor-locks/doc/${id}/release`, undefined],
  ];
  assert.equal(captured.length, expected.length);
  captured.forEach(({url,options}, index) => {
    const [method,path,body] = expected[index];
    assert.equal(url, `/api/v1/marketing/cms${path}`);
    assert.equal(options.method, method);
    assert.deepEqual(options.body ? JSON.parse(String(options.body)) : undefined, body);
    const operation = cmsOperations.find(op => op.method === method && op.path === String(path).replace(id, ":id"));
    assert(operation, `Client destination is absent from the bridge: ${path}`);
    assert.equal(operation.ownerOnly, true);
    assert.deepEqual(operation.capabilities, []);
    assert.equal(cmsDestination(operation, {id}, {}), path);
  });
  assert.equal(captured[7].options.keepalive, true);
});

test("document clients surface conflict and uncertain-write failures without automatic retries", async t => {
  let calls = 0;
  let status = 409;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({message:"Reload saved document; retain your draft"}, {status});
  });
  for (const code of [409, 503]) {
    status = code;
    const before = calls;
    await assert.rejects(saveWebsiteDocument(id, {document, expectedVersion}), error => {
      assert(error instanceof ApiError);
      assert.equal(error.status, code);
      return true;
    });
    assert.equal(calls, before + 1, "An uncertain document save must not be replayed automatically");
  }
});

test("document client forwards cancellation to the transport", async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (_input: unknown, options: RequestInit) => {
    assert.equal(options.signal, controller.signal);
    throw new DOMException("Aborted", "AbortError");
  });
  controller.abort();
  await assert.rejects(getWebsiteDocuments({signal:controller.signal}), {name:"AbortError"});
});
