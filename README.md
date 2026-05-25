# Drop Validator AI

Herramienta de validación de productos de dropshipping antes de publicarlos en Marketplace, TikTok Shop o Instagram. **Sin LLMs, sin alucinaciones, sin costo de API.** Pega contra **Mercado Libre Colombia** (API pública oficial) y aplica un scoring determinístico con datos reales: ventas históricas, listings activos, sellers únicos, precios y % de envío gratis. Vos sumás el cálculo financiero.

> **No es un proyecto portfolio.** Es una herramienta para decidir qué publicar y cuánto invertir en cada producto.

## ¿Por qué data-driven y no IA agéntica?

Un LLM "validando" un producto inventa scores subjetivos basados en snippets de búsqueda — no reproducible, no auditable, **$0.25 USD por validación**. Mercado Libre te dice exactamente cuántas ventas tiene cada listing del producto, en tu país, hoy. Es **gratis, reproducible y en 3 segundos**.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript estricto
- Tailwind CSS v4 + shadcn/ui (base preset, base-ui primitives)
- Zustand para state, Recharts para gráficos, sonner para toasts
- Mercado Libre API pública (sin auth) — `api.mercadolibre.com/sites/MCO/search`
- Supabase (Postgres) opcional para persistencia
- pnpm + Vercel

## Setup local

1. Instalá las dependencias:
   ```bash
   pnpm install
   ```

2. (Opcional) Copiá las variables de entorno para conectar Supabase:
   ```bash
   cp env.example .env.local
   ```
   **La app funciona sin ninguna env var** — solo necesitás Supabase si querés persistir el historial.

3. (Opcional) Creá la tabla en Supabase:
   - En el SQL editor de tu proyecto pegá `supabase/migrations/001_create_products.sql`.
   - Copiá `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

4. Arrancá el servidor:
   ```bash
   pnpm dev
   ```
   Abrí http://localhost:3000 — te redirige a `/validate`.

> ⚠️ **Si tu red local bloquea `api.mercadolibre.com`** (algunas redes universitarias / corporativas filtran ese dominio), las validaciones van a fallar en dev pero **andan perfecto desde Vercel** porque las requests salen desde la red de Vercel, no la tuya.

## Páginas

| Ruta | Qué hace |
| --- | --- |
| `/validate` | Formulario + datos reales por fase + calculadora de margen |
| `/ranking` | Tabla sorteable de productos validados, exportable a CSV |
| `/history` | Cards con las últimas 100 validaciones, recientes arriba |

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/validate` | Consulta Mercado Libre y devuelve scores + datos crudos |
| `GET`  | `/api/products` | Lista paginada con filtros (`niche`, `min_score`, `verdict`, `status`, `sort`, `order`) |
| `GET`  | `/api/products/[id]` | Detalle |
| `PATCH`| `/api/products/[id]` | Actualiza margen / status / notas (recalcula score total) |
| `DELETE`| `/api/products/[id]` | Borra |
| `GET`  | `/api/products/export` | Descarga CSV |

## Fuentes de datos por fase

| Fase | Fuente | Estado |
| --- | --- | --- |
| **Demanda** | `sold_quantity` de Mercado Libre + interés 12m + ratio 3m/9m de Google Trends | ✅ Activo |
| **Competencia** | `total_listings` + sellers únicos + concentración | ✅ Activo |
| **Proveedor** | % envío gratis, condición nuevo, sellers únicos, rango de precio | ✅ Activo (proxy) |
| **Viralidad** | TikTok Creative Center | ⏳ Pendiente (Fase 3) |
| **Financiero** | Calculadora con devoluciones + COGS + flete | ✅ Activo |

### ⚠️ OAuth de Mercado Libre

ML bloquea con HTTP 403 cualquier IP cloud (Vercel/AWS) que no traiga OAuth Bearer token. Para que la app funcione en producción:

1. Andá a https://developers.mercadolibre.com.co/devcenter
2. **Crear aplicación** — cualquier nombre, callback URL dummy (`https://drop-validator-product.vercel.app`)
3. Copiá **App ID** y **Secret Key**
4. En Vercel → Settings → Environment Variables, agregá:
   - `MERCADOLIBRE_CLIENT_ID` = el App ID
   - `MERCADOLIBRE_CLIENT_SECRET` = la Secret Key
5. Redeploy

El cliente hace `grant_type=client_credentials` y cachea el token 6h en memoria del lambda. Sin estas vars, Google Trends sigue funcionando solo como demanda (la app no se rompe, solo pierde precisión).

## Modelo de scoring

| Fase | Peso |
| --- | --- |
| Demanda | 30% |
| Competencia | 25% |
| Viralidad | 15% |
| Proveedor | 15% |
| Financiero | 15% |

Veredicto:

- ≥ 7.5 → **GANADOR**
- ≥ 6.0 → **POTENCIAL**
- ≥ 4.0 → **RIESGO**
- < 4.0 → **NO RECOMENDADO**

## Deploy

1. Subí el repo a GitHub (`Gaova777/dropValidatorProduct`).
2. Conectá el proyecto en Vercel — autodetecta Next.js.
3. Configurá las env vars de Supabase si querés persistir.
4. Cada push a `main` redeploya automáticamente.

## Costos reales

| Item | Costo |
| --- | --- |
| Vercel Hobby | $0 |
| Supabase Free | $0 (500 MB) |
| Mercado Libre API | $0 (pública, sin auth) |
| **Total** | **$0/mes** |

## Roadmap

- [x] **Fase 1**: Mercado Libre Colombia para demand/competition/supplier (con OAuth)
- [x] **Fase 2**: Google Trends (estacionalidad + tendencia 12m vs 3m)
- [ ] **Fase 3**: TikTok Creative Center scraper para virality
- [ ] **Fase 4**: Dropi API para supplier real (requiere cuenta + key)
- [ ] **Fase 5**: Meta Ads Library para validar competencia publicitaria
