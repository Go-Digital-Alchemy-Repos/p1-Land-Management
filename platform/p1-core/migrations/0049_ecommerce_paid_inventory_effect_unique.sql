CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_inventory_adjustments_paid_order_effect
  ON ecommerce_inventory_adjustments (order_id, variant_id)
  WHERE order_id IS NOT NULL AND reason = 'order_paid';
