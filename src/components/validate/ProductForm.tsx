"use client";

import type { FormEvent } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFormProps {
  product: string;
  niche: string;
  country: string;
  isRunning: boolean;
  onChange: (next: Partial<{ product: string; niche: string; country: string }>) => void;
  onSubmit: () => void;
}

export function ProductForm({
  product,
  niche,
  country,
  isRunning,
  onChange,
  onSubmit,
}: ProductFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product.trim() || isRunning) return;
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card/40 p-5 backdrop-blur"
    >
      <div className="grid gap-4 md:grid-cols-[2fr_1.5fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="product">Producto</Label>
          <Input
            id="product"
            placeholder="Ej: Mini proyector portátil"
            value={product}
            onChange={(e) => onChange({ product: e.target.value })}
            disabled={isRunning}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="niche">Nicho</Label>
          <Input
            id="niche"
            placeholder="Ej: hogar, fitness, mascotas"
            value={niche}
            onChange={(e) => onChange({ niche: e.target.value })}
            disabled={isRunning}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Mercado</Label>
          <Select
            value={country}
            onValueChange={(v) => onChange({ country: (v as string | null) ?? "" })}
            disabled={isRunning}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Mercado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Colombia">Colombia</SelectItem>
              <SelectItem value="México">México</SelectItem>
              <SelectItem value="Argentina">Argentina</SelectItem>
              <SelectItem value="Chile">Chile</SelectItem>
              <SelectItem value="Perú">Perú</SelectItem>
              <SelectItem value="LATAM">LATAM</SelectItem>
              <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isRunning || !product.trim()}
          className="md:self-end"
        >
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Validar producto
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
