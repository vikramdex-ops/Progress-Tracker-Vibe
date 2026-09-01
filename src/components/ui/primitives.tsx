import * as React from "react";
import { cn } from "@/lib/utils";

/* Radix Toast — destructured import for JSX usage */
import {
  Provider as ToastProviderPrimitive,
  Root as ToastRoot,
  Title as ToastTitle,
  Description as ToastDescription,
  Action as ToastAction,
  Close as ToastClose,
  Viewport as ToastViewport,
} from "@radix-ui/react-toast";

/* ─────────────────────────────────────────────────────────
 * Surface — foundational container (§5.1 Calm Glass card)
 * Based on existing card.tsx plain-div pattern; NOT Radix Card
 * (the @radix-ui/react-card package does not exist on npm).
 * ───────────────────────────────────────────────────────── */

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "progress" | "completion" | "alert" | "brand";
}

const surfaceVariants = {
  default:
    "bg-(--color-surface-default) border border-(--color-border) shadow-elevated",
  glass: "glass shadow-elevated",
  progress: "surface--progress shadow-elevated",
  completion: "surface--completion shadow-elevated",
  alert: "surface--alert shadow-elevated",
  brand: "surface--brand shadow-elevated",
};

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl p-6 transition-all duration-200",
        "hover:translate-y-[-1px]",
        surfaceVariants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";

/* ─────────────────────────────────────────────────────────
 * SurfaceHeader — companion element for structured card content
 * ───────────────────────────────────────────────────────── */

export const SurfaceHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-3", className)}
    {...props}
  />
));
SurfaceHeader.displayName = "SurfaceHeader";

/* ─────────────────────────────────────────────────────────
 * SurfaceTitle
 * ───────────────────────────────────────────────────────── */

export interface SurfaceTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const SurfaceTitle = React.forwardRef<HTMLHeadingElement, SurfaceTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-base font-semibold text-(--color-text-primary)",
        className,
      )}
      {...props}
    />
  ),
);
SurfaceTitle.displayName = "SurfaceTitle";

/* ─────────────────────────────────────────────────────────
 * SurfaceContent
 * ───────────────────────────────────────────────────────── */

export const SurfaceContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("pt-1 text-(--color-text-secondary)", className)}
    {...props}
  />
));
SurfaceContent.displayName = "SurfaceContent";

/* ─────────────────────────────────────────────────────────
 * SurfaceFooter
 * ───────────────────────────────────────────────────────── */

export const SurfaceFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
SurfaceFooter.displayName = "SurfaceFooter";

/* ─────────────────────────────────────────────────────────
 * Button — single dimension of variance (§5.2)
 * intent × buttonStyle, maps to domain colors.
 * NOTE: prop renamed to `buttonStyle` to avoid colliding with
 * React's native `style` (CSSProperties) prop.
 * ───────────────────────────────────────────────────────── */

export type ButtonIntent =
  | "brand"
  | "progress"
  | "completion"
  | "alert"
  | "neutral";
export type ButtonStyleVariant = "solid" | "outline" | "ghost" | "text";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "size" | "style"
  > {
  intent?: ButtonIntent;
  buttonStyle?: ButtonStyleVariant;
  size?: ButtonSize;
}

const intentColors: Record<ButtonIntent, string> = {
  brand: "var(--color-brand)",
  progress: "var(--color-progress)",
  completion: "var(--color-completion)",
  alert: "var(--color-alert)",
  neutral: "var(--color-text-primary)",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, size = "md", intent = "brand", buttonStyle = "solid", ...props },
    ref,
  ) => {
    const color = intentColors[intent];

    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-semibold transition-all duration-120 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const sizeClasses = {
      sm: "h-9 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
      icon: "h-9 w-9",
    };

    let styleClasses = "";
    let inlineStyle: React.CSSProperties | undefined;

    if (buttonStyle === "solid") {
      styleClasses = "text-white";
      inlineStyle = { backgroundColor: color, color: "white" };
    } else if (buttonStyle === "outline") {
      styleClasses =
        "border border-(--color-border-strong) text-(--color-text-secondary) hover:bg-(--color-surface-raised)";
    } else if (buttonStyle === "ghost") {
      styleClasses =
        "text-(--color-text-secondary) hover:bg-(--color-surface-raised)";
    } else {
      styleClasses =
        "text-(--color-text-secondary) hover:bg-(--color-surface-raised)";
    }

    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(baseClasses, sizeClasses[size], styleClasses, className)}
        style={inlineStyle}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

