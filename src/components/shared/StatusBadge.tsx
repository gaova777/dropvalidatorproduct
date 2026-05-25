import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Verdict, ProductStatus } from "@/lib/types";

const VERDICT_STYLES: Record<Verdict, string> = {
  GANADOR:
    "border-success/40 bg-success/15 text-success",
  POTENCIAL:
    "border-primary/40 bg-primary/15 text-primary",
  RIESGO:
    "border-warning/40 bg-warning/15 text-warning",
  NO_RECOMENDADO:
    "border-danger/40 bg-danger/15 text-danger",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  GANADOR: "Ganador",
  POTENCIAL: "Potencial",
  RIESGO: "Riesgo",
  NO_RECOMENDADO: "No recomendado",
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  validated: "Validado",
  testing: "Testeando",
  selling: "Vendiendo",
  dropped: "Descartado",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", VERDICT_STYLES[verdict])}
    >
      {VERDICT_LABEL[verdict]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge variant="outline" className="font-medium text-muted-foreground">
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export { VERDICT_LABEL, STATUS_LABEL };
