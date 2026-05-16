import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface WidgetCardProps {
  title?: string;
  subtitle?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  full?: boolean;
  delay?: number;
}

export function WidgetCard({
  title,
  subtitle,
  description,
  children,
  className = "",
  full = false,
  delay = 0,
}: WidgetCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass relative rounded-2xl ${
        full ? "lg:col-span-12" : ""
      } ${className}`}
    >
      {(title || subtitle || description) && (
        <header className="flex items-end justify-between gap-4 px-6 pt-6 pb-3">
          <div className="max-w-3xl">
            {title && (
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {subtitle}
              </p>
            )}
            {description && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80 normal-case">
                {description}
              </p>
            )}
          </div>
        </header>
      )}
      <div className="relative">{children}</div>
    </motion.section>
  );
}
