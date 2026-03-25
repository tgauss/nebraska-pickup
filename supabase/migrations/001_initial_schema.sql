-- Nebraska Devaney Pickup & Fulfillment Logistics App
-- Initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(12) UNIQUE NOT NULL,
  segment CHAR(1) NOT NULL CHECK (segment IN ('A', 'B', 'C', 'D', 'E')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  drive_minutes INTEGER NOT NULL DEFAULT 0,
  size VARCHAR(2) NOT NULL DEFAULT 'S' CHECK (size IN ('S', 'M', 'L', 'XL')),
  shipping_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  needs_pickup_scheduling BOOLEAN NOT NULL DEFAULT FALSE,
  offer_pickup_conversion BOOLEAN NOT NULL DEFAULT FALSE,
  offer_ship_to_pickup BOOLEAN NOT NULL DEFAULT FALSE,
  ship_as_normal BOOLEAN NOT NULL DEFAULT FALSE,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  vip_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_token ON customers(token);
CREATE INDEX idx_customers_segment ON customers(segment);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shopify_order_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);

-- ============================================================
-- LINE ITEMS
-- ============================================================
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  item_type VARCHAR(6) NOT NULL CHECK (item_type IN ('pickup', 'ship')),
  fulfillment_preference VARCHAR(6) NOT NULL DEFAULT 'ship' CHECK (fulfillment_preference IN ('ship', 'pickup')),
  fulfillment_status VARCHAR(12) NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'confirmed', 'staged', 'picked_up', 'ship_queued', 'shipped', 'no_show'))
);

CREATE INDEX idx_line_items_customer ON line_items(customer_id);
CREATE INDEX idx_line_items_order ON line_items(order_id);

-- ============================================================
-- TIME SLOTS
-- ============================================================
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  UNIQUE(day, time)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  status VARCHAR(12) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'no_show')),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id)
);

CREATE INDEX idx_bookings_time_slot ON bookings(time_slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_customer ON activity_log(customer_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Public read access to time_slots (anyone can see availability)
CREATE POLICY "Time slots are viewable by everyone"
  ON time_slots FOR SELECT USING (true);

-- Public read access for customers by token (personalized page)
CREATE POLICY "Customers viewable by token"
  ON customers FOR SELECT USING (true);

-- Public read access to orders and line_items (accessed via customer token lookup)
CREATE POLICY "Orders viewable"
  ON orders FOR SELECT USING (true);

CREATE POLICY "Line items viewable"
  ON line_items FOR SELECT USING (true);

-- Public read/insert for bookings (customer can book)
CREATE POLICY "Bookings viewable"
  ON bookings FOR SELECT USING (true);

CREATE POLICY "Bookings insertable"
  ON bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Bookings updatable"
  ON bookings FOR UPDATE USING (true);

-- Line items updatable (for fulfillment preference toggles)
CREATE POLICY "Line items updatable"
  ON line_items FOR UPDATE USING (true);

-- Time slots updatable (for booking count)
CREATE POLICY "Time slots updatable"
  ON time_slots FOR UPDATE USING (true);

-- Activity log insertable by anyone
CREATE POLICY "Activity log insertable"
  ON activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Activity log viewable"
  ON activity_log FOR SELECT USING (true);

-- ============================================================
-- FUNCTION: Increment booking count atomically
-- ============================================================
CREATE OR REPLACE FUNCTION increment_booking_count(slot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE time_slots
  SET current_bookings = current_bookings + 1
  WHERE id = slot_id AND current_bookings < capacity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot is full or does not exist';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Decrement booking count atomically
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_booking_count(slot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE time_slots
  SET current_bookings = GREATEST(current_bookings - 1, 0)
  WHERE id = slot_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REALTIME: Enable realtime for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE time_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
