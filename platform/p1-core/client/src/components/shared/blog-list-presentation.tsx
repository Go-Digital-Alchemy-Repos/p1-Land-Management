import type { ComponentType } from "react";
import { Eye, EyeOff, CalendarClock, ExternalLink, Trash2 } from "lucide-react";
export function BlogPostCard({
  ui,
  post,
  category,
  displayPath,
  liveUrl,
  onEdit,
  onDelete,
  formatDate,
}: {
  ui: {
    Card: ComponentType<any>;
    CardContent: ComponentType<any>;
    Badge: ComponentType<any>;
    Button: ComponentType<any>;
  };
  post: {
    id: string;
    title: string;
    authorName: string;
    isPublished?: boolean | null;
    scheduledAt?: string | Date | null;
    publishedAt?: string | Date | null;
  };
  category?: string | null;
  displayPath: string;
  liveUrl?: string;
  onEdit: () => void;
  onDelete?: () => void;
  formatDate: (value: string | Date) => string;
}) {
  const { Card, CardContent, Badge, Button } = ui;
  return (
    <Card
      className="hover:border-orange-200 dark:hover:border-orange-800 transition-colors cursor-pointer"
      onClick={onEdit}
      data-testid={`card-post-${post.id}`}
    >
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold truncate" data-testid={`text-post-title-${post.id}`}>
              <button
                type="button"
                className="text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                aria-label={`Edit ${post.title}`}
              >
                {post.title}
              </button>
            </h3>
            {post.isPublished ? (
              <Badge
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs"
                data-testid={`badge-published-${post.id}`}
              >
                <Eye className="h-3 w-3 mr-1" />
                Published
              </Badge>
            ) : post.scheduledAt ? (
              <Badge
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs"
                data-testid={`badge-scheduled-${post.id}`}
              >
                <CalendarClock className="h-3 w-3 mr-1" />
                Scheduled · {formatDate(post.scheduledAt)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs" data-testid={`badge-draft-${post.id}`}>
                <EyeOff className="h-3 w-3 mr-1" />
                Draft
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            By {post.authorName}
            {post.publishedAt && <> · {formatDate(post.publishedAt)}</>}
            <span className="ml-2 font-mono text-xs text-muted-foreground/60">{displayPath}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {post.isPublished && liveUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              asChild
              title="View on site"
            >
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-view-post-${post.id}`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              data-testid={`button-delete-post-${post.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
