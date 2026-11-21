
CREATE TABLE program_limits (
  program_code TEXT PRIMARY KEY REFERENCES programs (code),
  opens_at     TEXT NOT NULL,
  closes_at    TEXT NOT NULL,
  capacity     INTEGER NOT NULL CHECK (typeof(capacity) = 'integer' AND capacity > 0),
  CHECK (closes_at > opens_at)
);

INSERT INTO program_limits (program_code, opens_at, closes_at, capacity) VALUES
  ('squai-one', '2026-12-01T05:00:00.000Z', '2027-01-23T05:00:00.000Z', 30);

ALTER TABLE programs
  ADD COLUMN closed_manually INTEGER NOT NULL DEFAULT 0 CHECK (closed_manually IN (0, 1));
