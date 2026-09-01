-- Exact Decimal Monetary Storage Migration
-- Converts Float monetary columns to DECIMAL(12, 2) in PostgreSQL

ALTER TABLE "Product" 
  ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING "price"::DECIMAL(12, 2),
  ALTER COLUMN "mrp" TYPE DECIMAL(12, 2) USING "mrp"::DECIMAL(12, 2);

ALTER TABLE "Order" 
  ALTER COLUMN "subtotal" TYPE DECIMAL(12, 2) USING "subtotal"::DECIMAL(12, 2);

ALTER TABLE "OrderItem" 
  ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING "price"::DECIMAL(12, 2),
  ALTER COLUMN "total" TYPE DECIMAL(12, 2) USING "total"::DECIMAL(12, 2);

ALTER TABLE "OrderPayment" 
  ALTER COLUMN "amount" TYPE DECIMAL(12, 2) USING "amount"::DECIMAL(12, 2);

ALTER TABLE "Bill" 
  ALTER COLUMN "subtotal" TYPE DECIMAL(12, 2) USING "subtotal"::DECIMAL(12, 2),
  ALTER COLUMN "discount" TYPE DECIMAL(12, 2) USING "discount"::DECIMAL(12, 2),
  ALTER COLUMN "finalAmount" TYPE DECIMAL(12, 2) USING "finalAmount"::DECIMAL(12, 2);