/* ─────────────────────────────────────────────────────────
 * Badge — 4 intents × 3 styles (§5.4)
 * NOTE: prop renamed to `badgeStyle` to avoid collision with
 * React's native `style` prop.
 * ───────────────────────────────────────────────────────── */

export type BadgeIntent =
  | "progress"
  | "completion"
  | "alert"
  | "brand"
  | "neutral";
export type BadgeStyleVariant = "filled" | "subtle" | "outline";

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  intent?: BadgeIntent;
  badgeStyle?: BadgeStyleVariant;
}

const badgeConfig: Record<
  BadgeIntent,
  { bg: string; text: string; border: string }
> = {
  progress: {
    bg: "var(--color-progress)",
    text: "white",
    border: "var(--color-amber-200)",
  },
  completion: {
    bg: "var(--color-completion)",
    text: "white",
    border: "var(--color-emerald-200)",
  },
  alert: {
    bg: "var(--color-alert)",
    text: "white",
    border: "var(--color-red-200)",
  },
  brand: {
    bg: "var(--color-brand)",
    text: "white",
    border: "var(--color-brand-200)",
  },
  neutral: {
    bg: "var(--color-surface-raised)",
    text: "var(--color-text-secondary)",
    border: "var(--color-border)",
  },
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    { className, intent = "neutral", badgeStyle = "filled", ...props },
    ref,
  ) => {
    const cfg = badgeConfig[intent];

    const bg =
      badgeStyle === "filled"
        ? cfg.bg
        : badgeStyle === "subtle"
          ? `color-mix(in oklch, ${cfg.bg}, transparent 88%)`
          : "transparent";

    const color =
      badgeStyle === "filled"
        ? cfg.text
        : badgeStyle === "subtle"
          ? cfg.bg
          : cfg.bg;

    const borderColor =
      badgeStyle === "outline" ? cfg.border : "transparent";

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
          className,
        )}
        style={{ backgroundColor: bg, color: color, borderColor }}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

/* ─────────────────────────────────────────────────────────
 * Notification system — Radix Toast based (§5.10)
 * ───────────────────────────────────────────────────────── */

type ToastVariant = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

const variantColors: Record<ToastVariant, string> = {
  info: "var(--color-brand)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

export const NotificationContext = React.createContext<{
  notify: (n: Omit<Notification, "id">) => void;
} | null>(null);

export function useNotification() {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return ctx;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<Notification[]>([]);

  const notify = React.useCallback((n: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, ...n }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <ToastProviderPrimitive>
        {toasts.map((toast) => (
          <ToastRoot
            key={toast.id}
            className="group"
            duration={toast.variant === "error" ? 100000 : undefined}
          >
            <ToastTitle
              style={{
                color: variantColors[toast.variant ?? "info"],
              }}
            >
              {toast.title}
            </ToastTitle>
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
            <ToastClose aria-label="Close">×</ToastClose>
          </ToastRoot>
        ))}
        <ToastViewport className="fixed top-5 right-5 z-[100] flex flex-col gap-2" />
      </ToastProviderPrimitive>
    </NotificationContext.Provider>
  );
};

/* ToastContainer — standalone, for explicit toast rendering */
export const ToastContainer: React.FC<{
  toasts: Notification[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <>
      {toasts.map((toast) => (
        <ToastRoot
          key={toast.id}
          className="group"
          duration={toast.variant === "error" ? 100000 : 5000}
        >
          <ToastTitle
            style={{ color: variantColors[toast.variant ?? "info"] }}
          >
            {toast.title}
          </ToastTitle>
          {toast.description && (
            <ToastDescription>{toast.description}</ToastDescription>
          )}
          <ToastClose aria-label="Close" onClick={() => onDismiss(toast.id)}>
            ×
          </ToastClose>
        </ToastRoot>
      ))}
      <ToastViewport className="fixed top-5 right-5 z-[100] flex flex-col gap-2" />
    </>
  );
};

/* ─────────────────────────────────────────────────────────
 * Re-exports
 * ───────────────────────────────────────────────────────── */
export {
  Surface,
  SurfaceTitle,
  Button,
  Badge,
  NotificationProvider as ToastProvider,
};
