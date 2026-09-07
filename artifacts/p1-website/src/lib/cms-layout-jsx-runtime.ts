import { makeJsx } from './cms-jsx-runtime';
export { Fragment } from 'react/jsx-runtime';
export const jsx = makeJsx(true);
export const jsxs = makeJsx(true, true);
export const jsxDEV = (type: any, props: any, key?: any, staticChildren = false) => makeJsx(true, staticChildren)(type, props, key);
