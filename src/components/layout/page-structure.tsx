"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PageCustomProperties = {
  "--page-max-width"?: string;
  "--page-gap"?: string;
  "--page-padding-x"?: string;
  "--page-padding-y"?: string;
  "--page-padding-x-sm"?: string;
  "--page-padding-y-sm"?: string;
  "--page-padding-x-lg"?: string;
  "--page-padding-y-lg"?: string;
};

type PageContainerStyle = React.CSSProperties & PageCustomProperties;

type PageContainerProps<T extends React.ElementType = "section"> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  style?: PageContainerStyle;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "style">;

const defaultContainerVars: PageCustomProperties = {
  "--page-max-width": "80rem",
  "--page-gap": "1.5rem",
  "--page-padding-x": "1rem",
  "--page-padding-y": "1.5rem",
  "--page-padding-x-sm": "1.5rem",
  "--page-padding-y-sm": "1.75rem",
  "--page-padding-x-lg": "2rem",
  "--page-padding-y-lg": "2.25rem",
};

export function PageContainer<T extends React.ElementType = "section">({
  as,
  children,
  className,
  fullWidth = false,
  style,
  ...rest
}: PageContainerProps<T>) {
  const Component = (as ?? "section") as React.ElementType;
  const mergedStyle = React.useMemo<PageContainerStyle>(
    () => ({ ...defaultContainerVars, ...(style ?? {}) }),
    [style]
  );

  return (
    <Component
      {...rest}
      style={mergedStyle}
      className={cn(
        "mx-auto flex w-full flex-col gap-[var(--page-gap)]",
        "px-[var(--page-padding-x)] py-[var(--page-padding-y)]",
        "sm:px-[var(--page-padding-x-sm,var(--page-padding-x))] sm:py-[var(--page-padding-y-sm,var(--page-padding-y))]",
        "lg:px-[var(--page-padding-x-lg,var(--page-padding-x-sm,var(--page-padding-x)))]",
        "lg:py-[var(--page-padding-y-lg,var(--page-padding-y-sm,var(--page-padding-y)))]",
        !fullWidth && "max-w-[var(--page-max-width)]",
        className
      )}
    >
      {children}
    </Component>
  );
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  align?: "start" | "center";
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  align = "start",
  className,
  children,
  ...rest
}: PageHeaderProps) {
  const isCentered = align === "center";

  return (
    <div
      {...rest}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          isCentered && "text-center sm:text-start"
        )}
      >
        {eyebrow ? (
          <span className="text-sm font-semibold text-primary/80 sm:text-base">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-balance text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

type PageSectionProps<T extends React.ElementType = "section"> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  surface?: boolean;
  padded?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function PageSection<T extends React.ElementType = "section">({
  as,
  children,
  className,
  surface = true,
  padded = true,
  ...rest
}: PageSectionProps<T>) {
  const Component = (as ?? "section") as React.ElementType;

  return (
    <Component
      {...rest}
      className={cn(
        "flex w-full flex-col gap-4",
        surface &&
          "rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm dark:bg-muted/40",
        padded && "p-4 sm:p-6 lg:p-8",
        !padded && surface && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </Component>
  );
}
