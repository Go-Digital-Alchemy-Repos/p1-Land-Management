import React, { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as card from "@/components/ui/card";
import * as select from "@/components/ui/select";
import * as tooltip from "@/components/ui/tooltip";
import {
  ArchivePresentationHostProvider,
  ArchiveNavigationProvider,
} from "./archive-presentation-host";
const ui = { Link, Badge, Button, Input, Skeleton, ...card, ...select, ...tooltip };
export function CoreArchivePresentationHost({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  return (
    <ArchiveNavigationProvider.Provider value={navigate}>
      <ArchivePresentationHostProvider value={ui}>{children}</ArchivePresentationHostProvider>
    </ArchiveNavigationProvider.Provider>
  );
}
