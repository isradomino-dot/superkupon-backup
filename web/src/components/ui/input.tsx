import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — shadcn/ui new-york primitive.
 *
 * NOTE: globals.css carries legacy `input[type="text"|"search"|"url"] { ... !important }`
 * overrides (bg #1e1b2e, border #2d2a3f, violet focus). Those coincidentally match
 * the shadcn dark tokens (--card / --border / --ring), so this Input renders on-brand
 * even though the !important rules win over `bg-transparent border-input`. When we need
 * per-Input customisation later, narrow that global override rather than fight it here.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
