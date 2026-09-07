import { TeamMemberPicker } from "./team-member-picker";
import { STALE_TIMES } from "@/lib/queryClient";
import { Component, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import type { BlockDef, PropDef } from "./block-registry";
import { CmsImageUpload } from "../components/cms-image-upload";
import { ImagePositionPicker } from "../components/image-position-picker";
import { CmsRichTextEditor } from "./cms-rich-text-editor";
import type { CmsForm, CmsGalleryWithItems, CmsPage } from "@shared/schema";

interface BlockEditorProps {
  blockDef: BlockDef;
  blockType?: string;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
  mode?: "full" | "contextual";
  onOpenAdvanced?: () => void;
}

const PROP_DISPLAY_PRIORITY: Record<string, number> = {
  badge: 5,
  eyebrow: 10,
  sectionEyebrow: 11,
  title: 20,
  heading: 21,
  accentHeading: 22,
  headingColor: 23,
  accentHeadingColor: 24,
  subtitle: 30,
  subheading: 31,
  subheadingColor: 32,
  headingLevel: 35,
  sectionHeadingLevel: 36,
  alignment: 40,
  textAlign: 41,
  sectionHeadingAlignment: 42,
  content: 50,
  body: 51,
  ctaAction: 52,
  ctaOpenInNewTab: 52.5,
  ctaFormSlug: 53,
  ctaModalTitle: 54,
  ctaModalDescription: 55,
  primaryAction: 56,
  primaryOpenInNewTab: 56.5,
  primaryFormSlug: 57,
  primaryModalTitle: 58,
  primaryModalDescription: 59,
  secondaryAction: 60,
  secondaryOpenInNewTab: 60.5,
  secondaryFormSlug: 61,
  secondaryModalTitle: 62,
  secondaryModalDescription: 63,
};

const DEFAULT_COLOR_VALUE = "#ffffff";
const DEFAULT_RADIAL_GRADIENT_COLOR = "#89cda1";
const POSITION_PICKER_KEYS = new Set([
  "backgroundPositionX",
  "backgroundPositionY",
  "sectionBackgroundPositionX",
  "sectionBackgroundPositionY",
]);

const SECTION_STYLE_KEYS = new Set([
  "sectionBackgroundColor",
  "sectionBackgroundImageUrl",
  "sectionBackgroundPositionX",
  "sectionBackgroundPositionY",
  "sectionBackgroundOverlayColor",
  "sectionBackgroundOverlayOpacity",
  "sectionShowRadialGradient",
  "sectionRadialGradientColor",
  "sectionRadialGradientPosition",
  "sectionBorderTopWidth",
  "sectionBorderTopColor",
  "sectionBorderBottomWidth",
  "sectionBorderBottomColor",
  "sectionPaddingTop",
  "sectionPaddingBottom",
]);

const SECTION_SETTING_KEYS = new Set([
  ...SECTION_STYLE_KEYS,
  "backgroundImageUrl",
  "backgroundPositionX",
  "backgroundPositionY",
  "videoBackgroundUrl",
  "overlayColor",
  "overlayOpacity",
  "layout",
  "minHeight",
]);

const IMAGE_POSITION_FIELD_GROUPS = [
  {
    imageKey: "imageUrl",
    positionXKey: "mobileImagePositionX",
    positionYKey: "mobileImagePositionY",
  },
  {
    imageKey: "backgroundImageUrl",
    positionXKey: "backgroundPositionX",
    positionYKey: "backgroundPositionY",
  },
  {
    imageKey: "sectionBackgroundImageUrl",
    positionXKey: "sectionBackgroundPositionX",
    positionYKey: "sectionBackgroundPositionY",
  },
];

type InspectorGroup = "content" | "media" | "layout" | "settings";

const GROUP_METADATA: Record<InspectorGroup, { label: string; description: string }> = {
  content: {
    label: "Content",
    description: "Headings, copy, calls to action, and the words people actually read.",
  },
  media: {
    label: "Media",
    description: "Images, videos, thumbnails, and image focal positioning.",
  },
  layout: {
    label: "Layout",
    description: "Alignment, column counts, widths, spacing, and structural arrangement.",
  },
  settings: {
    label: "Settings",
    description:
      "Section backgrounds, overlays, styles, visibility toggles, and appearance controls.",
  },
};

const LAYOUT_KEYS = new Set([
  "alignment",
  "textAlign",
  "sectionHeadingAlignment",
  "sectionHeadingLevel",
  "headingLevel",
  "columns",
  "layout",
  "position",
  "imagePosition",
  "imageWidth",
  "videoAspect",
  "minHeight",
  "experienceLevel",
  "topSpacing",
  "bottomSpacing",
]);

const SETTINGS_KEY_FRAGMENTS = [
  "color",
  "variant",
  "style",
  "theme",
  "show",
  "enable",
  "opacity",
  "icon",
];

const MEDIA_KEY_FRAGMENTS = [
  "image",
  "background",
  "thumbnail",
  "video",
  "media",
  "focal",
  "positionx",
  "positiony",
];

const CONTEXTUAL_PRIORITY: Record<string, number> = {
  badge: 5,
  eyebrow: 8,
  title: 10,
  heading: 11,
  accentHeading: 12,
  subtitle: 20,
  subheading: 21,
  content: 30,
  body: 31,
  ctaText: 40,
  ctaLink: 41,
  ctaAction: 42,
  ctaOpenInNewTab: 42.5,
  ctaFormSlug: 43,
  ctaModalTitle: 44,
  ctaModalDescription: 45,
  ctaSecondaryText: 42,
  ctaSecondaryLink: 43,
  ctaSecondaryOpenInNewTab: 43.5,
  primaryLink: 46.2,
  primaryAction: 46,
  primaryOpenInNewTab: 46.5,
  primaryFormSlug: 47,
  primaryModalTitle: 48,
  primaryModalDescription: 49,
  secondaryLink: 50.2,
  secondaryAction: 50,
  secondaryOpenInNewTab: 50.5,
  secondaryFormSlug: 51,
  secondaryModalTitle: 52,
  secondaryModalDescription: 53,
  imageUrl: 50,
  backgroundImageUrl: 51,
  thumbnailUrl: 52,
  sectionBackgroundImageUrl: 53,
  alignment: 60,
  textAlign: 61,
  layout: 62,
  columns: 63,
  imageWidth: 64,
  imagePosition: 65,
};

function humanizeBlockType(type: string) {
  return type.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferFallbackPropDef(key: string, value: unknown): PropDef | null {
  if (typeof value === "boolean") {
    return { key, label: humanizeBlockType(key), type: "boolean" };
  }

  if (typeof value === "number") {
    return { key, label: humanizeBlockType(key), type: "number" };
  }

  if (typeof value === "string") {
    const normalizedKey = key.toLowerCase();
    const label = humanizeBlockType(key);

    if (normalizedKey.includes("image") && normalizedKey.includes("url")) {
      return { key, label, type: "image-url", placeholder: "Upload or select image" };
    }

    if (
      normalizedKey.endsWith("link") ||
      normalizedKey.endsWith("url") ||
      normalizedKey.includes("link")
    ) {
      return { key, label, type: "url", placeholder: "Enter a link" };
    }

    if (value.includes("<") || value.includes("\n") || value.length > 140) {
      return { key, label, type: "textarea", placeholder: `Enter ${label.toLowerCase()}` };
    }

    return { key, label, type: "text", placeholder: `Enter ${label.toLowerCase()}` };
  }

  return null;
}

export function createFallbackBlockDef(
  blockType: string,
  values: Record<string, unknown>,
): BlockDef {
  const propDefs = Object.entries(values)
    .map(([key, value]) => inferFallbackPropDef(key, value))
    .filter((propDef): propDef is PropDef => Boolean(propDef));

  return {
    type: blockType,
    label: `${humanizeBlockType(blockType)} (Compatibility Mode)`,
    iconName: "Settings2",
    description:
      "This block is using a compatibility editor because its normal inspector fields could not be loaded.",
    category: "content",
    defaultProps: values,
    propDefs,
  };
}

function getActionControllerKey(key: string) {
  if (key === "link" || key === "formSlug" || key === "modalTitle" || key === "modalDescription") {
    return "action";
  }

  if (key.endsWith("FormSlug")) return `${key.slice(0, -"FormSlug".length)}Action`;
  if (key.endsWith("ModalTitle")) return `${key.slice(0, -"ModalTitle".length)}Action`;
  if (key.endsWith("ModalDescription")) return `${key.slice(0, -"ModalDescription".length)}Action`;
  if (key.endsWith("OpenInNewTab")) return `${key.slice(0, -"OpenInNewTab".length)}Action`;
  if (key.endsWith("Link")) return `${key.slice(0, -"Link".length)}Action`;

  return null;
}

function getLinkKeyForActionController(actionControllerKey: string) {
  if (actionControllerKey === "action") return "link";
  if (actionControllerKey.endsWith("Action")) {
    return `${actionControllerKey.slice(0, -"Action".length)}Link`;
  }
  return null;
}

function isInternalHref(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed === "";
}

function normalizeButtonActionValue(key: string, values: Record<string, unknown>) {
  const actionControllerKey = key.endsWith("Action") ? key : getActionControllerKey(key);
  if (!actionControllerKey) return "custom-link";

  const rawAction = String(values[actionControllerKey] ?? "internal-link");
  if (rawAction === "internal-link" || rawAction === "custom-link" || rawAction === "form-modal") {
    return rawAction;
  }

  if (rawAction === "url") {
    const linkKey = getLinkKeyForActionController(actionControllerKey);
    const linkValue = linkKey ? String(values[linkKey] ?? "") : "";
    return isInternalHref(linkValue) ? "internal-link" : "custom-link";
  }

  return "custom-link";
}

function isButtonLinkFieldKey(key: string) {
  return key === "link" || key.endsWith("Link");
}

function getDynamicPropLabel(
  propDef: Pick<PropDef, "key" | "label">,
  values: Record<string, unknown>,
) {
  if (isButtonLinkFieldKey(propDef.key)) {
    const actionValue = normalizeButtonActionValue(propDef.key, values);
    if (actionValue === "internal-link") {
      return propDef.label.replace("Link", "Internal Page");
    }
    if (actionValue === "custom-link") {
      return propDef.label.replace("Link", "Custom Link");
    }
  }

  return propDef.label;
}

function shouldRenderConditionalField(
  propDef: Pick<PropDef, "key">,
  values: Record<string, unknown>,
) {
  const actionControllerKey = getActionControllerKey(propDef.key);
  if (!actionControllerKey) return true;

  const actionValue = normalizeButtonActionValue(propDef.key, values);

  if (propDef.key === "link" || propDef.key.endsWith("Link")) {
    return actionValue === "internal-link" || actionValue === "custom-link";
  }

  if (propDef.key === "openInNewTab" || propDef.key.endsWith("OpenInNewTab")) {
    return actionValue === "custom-link";
  }

  if (
    propDef.key === "formSlug" ||
    propDef.key === "modalTitle" ||
    propDef.key === "modalDescription" ||
    propDef.key.endsWith("FormSlug") ||
    propDef.key.endsWith("ModalTitle") ||
    propDef.key.endsWith("ModalDescription")
  ) {
    return actionValue === "form-modal";
  }

  return true;
}

function defaultColorValueForKey(key: string) {
  if (key === "overlayColor" || key === "sectionBackgroundOverlayColor") return "#000000";
  return key === "sectionRadialGradientColor" ? DEFAULT_RADIAL_GRADIENT_COLOR : DEFAULT_COLOR_VALUE;
}

function normalizeColorValue(value: string, key: string) {
  const trimmed = value.trim();
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(trimmed) ? trimmed : defaultColorValueForKey(key);
}

function orderPropDefs(propDefs: PropDef[]) {
  return propDefs
    .map((propDef, index) => ({ propDef, index }))
    .sort((a, b) => {
      const aPriority = PROP_DISPLAY_PRIORITY[a.propDef.key] ?? 1000;
      const bPriority = PROP_DISPLAY_PRIORITY[b.propDef.key] ?? 1000;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.index - b.index;
    })
    .map(({ propDef }) => propDef);
}

function inferInspectorGroup(propDef: PropDef): InspectorGroup {
  const normalizedKey = propDef.key.toLowerCase();

  if (SECTION_SETTING_KEYS.has(propDef.key)) return "settings";
  if (propDef.key.endsWith("Action") || getActionControllerKey(propDef.key)) return "content";
  if (propDef.type === "image-url") return "media";
  if (POSITION_PICKER_KEYS.has(propDef.key)) return "media";
  if (MEDIA_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))) return "media";
  if (LAYOUT_KEYS.has(propDef.key)) return "layout";
  if (SETTINGS_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment)))
    return "settings";
  if (propDef.type === "color" || propDef.type === "boolean") return "settings";

  return "content";
}

