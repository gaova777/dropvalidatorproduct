-- Drop Validator AI — schema inicial
-- Ejecutar en el SQL editor de Supabase.

CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Producto
    name TEXT NOT NULL,
    niche TEXT,
    country TEXT DEFAULT 'Colombia',

    -- Scores por fase (1-10)
    demand_score REAL,
    competition_score REAL,
    virality_score REAL,
    supplier_score REAL,
    financial_score REAL,

    -- Score final
    total_score REAL,
    verdict TEXT CHECK (verdict IN ('GANADOR','POTENCIAL','RIESGO','NO_RECOMENDADO')),

    -- Análisis AI
    demand_analysis TEXT,
    competition_analysis TEXT,
    virality_analysis TEXT,
    supplier_analysis TEXT,

    -- Financiero
    cost_price REAL,
    shipping_cost REAL,
    selling_price REAL,
    margin_percent REAL,
    return_rate REAL DEFAULT 20,
    return_cost REAL DEFAULT 20000,
    profit_per_100 REAL,

    -- Tracking de negocio
    status TEXT DEFAULT 'validated'
        CHECK (status IN ('validated','testing','selling','dropped')),
    actual_sales INTEGER DEFAULT 0,
    actual_returns INTEGER DEFAULT 0,
    marketplace_url TEXT,
    dropi_product_url TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_total_score ON products(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_verdict ON products(verdict);
CREATE INDEX IF NOT EXISTS idx_products_niche ON products(niche);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
