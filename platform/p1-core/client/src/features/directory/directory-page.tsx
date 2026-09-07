import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Monitor,
  Map,
  List,
  Users,
  ChevronRight,
  X,
  SlidersHorizontal,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Brain,
  Fingerprint,
  UserCheck,
  Puzzle,
  Heart,
  Sparkles,
  BookOpen,
  Leaf,
  Globe,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MapView } from "@/components/directory/map-view";
import { JsonLd } from "@/components/shared/json-ld";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpecializations } from "@/hooks/use-specializations";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { useGlobalSeo } from "@/hooks/use-global-seo";
import { useSeo } from "@/hooks/use-seo";
import { stripHtml } from "@/lib/html";
import { buildBreadcrumbLd, buildDirectoryItemListLd } from "@/lib/structured-data";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { PaginatedTherapists, DirectoryFilterOptions } from "@shared/types/directory";
import {
  getDirectoryExperienceMode,
  type PublicDirectorySettings,
} from "@shared/types/directory-settings";

const vettedMeans = [
  "Every listed provider completes a detailed application process",
  "Credentials and licensure are verified",
  "Relevant qualifications, experience, or training are reviewed",
  "Profiles are reviewed by our team before being published",
];

const vettedDoesNotMean = [
  "We are not a licensing or credentialing body",
  "We do not provide supervision or direct professional services",
  "Listing does not constitute an endorsement of specific outcomes",
  "We do not guarantee a match, but we make finding one easier",
];

const categoryIcons = [
  Brain,
  Fingerprint,
  Globe,
  UserCheck,
  Puzzle,
  Heart,
  Users,
  Sparkles,
  BookOpen,
  Leaf,
];

