import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "ghost" | "accent" | "tape";

const variants: Record<ButtonVariant, string> = {
  default: "bg-ink text-paper border-ink",
  ghost: "bg-transparent text-ink border-edge",
  accent: "bg-accent border-accent text-white hover:shadow-[2px_2px_0_var(--color-ink)]",
  tape: "bg-tape border-tape text-white hover:shadow-[2px_2px_0_var(--color-ink)]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "small";
}

export function Button({
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-mono text-xs font-semibold uppercase tracking-wide border-[1.5px] cursor-pointer",
        "transition-[transform,box-shadow] duration-75 whitespace-nowrap",
        "hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0_var(--color-accent)]",
        "active:translate-x-0 active:translate-y-0 active:shadow-none",
        "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
        size === "default" && "px-4 py-2.5",
        size === "small" && "px-2.5 py-1.5 text-[11px]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