function getContextualPropDefs(propDefs: PropDef[]) {
  const filtered = propDefs.filter((propDef) => {
    const key = propDef.key.toLowerCase();

    if (SECTION_SETTING_KEYS.has(propDef.key)) return false;
    if (propDef.type === "color") return false;
    if (key.includes("overlay") || key.includes("padding")) return false;

    if (propDef.type === "image-url") return true;
    if (propDef.type === "richtext") return true;
    if (propDef.type === "array-items") return true;
    if (Object.prototype.hasOwnProperty.call(CONTEXTUAL_PRIORITY, propDef.key)) return true;
    if (LAYOUT_KEYS.has(propDef.key)) return true;

    return false;
  });

  const sorted = filtered.sort((a, b) => {
    const aPriority = CONTEXTUAL_PRIORITY[a.key] ?? 1000;
    const bPriority = CONTEXTUAL_PRIORITY[b.key] ?? 1000;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return propDefs.indexOf(a) - propDefs.indexOf(b);
  });

  if (sorted.length > 0) {
    return sorted.slice(0, 8);
  }

  return propDefs.filter((propDef) => !SECTION_SETTING_KEYS.has(propDef.key)).slice(0, 6);
}

function getLayoutAwarePropDefs(
  blockType: string,
  props: Record<string, unknown>,
  propDefs: PropDef[],
) {
  if (blockType !== "gallery") return propDefs;

  const layout = String(props.layout ?? "inherit");
  if (layout === "inherit") return propDefs;

  const usesVisibleCount = layout === "grid" || layout === "masonry" || layout === "carousel";
  const usesTransition = layout === "carousel" || layout === "slider" || layout === "featured";
  const showsControlColors = usesTransition || props.lightbox !== false;
  const countAndSpacingKeys = new Set([
    "columnsDesktop",
    "columnsTablet",
    "columnsMobile",
    "spacing",
  ]);
  const transitionKeys = new Set(["transitionEffect"]);
  const controlColorKeys = new Set(["arrowIconColor", "arrowBackgroundColor"]);

  return propDefs.filter((propDef) => {
    if (countAndSpacingKeys.has(propDef.key)) return usesVisibleCount;
    if (transitionKeys.has(propDef.key)) return usesTransition;
    if (controlColorKeys.has(propDef.key)) return showsControlColors;
    return true;
  });
}

