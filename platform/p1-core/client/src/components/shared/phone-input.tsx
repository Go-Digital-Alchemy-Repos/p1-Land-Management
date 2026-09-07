import { forwardRef, useCallback } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatPhoneNumber } from "@/lib/phone-utils";

export const PhoneInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ onChange, onFocus, className, value, ...props }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        onChange?.({
          ...e,
          target: { ...e.target, value: formatted },
          currentTarget: { ...e.currentTarget, value: formatted },
        } as React.ChangeEvent<HTMLInputElement>);
      },
      [onChange],
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (!e.target.value) {
          onChange?.({
            ...e,
            type: "change",
            target: { ...e.target, value: "+" },
            currentTarget: { ...e.currentTarget, value: "+" },
          } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onFocus?.(e);
      },
      [onChange, onFocus],
    );

    return (
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          type="tel"
          value={value ?? ""}
          onChange={handleChange}
          onFocus={handleFocus}
          className={cn("pl-9", className)}
          placeholder="+1 (555) 123-4567"
          maxLength={25}
          inputMode="tel"
          autoComplete="tel"
          {...props}
        />
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
