import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-transparent text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(99,102,241,0.2)] hover:bg-primary/92",
        secondary: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/70",
        outline:
          "bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-accent-foreground",
        destructive:
          "bg-destructive/14 text-destructive hover:bg-destructive/18",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-11 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
