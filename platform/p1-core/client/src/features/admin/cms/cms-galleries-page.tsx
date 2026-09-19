import { GalleryListPresentation } from "@/components/shared/cms-gallery-list-presentation";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CmsGalleryWithItems } from "@shared/schema";

export default function CmsGalleriesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (sort) params.set("sort", sort);
    return params.toString();
  }, [search, sort, status]);

  const { data: galleries = [], isLoading } = useQuery<CmsGalleryWithItems[]>({
    queryKey: [`/api/admin/cms/galleries${queryString ? `?${queryString}` : ""}`],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith("/api/admin/cms/galleries"),
    });
  };

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/publish`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery published" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to publish gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/unpublish`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery moved to draft" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to unpublish gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/duplicate`),
    onSuccess: async (res) => {
      const gallery: CmsGalleryWithItems = await res.json();
      invalidate();
      toast({ title: "Gallery duplicated" });
      navigate(`/admin/cms/galleries/${gallery.id}`);
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to duplicate gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/galleries/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery deleted" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to delete gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <AdminSidebar>
      <GalleryListPresentation
        galleries={galleries}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        sort={sort}
        setSort={setSort}
        onSelect={(id) => navigate(`/admin/cms/galleries/${id}`)}
        onAction={(id, action) => {
          if (action === "publish") publishMutation.mutate(id);
          else if (action === "unpublish") unpublishMutation.mutate(id);
          else if (action === "duplicate") duplicateMutation.mutate(id);
          else deleteMutation.mutate(id);
        }}
        primitives={{
          Button,
          Card,
          CardContent,
          Input,
          Select,
          SelectTrigger,
          SelectValue,
          SelectContent,
          SelectItem,
          Badge,
          Skeleton,
        }}
      />
    </AdminSidebar>
  );
}
