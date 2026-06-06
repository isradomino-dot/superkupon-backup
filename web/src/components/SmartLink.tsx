"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { usePrefetchOnHover } from "@/lib/use-prefetch-on-hover";

type Props = Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    children: ReactNode;
    /** Override default hover delay (ms). */
    prefetchDelay?: number;
  };

/**
 * Drop-in replacement for Next.js Link with hover-prefetch superpower.
 * On hover (150ms hold), triggers router.prefetch(href) — making the
 * next click feel instant.
 */
export function SmartLink({ href, prefetchDelay, children, ...rest }: Props) {
  const hover = usePrefetchOnHover(href, prefetchDelay);
  return (
    <Link href={href} {...hover} {...rest}>
      {children}
    </Link>
  );
}
