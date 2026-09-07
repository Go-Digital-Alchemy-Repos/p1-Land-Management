import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavbarSearchPopover() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  return (
    <div ref={searchContainerRef} className="relative flex items-center">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setSearchOpen((current) => !current)}
        data-testid="button-search-open"
        aria-expanded={searchOpen}
        aria-label={searchOpen ? "Close search" : "Open search"}
      >
        <Search className="h-4 w-4" />
      </Button>
      {searchOpen && (
        <form
          className="absolute right-0 top-full z-[1205] mt-2 flex w-80 max-w-[calc(100vw-2rem)] items-center gap-1 rounded-xl border bg-background p-2 shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
              closeSearch();
            }
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the site..."
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-all"
            data-testid="input-search"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            onClick={closeSearch}
            data-testid="button-search-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