const fallbackCategoryLabels = {
  service_provider: [
    "Anxiety",
    "Identity & Belonging",
    "Core Platform Support",
    "Expatriate Adjustment",
    "Cross-Cultural",
    "Grief & Loss",
    "Family Support",
    "Trauma & PTSD",
    "CBT",
    "Mindfulness",
  ],
  store_locator: [
    "Retail Pickup",
    "Showroom",
    "Repair Services",
    "Personal Shopping",
    "Curbside Pickup",
    "Consultations",
    "Group Visits",
    "Private Rooms",
  ],
} as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function plainText(v: unknown): string {
  return stripHtml(str(v));
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function lower(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function getDirectoryHeading(settings: PublicDirectorySettings): string {
  const experience = getDirectoryExperienceMode(settings);

  if (experience === "store_locator") {
    return `Find ${settings.listingLabelSingular || "Location"}`;
  }

  return `Find ${settings.participantLabelSingular || settings.listingLabelSingular}`;
}

function getDirectorySubheading(settings: PublicDirectorySettings): string {
  const experience = getDirectoryExperienceMode(settings);
  const specialty = lower(settings.specialtyLabelPlural) || "categories";

  if (experience === "store_locator") {
    return `Search by name, ${specialty}, address, phone, or service area, then explore locations on the map.`;
  }

  return `Search by name, ${specialty}, location${
    settings.showLanguages ? ", language" : ""
  }, or service format, then explore results on the map.`;
}

function getSearchPlaceholder(settings: PublicDirectorySettings): string {
  const experience = getDirectoryExperienceMode(settings);
  const specialty = lower(settings.specialtyLabelPlural);

  if (experience === "store_locator") {
    return `Search name${specialty ? `, ${specialty}` : ""}, address...`;
  }

  return `Search name${specialty ? `, ${specialty}` : ""}${
    settings.showLanguages ? ", language" : ""
  }...`;
}

function getSessionFormatLabel(mode: string | null) {
  switch (mode) {
    case "in_person":
      return "In-Person";
    case "virtual":
      return "Virtual";
    case "both":
      return "In-Person & Virtual";
    default:
      return "Virtual";
  }
}

function getSessionFormatShortLabel(mode: string | null) {
  switch (mode) {
    case "in_person":
      return "In-Person";
    case "virtual":
      return "Virtual";
    case "both":
      return "Virtual & In-Person";
    default:
      return "Virtual";
  }
}

function TherapistRow({
  profile,
  user,
  isHighlighted,
  acceptingLabel,
  showSpecialties,
  showPracticeMode,
  showAvailabilityStatus,
  showLocationFields,
  onHover,
}: {
  profile: TherapistProfile;
  user: { firstName: string | null; lastName: string | null; profileImageUrl: string | null };
  isHighlighted: boolean;
  acceptingLabel: string;
  showSpecialties: boolean;
  showPracticeMode: boolean;
  showAvailabilityStatus: boolean;
  showLocationFields: boolean;
  onHover: (id: string | null) => void;
}) {
  const initials =
    `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Verified Provider";
  const specializations = profile.specializations || [];
  const displayedSpecs = specializations.slice(0, 2);
  const remainingCount = specializations.length - 2;

  const locationText =
    profile.city && profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.country || null;

  return (
    <Link href={`/directory/${profile.id}`}>
      <div
        className={`flex items-start gap-3 px-3 sm:px-4 py-3 border-b cursor-pointer transition-colors ${
          isHighlighted
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "hover:bg-muted/50 border-l-2 border-l-transparent"
        }`}
        onMouseEnter={() => onHover(profile.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(profile.id)}
        onBlur={() => onHover(null)}
        data-testid={`row-therapist-${profile.id}`}
      >
        <Avatar className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 mt-0.5">
          {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={fullName} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3
              className="font-semibold text-sm leading-tight truncate"
              data-testid={`text-name-${profile.id}`}
            >
              {fullName}
            </h3>
            {showAvailabilityStatus && profile.acceptingClients && (
              <span
                className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"
                title={acceptingLabel}
              />
            )}
          </div>
          {profile.title && (
            <p
              className="text-xs text-muted-foreground truncate mt-0.5"
              data-testid={`text-title-${profile.id}`}
            >
              {plainText(profile.title)}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {showLocationFields &&
              (locationText ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[160px] sm:max-w-none">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate" data-testid={`text-location-${profile.id}`}>
                    {locationText}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Monitor className="h-3 w-3 flex-shrink-0" />
                  <span data-testid={`text-location-${profile.id}`}>Virtual Only</span>
                </span>
              ))}
            {showPracticeMode && (
              <>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {getSessionFormatShortLabel(profile.practiceMode)}
                </span>
              </>
            )}
          </div>

          {showSpecialties && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {displayedSpecs.map((spec) => (
                <Badge
                  key={spec}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 leading-4 whitespace-nowrap"
                >
                  {plainText(spec)}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-4">
                  +{remainingCount}
                </Badge>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1 hidden sm:block" />
      </div>
    </Link>
  );
}

function ListSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 sm:px-4 py-3 border-b">
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28 sm:w-32" />
            <Skeleton className="h-3 w-36 sm:w-48" />
            <Skeleton className="h-3 w-20 sm:w-24" />
          </div>
        </div>
      ))}
    </>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function DirectoryBrowserSection({
  props = {},
  syncUrl = true,
}: {
  props?: Record<string, unknown>;
  syncUrl?: boolean;
}) {
  const queryString = useSearch();
  const [, navigate] = useLocation();
  const { settings: directorySettings } = useDirectorySettings();
  const { data: globalSeo } = useGlobalSeo();
  const showSpecialties = directorySettings.showSpecialties;
  const showLanguages = directorySettings.showLanguages;
  const showPracticeMode = directorySettings.showPracticeMode;
  const showAvailabilityStatus = directorySettings.showAvailabilityStatus;
  const showTravelOption = directorySettings.showTravelOption;
  const showLocationFields = directorySettings.showLocationFields;
  const heading = getDirectoryHeading(directorySettings);
  const subheading = getDirectorySubheading(directorySettings);
  const searchPlaceholder = getSearchPlaceholder(directorySettings);
  const showCategoryChips = bool(props.showCategoryChips, true);
  const showMap = bool(props.showMap, true);
  const initParams = useMemo(
    () => new URLSearchParams(syncUrl ? queryString : ""),
    [queryString, syncUrl],
  );

  const [search, setSearch] = useState(initParams.get("search") || "");
  const [sessionFormat, setSessionFormat] = useState(initParams.get("practiceMode") || "all");
  const [specializations, setSpecializations] = useState<string[]>(() => {
    const val = initParams.get("specialization");
    return val ? val.split(",").filter(Boolean) : [];
  });
  const [language, setLanguage] = useState(initParams.get("language") || "all");
  const [country, setCountry] = useState(initParams.get("country") || "all");
  const [acceptingClients, setAcceptingClients] = useState(
    initParams.get("acceptingClients") === "true",
  );
  const [willingToTravel, setWillingToTravel] = useState(
    initParams.get("willingToTravel") === "true",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(parseInt(initParams.get("page") || "1") || 1);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    const updateSectionHeight = () => {
      if (!sectionRef.current) return;
      const { top } = sectionRef.current.getBoundingClientRect();
      setSectionHeight(Math.max(520, Math.round(window.innerHeight - top)));
    };

    updateSectionHeight();
    window.addEventListener("resize", updateSectionHeight);
    return () => window.removeEventListener("resize", updateSectionHeight);
  }, []);

  useEffect(() => {
    if (!syncUrl) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const sp = new URLSearchParams(queryString);
    const specVal = sp.get("specialization");
    setSpecializations(showSpecialties && specVal ? specVal.split(",").filter(Boolean) : []);
    setLanguage(showLanguages ? sp.get("language") || "all" : "all");
    setSessionFormat(showPracticeMode ? sp.get("practiceMode") || "all" : "all");
    setCountry(sp.get("country") || "all");
    setAcceptingClients(showAvailabilityStatus && sp.get("acceptingClients") === "true");
    setWillingToTravel(showTravelOption && sp.get("willingToTravel") === "true");
    const searchParam = sp.get("search") || "";
    if (searchParam !== search) setSearch(searchParam);
    const pageParam = parseInt(sp.get("page") || "1") || 1;
    setPage(pageParam);
  }, [
    queryString,
    search,
    showAvailabilityStatus,
    showLanguages,
    showPracticeMode,
    showSpecialties,
    showTravelOption,
    syncUrl,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    sessionFormat,
    specializations,
    language,
    country,
    acceptingClients,
    willingToTravel,
  ]);

  useEffect(() => {
    if (!syncUrl) return;
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (showSpecialties && specializations.length > 0)
      p.set("specialization", specializations.join(","));
    if (showPracticeMode && sessionFormat !== "all") p.set("practiceMode", sessionFormat);
    if (showLanguages && language !== "all") p.set("language", language);
    if (country !== "all") p.set("country", country);
    if (showAvailabilityStatus && acceptingClients) p.set("acceptingClients", "true");
    if (showTravelOption && willingToTravel) p.set("willingToTravel", "true");
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    const newPath = qs ? `/directory?${qs}` : "/directory";
    isInternalUpdate.current = true;
    navigate(newPath, { replace: true });
  }, [
    debouncedSearch,
    specializations,
    sessionFormat,
    language,
    country,
    acceptingClients,
    willingToTravel,
    page,
    navigate,
    showAvailabilityStatus,
    showLanguages,
    showPracticeMode,
    showSpecialties,
    showTravelOption,
    syncUrl,
  ]);

  const { specializations: specList } = useSpecializations();

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (showSpecialties && specializations.length > 0)
      p.set("specialization", specializations.join(","));
    if (showPracticeMode && sessionFormat !== "all") p.set("practiceMode", sessionFormat);
    if (showLanguages && language !== "all") p.set("language", language);
    if (country !== "all") p.set("country", country);
    if (showAvailabilityStatus && acceptingClients) p.set("acceptingClients", "true");
    if (showTravelOption && willingToTravel) p.set("willingToTravel", "true");
    p.set("page", String(page));
    p.set("pageSize", "20");
    return p.toString();
  }, [
    debouncedSearch,
    specializations,
    sessionFormat,
    language,
    country,
    acceptingClients,
    willingToTravel,
    page,
    showAvailabilityStatus,
    showLanguages,
    showPracticeMode,
    showSpecialties,
    showTravelOption,
  ]);

  const { data, isLoading, isError, refetch } = useQuery<PaginatedTherapists>({
    queryKey: ["/api/therapists", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/therapists?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch therapists");
      return res.json();
    },
  });

  const { data: filterOptions } = useQuery<DirectoryFilterOptions>({
    queryKey: ["/api/therapists/filters"],
  });

  const therapists = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const currentPageSize = data?.pageSize ?? 20;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.ceil(total / currentPageSize);
  const availableSpecializations = useMemo(() => {
    const seen = new Set<string>();
    const values: Array<{ name: string }> = [];
    const add = (value: string | null | undefined) => {
      const clean = plainText(value).trim();
      if (!clean || seen.has(clean.toLowerCase())) return;
      seen.add(clean.toLowerCase());
      values.push({ name: clean });
    };

    therapists.forEach((profile) => profile.specializations?.forEach(add));
    specList.forEach((spec) => add(spec.name));

    return values;
  }, [specList, therapists]);
  const categoryChips = useMemo(() => {
    const experience = getDirectoryExperienceMode(directorySettings);
    const labels =
      availableSpecializations.length > 0
        ? availableSpecializations.slice(0, 10).map((spec) => spec.name)
        : [...fallbackCategoryLabels[experience]];

    return labels.map((label, index) => ({
      icon: categoryIcons[index % categoryIcons.length],
      label,
      slug: label,
    }));
  }, [availableSpecializations, directorySettings]);

  const mapTherapists = useMemo(
    () =>
      therapists.map((t) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
          profileImageUrl: t.user?.profileImageUrl ?? null,
        },
      })),
    [therapists],
  );

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const activeFilterCount = [
    showPracticeMode && sessionFormat !== "all",
    showSpecialties && specializations.length > 0,
    showLanguages && language !== "all",
    country !== "all",
    showAvailabilityStatus && acceptingClients,
    showTravelOption && willingToTravel,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSessionFormat("all");
    setSpecializations([]);
    setLanguage("all");
    setCountry("all");
    setAcceptingClients(false);
    setWillingToTravel(false);
    setSearch("");
  };

  const itemListSchema = useMemo(
    () => buildDirectoryItemListLd(therapists, globalSeo),
    [globalSeo, therapists],
  );

  return (
    <>
      <JsonLd schemas={[itemListSchema]} />
      <div
        ref={sectionRef}
        className="flex min-h-0 flex-col"
        style={sectionHeight ? { height: `${sectionHeight}px` } : undefined}
        data-testid="directory-browser-section"
      >
        {showCategoryChips && showSpecialties && (
          <div
            className="flex-none border-b bg-muted/30 overflow-x-auto"
            data-testid="section-categories"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
              <div className="flex items-center gap-1 min-w-max">
                {categoryChips.map((cat) => {
                  const isActive = specializations.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() =>
                        setSpecializations((prev) =>
                          isActive ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug],
                        )
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`button-category-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 flex overflow-hidden">
          <div
            className={`${
              mobileView === "list" || !showMap ? "flex" : "hidden"
            } md:flex flex-col w-full ${showMap ? "md:w-[340px] lg:w-[380px] xl:w-[420px] border-r flex-shrink-0" : ""} bg-background`}
          >
            <div className="px-3 sm:px-4 py-3 border-b space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1
                    className="sm:text-lg font-heading font-semibold text-[30px]"
                    data-testid="text-directory-heading"
                  >
                    {heading}
                  </h1>
                  {subheading && (
                    <p
                      className="text-sm text-muted-foreground mt-2 max-w-sm"
                      data-testid="text-directory-subheading"
                    >
                      {subheading}
                    </p>
                  )}
                  {!isLoading && !isError && (
                    <p
                      className="text-xs text-muted-foreground flex items-center gap-1 mt-[10px] mb-[10px]"
                      data-testid="text-results-count"
                    >
                      <Users className="h-3 w-3 flex-shrink-0" />
                      {total}{" "}
                      {total === 1
                        ? directorySettings.participantLabelSingular
                        : directorySettings.participantLabelPlural}{" "}
                      available
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant={showFilters ? "default" : "ghost"}
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="button-toggle-filters"
                    aria-label="Toggle filters"
                    className="relative h-9 w-9"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <div className="flex md:hidden items-center gap-1 ml-0.5">
                    <Button
                      size="icon"
                      variant={mobileView === "list" ? "default" : "ghost"}
                      onClick={() => setMobileView("list")}
                      data-testid="button-view-list"
                      aria-label="List view"
                      className="h-9 w-9"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    {showMap && (
                      <Button
                        size="icon"
                        variant={mobileView === "map" ? "default" : "ghost"}
                        onClick={() => setMobileView("map")}
                        data-testid="button-view-map"
                        aria-label="Map view"
                        className="h-9 w-9"
                      >
                        <Map className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                  aria-label={`Search ${directorySettings.participantLabelPlural.toLowerCase()}`}
                />
              </div>

              {showFilters && (
                <div className="space-y-2.5 pt-0.5" data-testid="panel-filters">
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                    {showSpecialties && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground mb-1 block">
                          {directorySettings.specialtyLabelPlural}{" "}
                          {specializations.length > 0 && `(${specializations.length})`}
                        </Label>
                        <div
                          className="border rounded-md max-h-[180px] overflow-y-auto p-1.5 space-y-0.5"
                          data-testid="multi-select-specialization"
                        >
                          {availableSpecializations.map((s) => {
                            const checked = specializations.includes(s.name);
                            return (
                              <label
                                key={s.name}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                                  checked
                                    ? "bg-accent/10 text-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    setSpecializations((prev) =>
                                      checked
                                        ? prev.filter((v) => v !== s.name)
                                        : [...prev, s.name],
                                    )
                                  }
                                  className="h-3.5 w-3.5"
                                  data-testid={`checkbox-spec-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
                                />
                                <span className="truncate">{plainText(s.name)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {showLanguages && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground mb-1 block">
                          Language
                        </Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger
                            className="h-9 text-xs w-full"
                            data-testid="select-language"
                          >
                            <SelectValue placeholder="All Languages" />
                          </SelectTrigger>
                          <SelectContent className="z-[1000] max-h-[280px]">
                            <SelectItem value="all">All Languages</SelectItem>
                            {(filterOptions?.languages ?? []).map((l) => (
                              <SelectItem key={l} value={l}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">
                        Location
                      </Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="h-9 text-xs w-full" data-testid="select-country">
                          <SelectValue placeholder="All Countries" />
                        </SelectTrigger>
                        <SelectContent className="z-[1000] max-h-[280px]">
                          <SelectItem value="all">All Countries</SelectItem>
                          {(filterOptions?.countries ?? []).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {showPracticeMode && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground mb-1 block">
                          {directorySettings.practiceModeLabel}
                        </Label>
                        <Select value={sessionFormat} onValueChange={setSessionFormat}>
                          <SelectTrigger
                            className="h-9 text-xs w-full"
                            data-testid="select-session-format"
                          >
                            <SelectValue placeholder="All Formats" />
                          </SelectTrigger>
                          <SelectContent className="z-[1000]">
                            <SelectItem value="all">All Formats</SelectItem>
                            <SelectItem value="in_person">In-Person</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {showAvailabilityStatus && (
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id="filter-accepting"
                            checked={acceptingClients}
                            onCheckedChange={(checked) => setAcceptingClients(checked === true)}
                            data-testid="checkbox-accepting-clients"
                            className="h-4 w-4"
                          />
                          <Label
                            htmlFor="filter-accepting"
                            className="text-xs cursor-pointer whitespace-nowrap"
                          >
                            {directorySettings.acceptingClientsLabel}
                          </Label>
                        </div>
                      )}
                      {showTravelOption && (
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id="filter-willing-travel"
                            checked={willingToTravel}
                            onCheckedChange={(checked) => setWillingToTravel(checked === true)}
                            data-testid="checkbox-willing-to-travel"
                            className="h-4 w-4"
                          />
                          <Label
                            htmlFor="filter-willing-travel"
                            className="text-xs cursor-pointer whitespace-nowrap"
                          >
                            {directorySettings.willingToTravelLabel}
                          </Label>
                        </div>
                      )}
                    </div>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        data-testid="button-clear-filters"
                        className="text-xs text-muted-foreground h-8"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!showFilters && activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="active-filter-badges">
                  {showSpecialties &&
                    specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs gap-1 max-w-[140px]">
                        <span className="truncate">{spec}</span>
                        <button
                          onClick={() =>
                            setSpecializations((prev) => prev.filter((s) => s !== spec))
                          }
                          aria-label={`Remove ${spec} filter`}
                          className="flex-shrink-0 ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  {showLanguages && language !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {language}
                      <button
                        onClick={() => setLanguage("all")}
                        aria-label={`Remove ${language} filter`}
                        className="flex-shrink-0 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {country !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 max-w-[140px]">
                      <span className="truncate">{country}</span>
                      <button
                        onClick={() => setCountry("all")}
                        aria-label={`Remove ${country} filter`}
                        className="flex-shrink-0 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {showPracticeMode && sessionFormat !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {getSessionFormatLabel(sessionFormat)}
                      <button
                        onClick={() => setSessionFormat("all")}
                        aria-label="Remove session format filter"
                        className="flex-shrink-0 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {showAvailabilityStatus && acceptingClients && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {directorySettings.acceptingClientsLabel}
                      <button
                        onClick={() => setAcceptingClients(false)}
                        aria-label={`Remove ${directorySettings.acceptingClientsLabel.toLowerCase()} filter`}
                        className="flex-shrink-0 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {showTravelOption && willingToTravel && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {directorySettings.willingToTravelLabel}
                      <button
                        onClick={() => setWillingToTravel(false)}
                        aria-label={`Remove ${directorySettings.willingToTravelLabel.toLowerCase()} filter`}
                        className="flex-shrink-0 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
              data-testid="list-therapists"
            >
              {isLoading ? (
                <ListSkeletons />
              ) : isError ? (
                <div
                  role="alert"
                  className="py-16 px-4 text-center"
                  data-testid="directory-load-error"
                >
                  <p className="text-sm font-medium">Unable to load the directory</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please try again in a moment.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              ) : therapists.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 px-4 text-center"
                  data-testid="text-no-results"
                >
                  <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No {directorySettings.participantLabelPlural.toLowerCase()} found
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try adjusting your search or filters
                  </p>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-4"
                      data-testid="button-clear-filters-empty"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                therapists.map((t) => (
                  <TherapistRow
                    key={t.id}
                    profile={t}
                    user={{
                      firstName: t.user?.firstName ?? null,
                      lastName: t.user?.lastName ?? null,
                      profileImageUrl: t.user?.profileImageUrl ?? null,
                    }}
                    isHighlighted={hoveredId === t.id}
                    acceptingLabel={directorySettings.acceptingClientsLabel}
                    showSpecialties={showSpecialties}
                    showPracticeMode={showPracticeMode}
                    showAvailabilityStatus={showAvailabilityStatus}
                    showLocationFields={showLocationFields}
                    onHover={handleHover}
                  />
                ))
              )}

              {totalPages > 1 && (
                <div
                  className="flex items-center justify-center gap-2 py-4 border-t"
                  data-testid="pagination-controls"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground" data-testid="text-page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showMap && (
            <div
              className={`${
                mobileView === "map" ? "flex" : "hidden"
              } md:flex min-h-0 flex-1 flex-col relative`}
            >
              <div className="flex md:hidden items-center gap-2 p-2 border-b bg-background">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMobileView("list")}
                  data-testid="button-back-to-list"
                  className="h-9"
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
                <span className="text-xs text-muted-foreground">
                  {total} result{total !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="min-h-[55vh] flex-1 md:min-h-0">
                <MapView
                  therapists={mapTherapists}
                  height="100%"
                  highlightedId={hoveredId}
                  fitToPins
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DirectoryPage() {
  const { settings: directorySettings } = useDirectorySettings();
  const { data: globalSeo } = useGlobalSeo();
  const heading = getDirectoryHeading(directorySettings);
  const subheading = getDirectorySubheading(directorySettings);
  const baseUrl =
    globalSeo?.siteUrl?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const canonicalUrl = baseUrl ? `${baseUrl}/directory` : "/directory";

  useSeo({
    title: `${heading} | ${globalSeo?.siteName || "Core Platform"}`,
    description: subheading,
    canonical: canonicalUrl,
    ogType: "website",
  });

  const breadcrumbSchema = buildBreadcrumbLd([
    { name: "Home", url: baseUrl || "/" },
    { name: directorySettings.directoryLabelSingular || "Directory", url: canonicalUrl },
  ]);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <JsonLd schemas={[breadcrumbSchema]} />
      <Navbar />
      <DirectoryBrowserSection />

      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24"
        data-testid="section-directory-why-platform-approved"
      >
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=300&h=300&fit=crop&crop=faces"
                alt="Platform-approved provider support"
                className="w-full h-full object-cover"
                data-testid="img-directory-why-platform-approved"
              />
            </div>
          </div>
          <div>
            <h2
              className="font-heading text-2xl sm:text-3xl font-semibold mb-3"
              data-testid="text-directory-why-informed-heading"
            >
              Why Platform Approved?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A trusted directory should make provider qualifications, service formats, specialties,
              and fit easier to understand. Platform-approved listings help members compare options
              with clearer context, reviewed profile details, and practical filters for finding the
              right next step.
            </p>
          </div>
        </div>
      </section>

      <section
        className="relative bg-muted/30 overflow-hidden"
        data-testid="section-directory-vetted"
      >
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <div>
              <h3
                className="font-heading text-xl sm:text-2xl font-semibold mb-6 text-center md:text-left"
                data-testid="text-directory-vetted-means-heading"
              >
                What does it mean to be "vetted"?
              </h3>
              <ul className="space-y-3">
                {vettedMeans.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3"
                    data-testid={`text-directory-vetted-means-${idx}`}
                  >
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className="font-heading text-xl sm:text-2xl font-semibold mb-6 text-center md:text-left"
                data-testid="text-directory-vetted-not-heading"
              >
                What does it NOT mean to be "vetted"?
              </h3>
              <ul className="space-y-3">
                {vettedDoesNotMean.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3"
                    data-testid={`text-directory-vetted-not-${idx}`}
                  >
                    <XCircle className="h-5 w-5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
