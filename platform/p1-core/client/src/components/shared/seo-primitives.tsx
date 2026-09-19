import React from "react";
export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`seo-card ${className}`} {...props} />;
}
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`seo-card-content ${className}`} {...props} />;
}
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`seo-card-header ${className}`} {...props} />;
}
export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`seo-card-title ${className}`} {...props} />;
}
export function CardDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`seo-card-description ${className}`} {...props} />;
}
export function Badge({
  variant: _,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return <span className={`seo-badge ${className}`} {...props} />;
}
export function Button({
  variant: _,
  size: __,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) {
  return <button type="button" className={`seo-button ${className}`} {...props} />;
}
export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`seo-skeleton ${className}`} {...props} />;
}
