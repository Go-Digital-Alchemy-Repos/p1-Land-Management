import React, { type ReactNode } from "react";
import { StaticRendererHostProvider } from "./static-renderer-host";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { BlogDataProvider } from "./blog-data-host";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormModalButton } from "@/components/forms/form-modal-button";
import * as accordion from "@/components/ui/accordion";
import * as carousel from "@/components/ui/carousel";
const ui = {
  Link,
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormModalButton,
  ...accordion,
  ...carousel,
};
export function CoreStaticRendererHost({ children }: { children: ReactNode }) {
  return (
    <BlogDataProvider value={() => useQuery<any[]>({ queryKey: ["/api/blog"] }).data ?? []}>
      <StaticRendererHostProvider value={ui}>{children}</StaticRendererHostProvider>
    </BlogDataProvider>
  );
}