function shouldUseRichTextEditor(propDef: Pick<PropDef, "type" | "key">) {
  return (
    propDef.type === "richtext" ||
    propDef.key === "subtitle" ||
    propDef.key === "subheading" ||
    propDef.key === "answer"
  );
}

function ArrayItemsField({
  propDef,
  value,
  onChange,
}: {
  propDef: PropDef;
  value: Record<string, unknown>[];
  onChange: (val: Record<string, unknown>[]) => void;
}) {
  const schema = propDef.itemSchema ?? [];
  const { data: forms = [] } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.LIVE,
    enabled: schema.some((field) => field.type === "form-select"),
  });
  const { data: pages = [] } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
    staleTime: STALE_TIMES.LIVE,
    enabled: schema.some((field) => field.type === "url" && isButtonLinkFieldKey(field.key)),
  });

  const addItem = () => {
    const blank: Record<string, unknown> = {};
    schema.forEach((s) => {
      if (s.key === "action" || s.key.endsWith("Action")) {
        blank[s.key] = "internal-link";
        return;
      }
      blank[s.key] = s.type === "boolean" ? false : "";
    });
    onChange([...value, blank]);
  };

  const removeItem = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, val: unknown) => {
    const next = value.map((item, i) => (i === idx ? { ...item, [key]: val } : item));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Item {idx + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => removeItem(idx)}
              data-testid={`array-item-remove-${idx}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {schema.map((field) =>
            shouldRenderConditionalField(field, item) ? (
              <div key={field.key} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {getDynamicPropLabel(field, item)}
                </Label>
                {field.type === "boolean" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={Boolean(item[field.key])}
                      onCheckedChange={(checked) => updateItem(idx, field.key, checked)}
                      data-testid={`array-item-${idx}-${field.key}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item[field.key] ? "Yes" : "No"}
                    </span>
                  </div>
                ) : field.type === "image-url" ? (
                  <CmsImageUpload
                    value={String(item[field.key] ?? "")}
                    onChange={(url) => updateItem(idx, field.key, url)}
                    data-testid={`array-item-${idx}-${field.key}`}
                  />
                ) : field.type === "textarea" ? (
                  shouldUseRichTextEditor(field) ? (
                    <CmsRichTextEditor
                      value={String(item[field.key] ?? "")}
                      onChange={(val) => updateItem(idx, field.key, val)}
                      placeholder={field.placeholder}
                      data-testid={`array-item-${idx}-${field.key}-richtext`}
                    />
                  ) : (
                    <Textarea
                      value={String(item[field.key] ?? "")}
                      onChange={(e) => updateItem(idx, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={2}
                      className="text-xs"
                    />
                  )
                ) : field.type === "richtext" ? (
                  <CmsRichTextEditor
                    value={String(item[field.key] ?? "")}
                    onChange={(val) => updateItem(idx, field.key, val)}
                    placeholder={field.placeholder}
                    data-testid={`array-item-${idx}-${field.key}-richtext`}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={
                      field.key === "action" || field.key.endsWith("Action")
                        ? normalizeButtonActionValue(field.key, item)
                        : String(item[field.key] ?? "")
                    }
                    onValueChange={(val) => updateItem(idx, field.key, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "form-select" ? (
                  <Select
                    value={String(item[field.key] ?? "")}
                    onValueChange={(val) => updateItem(idx, field.key, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select form…" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms
                        .filter((form) => form.kind !== "application")
                        .map((form) => (
                          <SelectItem key={form.slug} value={form.slug} className="text-xs">
                            {form.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "url" &&
                  isButtonLinkFieldKey(field.key) &&
                  normalizeButtonActionValue(field.key, item) === "internal-link" ? (
                  <Select
                    value={String(item[field.key] ?? "")}
                    onValueChange={(val) => updateItem(idx, field.key, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select internal page…" />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((page) => {
                        const path =
                          page.slug === "home" || page.slug === "" ? "/" : `/${page.slug}`;
                        return (
                          <SelectItem key={page.id} value={path} className="text-xs">
                            {page.title}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={String(item[field.key] ?? "")}
                    onChange={(e) => updateItem(idx, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    autoPrependHttps={field.type === "url"}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ) : null,
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={addItem}
        data-testid="array-items-add"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add {propDef.label.replace(/s$/, "")}
      </Button>
    </div>
  );
}

function PropField({
  propDef,
  value,
  onChange,
  values,
}: {
  propDef: PropDef;
  value: unknown;
  onChange: (val: unknown) => void;
  values: Record<string, unknown>;
}) {
  const { data: forms = [] } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.LIVE,
    enabled: propDef.type === "form-select",
  });
  const { data: pages = [] } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
    staleTime: STALE_TIMES.LIVE,
    enabled: propDef.type === "url" && isButtonLinkFieldKey(propDef.key),
  });
  const { data: galleries = [] } = useQuery<CmsGalleryWithItems[]>({
    queryKey: ["/api/admin/cms/galleries"],
    staleTime: STALE_TIMES.LIVE,
    enabled: propDef.type === "gallery-select",
  });
  const strVal = String(value ?? "");
  const numVal = Number(value ?? 0);
  const boolVal = propDef.key === "isActive" ? value !== false : Boolean(value);
  const useRichTextEditor = shouldUseRichTextEditor(propDef);
  const actionValue = normalizeButtonActionValue(propDef.key, values);

  switch (propDef.type) {
    case "text":
    case "url":
      if (useRichTextEditor && propDef.type !== "url") {
        return (
          <CmsRichTextEditor
            value={strVal}
            onChange={onChange}
            placeholder={propDef.placeholder}
            data-testid={`prop-richtext-${propDef.key}`}
          />
        );
      }
      if (
        propDef.type === "url" &&
        isButtonLinkFieldKey(propDef.key) &&
        actionValue === "internal-link"
      ) {
        return (
          <Select
            value={strVal}
            onValueChange={onChange}
            data-testid={`prop-page-select-${propDef.key}`}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select internal page…" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => {
                const path = page.slug === "home" || page.slug === "" ? "/" : `/${page.slug}`;
                return (
                  <SelectItem key={page.id} value={path}>
                    {page.title}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={propDef.placeholder}
          autoPrependHttps={propDef.type === "url"}
          className="text-sm"
          data-testid={`prop-input-${propDef.key}`}
        />
      );
    case "textarea":
      if (useRichTextEditor) {
        return (
          <CmsRichTextEditor
            value={strVal}
            onChange={onChange}
            placeholder={propDef.placeholder}
            data-testid={`prop-richtext-${propDef.key}`}
          />
        );
      }
      return (
        <Textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={propDef.placeholder}
          rows={4}
          className="text-sm"
          data-testid={`prop-textarea-${propDef.key}`}
        />
      );
    case "richtext":
      return (
        <CmsRichTextEditor
          value={strVal}
          onChange={onChange}
          placeholder={propDef.placeholder}
          data-testid={`prop-richtext-${propDef.key}`}
        />
      );
    case "image-url":
      return (
        <CmsImageUpload
          value={strVal}
          onChange={(url) => onChange(url)}
          data-testid={`prop-image-${propDef.key}`}
        />
      );
    case "team-select":
      return <TeamMemberPicker value={value} onChange={onChange} />;
    case "gallery-select":
      return (
        <Select value={strVal} onValueChange={onChange} data-testid={`prop-gallery-${propDef.key}`}>
          <SelectTrigger>
            <SelectValue placeholder="Select gallery…" />
          </SelectTrigger>
          <SelectContent>
            {galleries
              .filter((gallery) => gallery.status === "published")
              .map((gallery) => (
                <SelectItem key={gallery.id} value={gallery.id}>
                  {gallery.title} ({gallery.imageCount})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );
    case "select":
    case "form-select":
      return (
        <Select
          value={
            propDef.key.endsWith("Action")
              ? normalizeButtonActionValue(propDef.key, values)
              : strVal
          }
          onValueChange={onChange}
          data-testid={`prop-select-${propDef.key}`}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(propDef.type === "form-select"
              ? forms
                  .filter((form) => form.kind !== "application")
                  .map((form) => ({ label: form.name, value: form.slug }))
              : (propDef.options ?? [])
            ).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={boolVal}
            onCheckedChange={onChange}
            data-testid={`prop-switch-${propDef.key}`}
          />
          <span className="text-sm text-muted-foreground">{boolVal ? "Enabled" : "Disabled"}</span>
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          value={numVal}
          min={propDef.min}
          max={propDef.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-sm"
          data-testid={`prop-number-${propDef.key}`}
        />
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeColorValue(strVal, propDef.key)}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 rounded-md border border-input bg-background p-1 cursor-pointer"
            data-testid={`prop-color-swatch-${propDef.key}`}
          />
          <Input
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={propDef.placeholder ?? defaultColorValueForKey(propDef.key)}
            className="text-sm font-mono"
            data-testid={`prop-color-${propDef.key}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange("")}
            data-testid={`prop-color-clear-${propDef.key}`}
          >
            Clear
          </Button>
        </div>
      );
    case "array-items":
      return (
        <ArrayItemsField
          propDef={propDef}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

export function BlockEditor({
  blockDef,
  blockType: _blockType,
  props,
  onChange,
  mode = "full",
  onOpenAdvanced,
}: BlockEditorProps) {
  const setProp = (key: string, val: unknown) => {
    onChange({ ...props, [key]: val });
  };
  const orderedPropDefs = useMemo(
    () => orderPropDefs(getLayoutAwarePropDefs(blockDef.type, props, blockDef.propDefs)),
    [blockDef.propDefs, blockDef.type, props],
  );
  const groupedPropDefs = useMemo(() => {
    const groups: Record<InspectorGroup, PropDef[]> = {
      content: [],
      media: [],
      layout: [],
      settings: [],
    };

    for (const propDef of orderedPropDefs) {
      groups[inferInspectorGroup(propDef)].push(propDef);
    }

    return groups;
  }, [orderedPropDefs]);

  const availableGroups = (Object.keys(groupedPropDefs) as InspectorGroup[]).filter(
    (group) => groupedPropDefs[group].length > 0,
  );
  const defaultGroup = availableGroups[0] ?? "content";
  const contextualPropDefs = useMemo(
    () => getContextualPropDefs(orderedPropDefs),
    [orderedPropDefs],
  );
  const contextualGroups = useMemo(() => {
    const groups: Record<InspectorGroup, PropDef[]> = {
      content: [],
      media: [],
      layout: [],
      settings: [],
    };

    for (const propDef of contextualPropDefs) {
      groups[inferInspectorGroup(propDef)].push(propDef);
    }

    return (Object.keys(groups) as InspectorGroup[])
      .filter((group) => groups[group].length > 0)
      .map((group) => ({
        group,
        propDefs: groups[group],
      }));
  }, [contextualPropDefs]);

  const renderPropList = (propDefs: PropDef[]) =>
    propDefs.map((propDef, idx) => {
      if (!shouldRenderConditionalField(propDef, props)) return null;
      if (POSITION_PICKER_KEYS.has(propDef.key)) return null;

      const imagePositionFieldGroup = IMAGE_POSITION_FIELD_GROUPS.find(
        (group) => group.imageKey === propDef.key,
      );
      const backgroundImageUrl = imagePositionFieldGroup
        ? String(props[imagePositionFieldGroup.imageKey] ?? "")
        : "";
      const hasPositionProps = imagePositionFieldGroup
        ? propDefs.some((p) => p.key === imagePositionFieldGroup.positionXKey)
        : false;

      return (
        <div key={propDef.key}>
          {idx > 0 && propDef.type === "array-items" && <Separator className="mb-4" />}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{getDynamicPropLabel(propDef, props)}</Label>
            <PropField
              propDef={propDef}
              value={props[propDef.key]}
              values={props}
              onChange={(val) => setProp(propDef.key, val)}
            />
          </div>
          {imagePositionFieldGroup && hasPositionProps && backgroundImageUrl && (
            <div className="mt-3">
              <ImagePositionPicker
                imageUrl={backgroundImageUrl}
                positionX={Number(props[imagePositionFieldGroup.positionXKey] ?? 50)}
                positionY={Number(props[imagePositionFieldGroup.positionYKey] ?? 50)}
                onPositionChange={(x, y) => {
                  onChange({
                    ...props,
                    [imagePositionFieldGroup.positionXKey]: x,
                    [imagePositionFieldGroup.positionYKey]: y,
                  });
                }}
              />
            </div>
          )}
        </div>
      );
    });

  const editorIntro = (
    <div className="space-y-1 bg-background">
      <p className="text-sm font-semibold">{blockDef.label}</p>
      <p className="text-xs text-muted-foreground">{blockDef.description}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {mode === "contextual" ? (
        <div className="space-y-4">
          {editorIntro}
          <Separator />
          {contextualGroups.length > 0 ? (
            contextualGroups.map(({ group, propDefs }) => (
              <div key={group} className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_METADATA[group].label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {GROUP_METADATA[group].description}
                  </p>
                </div>
                {renderPropList(propDefs)}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              This section does not have common inline controls yet. Use advanced settings for full
              editing.
            </p>
          )}

          <Separator />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Need backgrounds, overlays, detailed styling, or less common fields?
            </p>
            {onOpenAdvanced && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenAdvanced}>
                More Settings
              </Button>
            )}
          </div>
        </div>
      ) : availableGroups.length <= 1 ? (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
            {editorIntro}
          </div>
          <div className="px-0 pb-8">{renderPropList(groupedPropDefs[defaultGroup])}</div>
        </div>
      ) : (
        <Tabs defaultValue={defaultGroup} className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-border/70 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
            {editorIntro}
            <TabsList
              className={`grid w-full ${
                availableGroups.length === 2
                  ? "grid-cols-2"
                  : availableGroups.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
              }`}
            >
              {availableGroups.map((group) => (
                <TabsTrigger key={group} value={group} className="text-xs">
                  {GROUP_METADATA[group].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {availableGroups.map((group) => (
            <TabsContent key={group} value={group} className="mt-0 space-y-4 pb-8">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{GROUP_METADATA[group].label}</p>
                <p className="text-xs text-muted-foreground">{GROUP_METADATA[group].description}</p>
              </div>
              {renderPropList(groupedPropDefs[group])}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

type BlockEditorBoundaryProps = {
  blockKey: string;
  fallback: ReactNode;
  children: ReactNode;
};

type BlockEditorBoundaryState = {
  hasError: boolean;
};

class BlockEditorBoundary extends Component<BlockEditorBoundaryProps, BlockEditorBoundaryState> {
  state: BlockEditorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: BlockEditorBoundaryProps) {
    if (prevProps.blockKey !== this.props.blockKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function ResilientBlockEditor({
  blockDef,
  blockType,
  props,
  onChange,
  mode = "full",
  onOpenAdvanced,
}: BlockEditorProps) {
  const resolvedBlockType = blockType ?? blockDef.type;
  const fallbackDef = useMemo(
    () => createFallbackBlockDef(resolvedBlockType, props),
    [resolvedBlockType, props],
  );

  const fallbackEditor = (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 px-3 py-3 text-sm text-amber-900">
        Some inspector controls for this block could not be loaded, so we’ve switched to
        compatibility mode for this section.
      </div>
      <BlockEditor
        blockDef={fallbackDef}
        blockType={resolvedBlockType}
        props={props}
        onChange={onChange}
        mode={mode}
        onOpenAdvanced={onOpenAdvanced}
      />
    </div>
  );

  return (
    <BlockEditorBoundary
      blockKey={`${resolvedBlockType}:${Object.keys(props).join("|")}`}
      fallback={fallbackEditor}
    >
      <BlockEditor
        blockDef={blockDef}
        blockType={resolvedBlockType}
        props={props}
        onChange={onChange}
        mode={mode}
        onOpenAdvanced={onOpenAdvanced}
      />
    </BlockEditorBoundary>
  );
}
