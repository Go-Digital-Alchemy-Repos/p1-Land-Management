import { it, expect } from "vitest";
import {
  createBuilderPreviewMessage,
  parseBuilderPreviewMessage,
  acceptBuilderPreviewMessage,
  CMS_BUILDER_PREVIEW_LIMITS,
} from "./preview";
const channel = "11111111-1111-4111-8111-111111111111";
const blocks = [
  {
    id: "block",
    type: "legacy-block",
    props: { content: "<p>Draft</p>", unknown: { retained: true } },
  },
];
it("preserves draft blocks and requires exact origin, source, channel and increasing revisions", () => {
  const message = createBuilderPreviewMessage(channel, 2, blocks),
    source = {};
  const expected = {
    origin: "https://dashboard.p1landmanagement.com",
    source,
    channel,
    afterRevision: 1,
  };
  expect(message.blocks).toEqual(blocks);
  expect(
    acceptBuilderPreviewMessage({ origin: expected.origin, source, data: message }, expected),
  ).toEqual(message);
  for (const origin of [
    "null",
    "https://evil.test",
    "https://dashboard.p1landmanagement.com.evil.test",
  ])
    expect(acceptBuilderPreviewMessage({ origin, source, data: message }, expected)).toBeNull();
  expect(
    acceptBuilderPreviewMessage({ origin: expected.origin, source: {}, data: message }, expected),
  ).toBeNull();
  expect(
    acceptBuilderPreviewMessage(
      {
        origin: expected.origin,
        source,
        data: { ...message, channel: "22222222-2222-4222-8222-222222222222" },
      },
      expected,
    ),
  ).toBeNull();
  expect(
    acceptBuilderPreviewMessage(
      { origin: expected.origin, source, data: message },
      { ...expected, afterRevision: 2 },
    ),
  ).toBeNull();
  expect(
    acceptBuilderPreviewMessage(
      { origin: "*", source, data: message },
      { ...expected, origin: "*" },
    ),
  ).toBeNull();
});
it("rejects excessive, cyclic, non-JSON and unsafe-key payloads before use", () => {
  const base = { type: "p1:builder-preview", version: 2, channel, revision: 0, blocks };
  expect(parseBuilderPreviewMessage({ ...base, blocks: [...blocks, ...blocks] })).toBeNull();
  expect(
    parseBuilderPreviewMessage({
      ...base,
      blocks: Array.from({ length: 201 }, (_, i) => ({ ...blocks[0], id: String(i) })),
    }),
  ).toBeNull();
  expect(
    parseBuilderPreviewMessage({
      ...base,
      blocks: [{ ...blocks[0], props: { text: "x".repeat(CMS_BUILDER_PREVIEW_LIMITS.bytes) } }],
    }),
  ).toBeNull();
  expect(
    parseBuilderPreviewMessage({
      ...base,
      blocks: [{ ...blocks[0], props: { sparse: new Array(1000000) } }],
    }),
  ).toBeNull();
  const cycle: any = {};
  cycle.self = cycle;
  expect(
    parseBuilderPreviewMessage({ ...base, blocks: [{ ...blocks[0], props: cycle }] }),
  ).toBeNull();
  for (const props of [
    { value: NaN },
    { value: Infinity },
    { value: () => 0 },
    { value: new Date() },
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ])
    expect(parseBuilderPreviewMessage({ ...base, blocks: [{ ...blocks[0], props }] })).toBeNull();
  const props: any = {};
  Object.defineProperty(props, "getter", {
    enumerable: true,
    get: () => {
      throw Error("must not run");
    },
  });
  expect(parseBuilderPreviewMessage({ ...base, blocks: [{ ...blocks[0], props }] })).toBeNull();
  let deep: any = {};
  for (let i = 0; i < 20; i++) deep = { child: deep };
  expect(
    parseBuilderPreviewMessage({ ...base, blocks: [{ ...blocks[0], props: deep }] }),
  ).toBeNull();
});

it("bounds form drafts, rejects mixed documents and requires the current protocol", () => {
 const message={type:"p1:builder-preview",version:2,channel,revision:0,blocks:[],form:{name:"Draft",slug:"draft",fields:[]}};
 expect(parseBuilderPreviewMessage(message)?.form).toEqual(message.form);
 expect(parseBuilderPreviewMessage({...message,version:1})).toBeNull();
 expect(parseBuilderPreviewMessage({...message,blocks})).toBeNull();
 expect(parseBuilderPreviewMessage({...message,form:{description:"x".repeat(CMS_BUILDER_PREVIEW_LIMITS.bytes)}})).toBeNull();
});
