import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  autoPrependHttps?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoPrependHttps, onFocus, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (autoPrependHttps && event.currentTarget.value === "") {
        const nextValue = "https://";
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
        descriptor?.set?.call(event.currentTarget, nextValue);
        event.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
        requestAnimationFrame(() => {
          innerRef.current?.setSelectionRange(nextValue.length, nextValue.length);
        });
      }
      onFocus?.(event);
    };

    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={setRefs}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
