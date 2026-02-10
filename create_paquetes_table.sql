-- Create paquetes table for treatment bundles
CREATE TABLE IF NOT EXISTS paquetes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_total NUMERIC(10,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'HNL',
    max_pacientes INTEGER NOT NULL DEFAULT 1,
    veces_vendido INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for paquetes and tratamientos relationship
CREATE TABLE IF NOT EXISTS paquetes_tratamientos (
    id SERIAL PRIMARY KEY,
    paquete_id INTEGER REFERENCES paquetes(id) ON DELETE CASCADE,
    tratamiento_id INTEGER REFERENCES tratamientos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paquetes_codigo ON paquetes(codigo);
CREATE INDEX IF NOT EXISTS idx_paquetes_activo ON paquetes(activo);
CREATE INDEX IF NOT EXISTS idx_paquetes_tratamientos_paquete_id ON paquetes_tratamientos(paquete_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_tratamientos_tratamiento_id ON paquetes_tratamientos(tratamiento_id);

-- Insert sample data
INSERT INTO paquetes (codigo, nombre, descripcion, precio_total, moneda, max_pacientes) VALUES
('B001', 'Paquete Familiar Básico', 'Incluye limpieza general, revisión y fluorización para toda la familia', 5000.00, 'HNL', 4),
('B002', 'Paquete Ortodóntico Infantil', 'Tratamiento completo de ortodoncia para niños con controles mensuales', 12000.00, 'HNL', 1),
('B003', 'Paquete de Blanqueamiento', 'Sesión de blanqueamiento dental con kit profesional', 1500.00, 'HNL', 1);

-- Insert sample treatments for packages
INSERT INTO paquetes_tratamientos (paquete_id, tratamiento_id, cantidad) VALUES
(1, 1, 1), -- Paquete Familiar -> Limpieza general
(2, 2, 12), -- Paquete Ortodóntico -> Tratamiento completo
(3, 3, 1); -- Paquete Blanqueamiento -> Sesión de blanqueamiento
