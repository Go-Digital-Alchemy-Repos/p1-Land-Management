import {describe,it,expect} from 'vitest';
import {normalizeButtonActionValue,shouldRenderConditionalField,getDynamicPropLabel,shouldUseRichTextEditor} from './editor-fields';
describe('shared CMS editor field behavior',()=>{
 it('interprets legacy URL actions without rewriting saved values',()=>{
  const internal={primaryAction:'url',primaryLink:'/contact'},external={primaryAction:'url',primaryLink:'https://example.test'};
  expect(normalizeButtonActionValue('primaryAction',internal)).toBe('internal-link');expect(normalizeButtonActionValue('primaryAction',external)).toBe('custom-link');expect(internal.primaryAction).toBe('url');
 });
 it('shows the matching link or form controls while leaving stored alternatives intact',()=>{
  const values={primaryAction:'form-modal',primaryLink:'/saved',primaryFormSlug:'request'};
  expect(shouldRenderConditionalField({key:'primaryLink'},values)).toBe(false);expect(shouldRenderConditionalField({key:'primaryFormSlug'},values)).toBe(true);expect(shouldRenderConditionalField({key:'primaryModalTitle'},values)).toBe(true);
  expect(shouldRenderConditionalField({key:'primaryOpenInNewTab'},values)).toBe(false);expect(values.primaryLink).toBe('/saved');
  expect(shouldRenderConditionalField({key:'primaryOpenInNewTab'},{primaryAction:'custom-link'})).toBe(true);
 });
 it('shares dynamic labels and retained rich text fields',()=>{
  expect(getDynamicPropLabel({key:'primaryLink',label:'Primary Link'},{primaryAction:'internal-link'})).toBe('Primary Internal Page');
  for(const key of ['subtitle','subheading','answer'])expect(shouldUseRichTextEditor({key,type:'textarea'})).toBe(true);
  expect(shouldUseRichTextEditor({key:'slug',type:'text'})).toBe(false);
 });
});
