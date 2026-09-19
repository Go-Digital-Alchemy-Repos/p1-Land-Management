import { str } from "./block-renderer.shared";
export function galleryBlockSettings(props: Record<string, unknown>) {
  return {
    layout: str(props.layout) === "inherit" || !str(props.layout) ? undefined : str(props.layout),
    columnsDesktop: Number(props.columnsDesktop ?? 3),
    columnsTablet: Number(props.columnsTablet ?? 2),
    columnsMobile: Number(props.columnsMobile ?? 1),
    spacing: (str(props.spacing) || "md") as "none" | "sm" | "md" | "lg",
    imageRatio: (str(props.imageRatio) || "4/3") as "auto" | "1/1" | "4/3" | "3/2" | "16/9",
    cropMode: (str(props.cropMode) || "cover") as "cover" | "contain",
    borderRadius: (str(props.borderRadius) || "md") as "none" | "sm" | "md" | "lg",
    hoverEffect: (str(props.hoverEffect) || "zoom") as "none" | "zoom" | "fade",
    maxImages: Number(props.maxImages ?? 0),
    transitionEffect: (str(props.transitionEffect) || "none") as "none" | "fade" | "slide" | "zoom",
    arrowIconColor: str(props.arrowIconColor) || undefined,
    arrowBackgroundColor: str(props.arrowBackgroundColor) || undefined,
    showTitle: props.showTitle === false ? false : undefined,
    showCaptions: props.showCaptions === false ? false : undefined,
    lightbox: props.lightbox === false ? false : undefined,
  };
}
