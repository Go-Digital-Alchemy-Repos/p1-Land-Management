interface FramedImageProps {
  src: string;
  alt: string;
  reverse?: boolean;
  aspectClassName?: string;
}

export function FramedImage({ src, alt, reverse, aspectClassName = "aspect-[4/3]" }: FramedImageProps) {
  return (
    <div className="relative">
      <div
        className={`absolute h-full w-full rounded-[4px] bg-primary ${reverse ? "-right-4 -top-4" : "-left-4 -top-4"}`}
        style={{ opacity: 0.9 }}
      />
      <div
        className={`absolute h-24 w-24 rounded-[4px] bg-clay ${reverse ? "-bottom-5 -left-5" : "-bottom-5 -right-5"}`}
      />
      <div
        className="relative overflow-hidden rounded-[4px] border-4 border-white"
        style={{ boxShadow: "0 40px 70px -34px hsl(215 45% 15%)" }}
      >
        <img src={src} alt={alt} {...responsiveImageProps(src)} className={`w-full object-cover ${aspectClassName}`} loading="lazy" />
      </div>
    </div>
  );
}
import { responsiveImageProps } from "@/lib/responsive-images";
