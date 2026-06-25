import type { ReactNode } from "react";

interface FeatureRowProps {
  heading: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
  children: ReactNode;
}

export function FeatureRow({ heading, image, imageAlt, reverse, children }: FeatureRowProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className={`space-y-6 ${reverse ? "md:order-2" : ""}`}>
        <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
          {heading}
        </h2>
        <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
          {children}
        </div>
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        <img
          src={image}
          alt={imageAlt}
          className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
          loading="lazy"
        />
      </div>
    </div>
  );
}
