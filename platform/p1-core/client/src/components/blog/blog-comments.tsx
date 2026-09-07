import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Send } from "lucide-react";

type BlogCommentSettings = {
  commentsEnabled: boolean;
  allowGuestComments: boolean;
  allowLinksInComments: boolean;
  requireApproval: boolean;
  enableHoneypot: boolean;
};

type PublicComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string | null;
};

type BlogCommentsResponse = {
  settings: BlogCommentSettings;
  comments: PublicComment[];
};

function formatCommentDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function renderCommentBody(body: string, allowLinks: boolean) {
  const lines = body.split("\n");
  if (!allowLinks) {
    return lines.map((line, index) => (
      <span key={index}>
        {line}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    ));
  }

  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  return lines.map((line, lineIndex) => {
    const parts = line.split(linkRegex);
    return (
      <span key={lineIndex}>
        {parts.map((part, index) => {
          if (part.match(linkRegex)) {
            const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
            return (
              <a
                key={`${lineIndex}-${index}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary underline underline-offset-2"
              >
                {part}
              </a>
            );
          }
          return <span key={`${lineIndex}-${index}`}>{part}</span>;
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export function BlogComments({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [body, setBody] = useState("");
  const [honey, setHoney] = useState("");

  const { data, isLoading } = useQuery<BlogCommentsResponse>({
    queryKey: ["/api/blog", slug, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/blog/${slug}/comments`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Unable to load comments");
      }
      return response.json();
    },
    staleTime: STALE_TIMES.LIVE,
  });

  const settings = data?.settings;
  const comments = data?.comments ?? [];
  const canComment =
    Boolean(settings?.commentsEnabled) && (Boolean(user) || Boolean(settings?.allowGuestComments));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/blog/${slug}/comments`, {
        authorName: guestName,
        authorEmail: guestEmail,
        body,
        honey,
      });
      return response.json() as Promise<{ status: string; message: string }>;
    },
    onSuccess: (result) => {
      toast({ title: result.message });
      setBody("");
      setHoney("");
      if (!user) {
        setGuestName("");
        setGuestEmail("");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/blog", slug, "comments"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Could not submit your comment.", variant: "destructive" });
    },
  });

  const introText = useMemo(() => {
    if (!settings?.commentsEnabled) return "";
    if (settings.allowGuestComments) {
      return "Join the conversation below. Guest comments are welcome.";
    }
    return user ? "Join the conversation below." : "Comments are open to logged-in users.";
  }, [settings, user]);

  if (isLoading) {
    return (
      <Card className="mt-10">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading comments…</CardContent>
      </Card>
    );
  }

  if (!settings?.commentsEnabled) {
    return null;
  }

  return (
    <section className="mt-14 space-y-6" data-testid="section-blog-comments">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-heading font-semibold public-heading-2">
            Comments {comments.length > 0 ? `(${comments.length})` : ""}
          </h2>
        </div>
        <p className="public-helper-text">{introText}</p>
      </div>

      {canComment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave a Comment</CardTitle>
            <CardDescription>
              {settings.requireApproval
                ? "Comments are reviewed before they appear publicly."
                : "Your comment will appear as soon as it’s submitted."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user && settings.allowGuestComments ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="comment-name">Name</Label>
                  <Input
                    id="comment-name"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Your name"
                    data-testid="input-comment-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comment-email">Email</Label>
                  <Input
                    id="comment-email"
                    type="email"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="you@example.com"
                    data-testid="input-comment-email"
                  />
                </div>
              </div>
            ) : null}

            {settings.enableHoneypot ? (
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="comment-website">Website</Label>
                <Input
                  id="comment-website"
                  value={honey}
                  onChange={(event) => setHoney(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="comment-body">Comment</Label>
              <Textarea
                id="comment-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share your thoughts…"
                rows={5}
                data-testid="textarea-comment-body"
              />
            </div>

            {!settings.allowLinksInComments ? (
              <p className="text-xs text-muted-foreground">Links are disabled in comments.</p>
            ) : null}

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !body.trim()}
              data-testid="button-submit-comment"
            >
              <Send className="mr-2 h-4 w-4" />
              Post Comment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            <p className="mb-3">You need to be logged in to leave a comment.</p>
            <Link href="/login">
              <Button variant="outline" data-testid="button-login-to-comment">
                Log In
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No comments yet. Be the first to add one.
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCommentDate(comment.createdAt)}
                  </p>
                </div>
                <div className="text-sm leading-7 text-foreground/85 whitespace-pre-wrap">
                  {renderCommentBody(comment.body, settings.allowLinksInComments)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
