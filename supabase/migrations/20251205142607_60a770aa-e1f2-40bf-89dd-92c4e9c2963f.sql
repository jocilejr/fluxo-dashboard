-- Tornar whatsapp_number opcional (o telefone vem da URL no momento do acesso)
ALTER TABLE delivery_products ALTER COLUMN whatsapp_number DROP NOT NULL;
ALTER TABLE delivery_products ALTER COLUMN whatsapp_number SET DEFAULT '';