-- Sample data for paquetes - Run this after treatments exist
-- Insert sample paquetes
INSERT INTO paquetes (codigo, nombre, descripcion, precio_total, moneda, max_pacientes) VALUES
('B001', 'Paquete Familiar Básico', 'Incluye limpieza general, revisión y fluorización para toda la familia', 5000.00, 'HNL', 4),
('B002', 'Paquete Ortodóntico Infantil', 'Tratamiento completo de ortodoncia para niños con controles mensuales', 12000.00, 'HNL', 1),
('B003', 'Paquete de Blanqueamiento', 'Sesión de blanqueamiento dental con kit profesional', 1500.00, 'HNL', 1);

-- Insert sample treatments for packages
-- NOTE: Only run this after you have treatments with IDs 1, 2, and 3
INSERT INTO paquetes_tratamientos (paquete_id, tratamiento_id, cantidad) VALUES
(1, 1, 1), -- Paquete Familiar -> Limpieza general (treatment_id = 1)
(2, 2, 12), -- Paquete Ortodóntico -> Tratamiento completo (treatment_id = 2)
(3, 3, 1); -- Paquete Blanqueamiento -> Sesión de blanqueamiento (treatment_id = 3)
