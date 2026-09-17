import test from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase } from './title-case.ts';
test('formats headings while retaining short connecting words, acronyms and contractions', () => {
  assert.equal(toTitleCase('Services and nearby communities'), 'Services and Nearby Communities');
  assert.equal(toTitleCase('commercial landscaping in Greer'), 'Commercial Landscaping in Greer');
  assert.equal(toTitleCase("P1's work in SC and NC"), "P1's Work in SC and NC");
  assert.equal(toTitleCase('LAND & PROPERTY MANAGEMENT'), 'Land & Property Management');
  assert.equal(toTitleCase('stormwater: a year-round plan'), 'Stormwater: A Year-Round Plan');
  assert.equal(toTitleCase('FAQs for SCM maintenance'), 'FAQs for SCM Maintenance');
});
