import { createContext, useContext } from "react";
const Context = createContext<() => unknown[]>(() => []);
export const BlogDataProvider = Context.Provider;
export function useBlogPreviewPosts() {
  return useContext(Context)();
}
