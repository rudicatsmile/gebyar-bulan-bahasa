"use client";

import * as React from "react";
import { parseBrandParts } from "@/lib/hooks/useEventSettings";

/**
 * Renders a brand name with the second word/part highlighted in `text-accent`.
 *
 * "Gebyar Bulan Bahasa" → <span>Gebyar</span><span class="text-accent">Bulan Bahasa</span>
 * "GebyarBulanBahasa" (CamelCase) → Gebyar<span class="text-accent">BulanBahasa</span>
 */
export function BrandText({ name }: { name?: string }) {
  const { first, second } = parseBrandParts(name);
  if (!second) return <>{first}</>;
  return (
    <>
      {first}
      <span className="text-accent">{second}</span>
    </>
  );
}

/**
 * Inline helper — use this inside JSX where you need the styled brand name.
 * Usage: {renderBrandText(settings.eventShortName)}
 */
export function renderBrandText(name?: string): React.ReactNode {
  const { first, second } = parseBrandParts(name);
  if (!second) return <React.Fragment>{first}</React.Fragment>;
  return (
    <React.Fragment>
      {first}
      <span className="text-accent">{second}</span>
    </React.Fragment>
  );
}
