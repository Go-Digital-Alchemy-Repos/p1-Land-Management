import { useEffect, useId } from "react";
import type { JsonLdObject } from "@/lib/structured-data";

interface JsonLdProps {
  schemas: (JsonLdObject | null | undefined)[];
}

export function JsonLd({ schemas }: JsonLdProps) {
  const uid = useId().replace(/:/g, "");
  const valid = schemas.filter((s): s is JsonLdObject => !!s);

  useEffect(() => {
    if (valid.length === 0) return;

    const scripts: HTMLScriptElement[] = valid.map((schema, i) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `ld-json-${uid}-${i}`;
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [JSON.stringify(valid), uid]);

  return null;
}
