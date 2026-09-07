import React from 'react';
import * as runtime from 'react/jsx-runtime';
import { cmsValue, useCms } from './cms';
import { responsiveImageProps } from './responsive-images';
export { Fragment } from 'react/jsx-runtime';
function Editable({ elementType, original, global, staticChildren, ...injectedProps }: { elementType: React.ElementType; original: Record<string, any>; global: boolean; staticChildren: boolean; [key: string]: any }) {
  const context = useCms();
  const props = { ...original, ...injectedProps };
  const mapText = (child: any): any => typeof child === 'string' && child.trim() ? cmsValue(context, child, child.length > 120 ? 'textarea' : 'text', global) : Array.isArray(child) ? child.map(mapText) : child;
  if (props.children !== undefined && !['script','style','textarea','option'].includes(String(elementType))) props.children = mapText(props.children);
  if (typeof props.href === 'string' && !props.href.startsWith('#')) props.href = cmsValue(context, props.href, 'ctaTarget', global);
  if (elementType === 'img' && typeof props.src === 'string') {
    props.src = cmsValue(context, props.src, 'image', global);
    if (typeof props.alt === 'string') props.alt = cmsValue(context, props.alt, 'imageAlt', global);
    const responsive = responsiveImageProps(props.src, props.sizes);
    const hero = /hero|banner/i.test(original.src) || original.fetchPriority === 'high';
    Object.assign(props, { ...responsive, ...props, loading: props.loading || (hero ? 'eager' : 'lazy'), fetchPriority: props.fetchPriority || (hero ? 'high' : 'auto') });
  }
  return (staticChildren ? runtime.jsxs : runtime.jsx)(elementType, props);
}
export function makeJsx(global: boolean, staticChildren = false) {
  return (type: any, props: any, key?: any) => {
    if (type === runtime.Fragment || !props || ['svg','path','line','circle','rect','ellipse','polyline','polygon','defs','linearGradient','stop','clipPath'].includes(type)) return (staticChildren ? runtime.jsxs : runtime.jsx)(type, props, key);
    return (staticChildren ? runtime.jsxs : runtime.jsx)(Editable, { ...props, elementType: type, original: props, global, staticChildren }, key);
  };
}
export const jsx = makeJsx(false);
export const jsxs = makeJsx(false, true);
export const jsxDEV = (type: any, props: any, key?: any, staticChildren = false) => makeJsx(false, staticChildren)(type, props, key);
