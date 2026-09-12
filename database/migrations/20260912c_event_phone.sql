-- Calendario — patient phone number on events (ported from patient-form).
--
-- Stored on each event like `procedure`/`dentist`: `phone` keeps the number
-- formatted per the selected country (e.g. 9999-9999 for Honduras) and
-- `phone_country` keeps the dialing code shown in the modal select (same split
-- as patient-form's `telefono`/`codigopais`). Displayed in the EventModal next
-- to Procedimiento and in the detail drawer as "+{code} {number}".
--
-- ⚠️ Safe to re-run (idempotent): ADD COLUMN IF NOT EXISTS.

ALTER TABLE events ADD COLUMN IF NOT EXISTS phone VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS phone_country VARCHAR(8) NOT NULL DEFAULT '504';