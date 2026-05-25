import { ValidationFlow } from "@/components/validate/ValidationFlow";

export const metadata = {
  title: "Validador — Drop Validator AI",
};

export default function ValidatePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Drop Validator AI
        </p>
        <h1 className="text-3xl font-semibold">Validá tu próximo producto</h1>
        <p className="text-sm text-muted-foreground">
          Datos reales de Mercado Libre Colombia — ventas, listings, sellers,
          precios. Sin IA, sin alucinaciones. Vos sumás el cálculo financiero.
        </p>
      </header>

      <ValidationFlow />
    </div>
  );
}
