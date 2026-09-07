import { Router } from "express";
import crypto from "crypto";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { publicBlogCommentSubmissionSchema, type BlogPost } from "@shared/schema";
import * as r2Service from "../services/r2.service";
import { optionalAuth } from "../middleware/auth";
import {
  countLinksInText,
  getBlogCommentSettings,
  textContainsLinks,
} from "../services/blog-comments.service";

const router = Router();

async function normalizePostImages(post: BlogPost): Promise<BlogPost> {
  return {
    ...post,
    coverImageUrl: (await r2Service.normalizePublicUrl(post.coverImageUrl)) ?? null,
    ogImageUrl: (await r2Service.normalizePublicUrl(post.ogImageUrl)) ?? null,
  };
}

function getDisplayNameForUser(user: Express.Request["user"]) {
  if (!user) return "";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  return user.email.split("@")[0] || "Member";
}

function hashIpAddress(ipAddress: string | undefined) {
  if (!ipAddress) return null;
  return crypto.createHash("sha256").update(ipAddress).digest("hex");
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await storage.blog.getPublishedPosts();
    res.json(await Promise.all(posts.map(normalizePostImages)));
  }),
);

router.get(
  "/:slug/comments",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug as string;
    const post = await storage.blog.getPostBySlug(slug);
    if (!post || !post.isPublished) {
      return res.status(404).json({ message: "Post not found" });
    }

    const settings = await getBlogCommentSettings();
    if (!settings.commentsEnabled) {
      return res.json({
        settings,
        comments: [],
      });
    }

    const comments = await storage.blogComments.getApprovedCommentsByPostId(post.id);
    res.json({
      settings,
      comments: comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        createdAt: comment.createdAt,
      })),
    });
  }),
);

router.post(
  "/:slug/comments",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const slug = req.params.slug as string;
    const post = await storage.blog.getPostBySlug(slug);
    if (!post || !post.isPublished) {
      return res.status(404).json({ message: "Post not found" });
    }

    const settings = await getBlogCommentSettings();
    if (!settings.commentsEnabled) {
      return res.status(403).json({ message: "Comments are disabled." });
    }

    const payload = publicBlogCommentSubmissionSchema.parse(req.body);

    if (settings.enableHoneypot && payload.honey.trim()) {
      return res.status(201).json({
        status: settings.requireApproval ? "pending" : "approved",
        message: settings.requireApproval
          ? "Your comment has been submitted for review."
          : "Your comment has been posted.",
        comment: null,
      });
    }

    const commenter = req.user;
    if (!commenter && !settings.allowGuestComments) {
      return res.status(401).json({ message: "Please log in to comment." });
    }

    const authorName = commenter ? getDisplayNameForUser(commenter) : payload.authorName.trim();
    const authorEmail = commenter ? commenter.email : payload.authorEmail.trim();
    if (!authorName) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!authorEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const body = payload.body.trim();
    const hasLinks = textContainsLinks(body);
    const linkCount = countLinksInText(body);

    if (!settings.allowLinksInComments && hasLinks) {
      return res.status(400).json({ message: "Links are not allowed in comments." });
    }

    const ipHash = hashIpAddress(req.ip);
    if (settings.enableRateLimit) {
      const recent = await storage.blogComments.findRecentCommentByIdentity({
        userId: commenter?.id ?? null,
        authorEmail,
        ipHash,
        since: new Date(Date.now() - settings.rateLimitSeconds * 1000),
      });

      if (recent) {
        return res.status(429).json({
          message: `Please wait ${settings.rateLimitSeconds} seconds before posting another comment.`,
        });
      }
    }

    let status: "pending" | "approved" | "spam" = settings.requireApproval ? "pending" : "approved";
    let moderationNote: string | null = null;
    if (
      settings.enableSpamProtection &&
      settings.allowLinksInComments &&
      settings.maxLinksPerComment >= 0 &&
      linkCount > settings.maxLinksPerComment
    ) {
      status = "spam";
      moderationNote = "Automatically flagged for excessive links.";
    }

    const createdComment = await storage.blogComments.createComment({
      postId: post.id,
      userId: commenter?.id ?? null,
      authorName,
      authorEmail,
      body,
      status,
      ipHash,
      userAgent: req.get("user-agent") || null,
      moderationNote,
    });

    res.status(201).json({
      status,
      message:
        status === "approved"
          ? "Your comment has been posted."
          : status === "pending"
            ? "Your comment has been submitted for review."
            : "Your comment has been received.",
      comment: {
        id: createdComment.id,
        authorName: createdComment.authorName,
        body: createdComment.body,
        createdAt: createdComment.createdAt,
      },
    });
  }),
);

router.get(
  "/:slug",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const slug = req.params.slug as string;
    const post = await storage.blog.getPostBySlug(slug);
    if (!post || !post.isPublished) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(await normalizePostImages(post));
  }),
);

export default router;
