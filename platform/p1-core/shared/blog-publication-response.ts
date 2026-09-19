// Type-only response contracts derived from Core's own services. Keeping these
// inside Core preserves its standalone Docker build boundary. No server code is
// imported at runtime into the browser.
import type {
  createBlogPublication,
  blogRevisionSummaries,
  previewBlogRevision,
} from "../server/services/blog-publication-editor.service";
import type { BlogMutationAction } from "../server/services/blog-publication.service";

type JsonResponse<T> = T extends Date ? string
  : T extends Array<infer Item> ? JsonResponse<Item>[]
  : T extends object ? { [Key in keyof T]: JsonResponse<T[Key]> }
  : T;

type CreatedPost = JsonResponse<Awaited<ReturnType<typeof createBlogPublication>>>;
export type BlogPublicationPostResponse = Omit<CreatedPost, "lease"> & {
  lease?: CreatedPost["lease"];
};
export type BlogPublicationAction = BlogMutationAction;
export type BlogRevisionResponse = JsonResponse<Awaited<ReturnType<typeof blogRevisionSummaries>>[number]>;
export type BlogPreviewResponse = JsonResponse<Awaited<ReturnType<typeof previewBlogRevision>>>;
