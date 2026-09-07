import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const compiled = stripTypeScriptTypes(readFileSync(new URL('../src/lib/commercial-inquiry.ts', import.meta.url), 'utf8'));
const { commercialPayload, commercialErrors, inquiryAttempt, sendCommercialInquiry } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const form = () => { const data = new FormData(); Object.entries({ name: 'Test Buyer', company: 'Example', address: 'York County, SC', phone: '(704) 555-0123', projectStage: 'unknown', serviceTiming: 'both', services: 'general_site_assessment' }).forEach(([k,v]) => data.append(k,v)); return data; };
test('phone-only and email-only intake; optional details stay blank', () => {
  const data = form(); const payload = commercialPayload(data, {}); assert.deepEqual(commercialErrors(payload), {}); assert.equal(payload.inquiryType, 'commercial_site_assessment'); assert.equal(payload.email, '');
  data.set('phone', ''); data.set('email', ' buyer@example.com '); assert.deepEqual(commercialErrors(commercialPayload(data, {})), {});
  data.set('email', ''); assert.match(commercialErrors(commercialPayload(data, {})).email, /email address or phone/);
  data.set('phone','123'); assert.ok(commercialErrors(commercialPayload(data, {})).phone);
});
test('invalid supplied channel and missing required need rejected', () => {
  const data = form(); data.set('email','broken'); data.delete('services'); const errors = commercialErrors(commercialPayload(data, {})); assert.ok(errors.email); assert.ok(errors.services);
});
test('unchanged retry key stable; different project creates a new request', () => {
  const payload = commercialPayload(form(), {}); const first = inquiryAttempt(null,payload,()=>'first'); assert.equal(inquiryAttempt(first,payload,()=>{throw Error('unexpected');}),first);
  const second = inquiryAttempt(first,{...payload,address:'Different property'},()=>'second'); assert.equal(second.key,'second');
});
test('one POST and durable receipt required; duplicate receipt accepted', async () => {
  const attempt = inquiryAttempt(null,commercialPayload(form(), {}),()=>'stable'); let calls=0;
  const transport = async (url, options) => { calls++; assert.equal(url,'/api/forms/p1-commercial-assessment/submit'); assert.equal(options.headers['Idempotency-Key'],'stable'); return new Response(JSON.stringify({submissionId:'receipt-1'}),{status:200}); };
  assert.equal(await sendCommercialInquiry(attempt,transport),'receipt-1'); assert.equal(calls,1);
  for (const [status,body] of [[201,{}],[500,{submissionId:'no'}],[202,{submissionId:'no'}],[429,{}]]) await assert.rejects(sendCommercialInquiry(attempt, async()=>new Response(JSON.stringify(body),{status})));
});
