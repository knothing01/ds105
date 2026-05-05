-- =====================================================================
--  FUNCTIONS, PROCEDURES, TRIGGERS, INDEXES (Phase 3)
--  Run AFTER ddl.sql
-- =====================================================================


-- =====================================================================
--  F1. calculate_invoice_total(reservation_id)
--  Computes: Σ(overnight price × nights) + Σ(hourly_rate × hours)
--           + Σ(service charge) + tax − discount
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_invoice_total(p_reservation_id INT)
RETURNS NUMERIC AS $$
DECLARE
    v_overnight NUMERIC(12,2) := 0;
    v_meeting   NUMERIC(12,2) := 0;
    v_services  NUMERIC(12,2) := 0;
    v_tax       NUMERIC(10,2) := 0;
    v_discount  NUMERIC(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(o.price * (ror.check_out - ror.check_in)), 0)
      INTO v_overnight
      FROM reservation_overnight_rooms ror
      JOIN overnight_rooms o
        ON o.overnight_room_number = ror.overnight_room_number
       AND o.hotel_id              = ror.hotel_id
     WHERE ror.reservation_id = p_reservation_id;

    SELECT COALESCE(SUM(
              m.hourly_rate *
              CEIL(EXTRACT(EPOCH FROM (rmr.end_time - rmr.start_time)) / 3600.0)
           ), 0)
      INTO v_meeting
      FROM reservation_meeting_rooms rmr
      JOIN meeting_rooms m
        ON m.meeting_room_number = rmr.meeting_room_number
       AND m.hotel_id            = rmr.hotel_id
     WHERE rmr.reservation_id = p_reservation_id;

    SELECT COALESCE(SUM(s.charge), 0)
      INTO v_services
      FROM reservation_services rs
      JOIN services s
        ON s.hotel_id     = rs.hotel_id
       AND s.service_name = rs.service_name
     WHERE rs.reservation_id = p_reservation_id;

    SELECT COALESCE(i.tax, 0), COALESCE(i.discount, 0)
      INTO v_tax, v_discount
      FROM invoices i
     WHERE i.reservation_id = p_reservation_id;

    RETURN v_overnight + v_meeting + v_services + v_tax - v_discount;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
--  P1. checkout_reservation(reservation_id, payment_type)
-- =====================================================================
CREATE OR REPLACE PROCEDURE checkout_reservation(
    p_reservation_id INT,
    p_payment_type   VARCHAR DEFAULT 'cash'
) LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO invoices(reservation_id, discount, tax)
    VALUES (p_reservation_id, 0, 0)
    ON CONFLICT (reservation_id) DO NOTHING;

    UPDATE overnight_rooms o
       SET status = 'available'
      FROM reservation_overnight_rooms ror
     WHERE ror.reservation_id        = p_reservation_id
       AND o.overnight_room_number   = ror.overnight_room_number
       AND o.hotel_id                = ror.hotel_id;

    UPDATE meeting_rooms m
       SET status = 'available'
      FROM reservation_meeting_rooms rmr
     WHERE rmr.reservation_id      = p_reservation_id
       AND m.meeting_room_number   = rmr.meeting_room_number
       AND m.hotel_id              = rmr.hotel_id;

    UPDATE reservations
       SET reservation_status = 'completed'
     WHERE reservation_id = p_reservation_id;

    INSERT INTO payments(reservation_id, payment_type, status)
    VALUES (p_reservation_id, p_payment_type, 'approved')
    ON CONFLICT (reservation_id) DO UPDATE
       SET payment_type = EXCLUDED.payment_type,
           status       = 'approved',
           date         = CURRENT_TIMESTAMP;
END;
$$;


-- =====================================================================
--  TRIGGERS
-- =====================================================================

-- T1. After approved payment → reservation status becomes 'confirmed'
CREATE OR REPLACE FUNCTION trg_payment_confirms_reservation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
        UPDATE reservations
           SET reservation_status = 'confirmed'
         WHERE reservation_id     = NEW.reservation_id
           AND reservation_status = 'on_hold';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_confirms_reservation
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payment_confirms_reservation();


-- T2. Block user deletion if active/confirmed reservations exist
CREATE OR REPLACE FUNCTION trg_block_user_delete_if_active_reservations()
RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM reservations r
      JOIN customers c ON c.customer_id = r.customer_id
     WHERE c.user_id             = OLD.user_id
       AND r.reservation_status IN ('confirmed','on_hold');

    IF v_count > 0 THEN
        RAISE EXCEPTION
            'Cannot delete user %: % active reservation(s) exist',
            OLD.user_id, v_count;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_user_delete_with_active_reservations
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION trg_block_user_delete_if_active_reservations();


-- =====================================================================
--  INDEXES
-- =====================================================================

CREATE INDEX idx_login_login ON login(login);
CREATE INDEX idx_overnight_rooms_hotel_status ON overnight_rooms(hotel_id, status);
CREATE INDEX idx_invoices_reservation_id ON invoices(reservation_id);
