"use client";

import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import type { ProductImage } from "@/lib/types";

interface ImageStripProps {
  images: ProductImage[];
  query: string;
}

export function ImageStrip({ images, query }: ImageStripProps) {
  if (!images || images.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-xs text-muted-foreground flex items-center gap-2">
        <ImageOff className="size-3.5" />
        <span>
          No se encontraron imágenes para &quot;{query}&quot; en DuckDuckGo. La validación
          continúa sin esta verificación visual.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Verificación visual — ¿es el mismo producto que viste en Dropi?
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {images.length} resultados · DuckDuckGo
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {images.map((image, i) => (
          <ImageThumb key={`${image.url}-${i}`} image={image} />
        ))}
      </div>
    </div>
  );
}

function ImageThumb({ image }: { image: ProductImage }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <a
        href={image.source}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex aspect-square items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:border-primary/40"
        title={image.title}
      >
        <ImageOff className="size-5" />
      </a>
    );
  }

  return (
    <a
      href={image.source}
      target="_blank"
      rel="noreferrer noopener"
      className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-all hover:border-primary/40"
      title={`${image.title} · ${image.source_domain}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.title}
        loading="lazy"
        onError={() => setErrored(true)}
        className="size-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent p-1.5">
        <p className="flex items-center gap-1 truncate text-[10px] text-foreground/90">
          <ExternalLink className="size-2.5 shrink-0" />
          <span className="truncate">{image.source_domain}</span>
        </p>
      </div>
    </a>
  );
}
