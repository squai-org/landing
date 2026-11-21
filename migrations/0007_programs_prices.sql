
CREATE TABLE programs (
  code        TEXT PRIMARY KEY,
  description TEXT NOT NULL CHECK (length(description) BETWEEN 2 AND 100),
  starts_on   TEXT,
  ends_on     TEXT,
  schedule    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO programs (code, description, created_at, updated_at)
SELECT code, description, strftime('%Y-%m-%dT%H:%M:%fZ', updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', updated_at)
FROM payment_plans;

UPDATE programs
SET starts_on = '2027-01-26',
    ends_on = '2027-02-18',
    schedule = 'Martes y jueves de 6:30 a 9:00 p. m. (hora de Colombia)'
WHERE code = 'squai-one';

CREATE TABLE program_prices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  program_code TEXT NOT NULL REFERENCES programs (code),
  currency     TEXT NOT NULL CHECK (currency IN ('COP', 'USD')),
  amount       INTEGER NOT NULL CHECK (typeof(amount) = 'integer'),
  valid_from   TEXT NOT NULL,
  CHECK ((currency = 'COP' AND amount >= 1000) OR (currency = 'USD' AND amount > 0)),
  UNIQUE (program_code, currency, valid_from)
);

INSERT INTO program_prices (program_code, currency, amount, valid_from)
SELECT code, currency, amount,
  strftime('%Y-%m-%dT%H:%M:%fZ', min(updated_at, datetime('now', '-1 second')))
FROM payment_plans;

INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES
  ('squai-one', 'COP', 440000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('squai-one', 'USD', 147, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('squai-one', 'COP', 550000, '2027-01-01T05:00:00.000Z'),
  ('squai-one', 'USD', 185, '2027-01-01T05:00:00.000Z');

DROP TABLE payment_plans;

ALTER TABLE orders ADD COLUMN tax TEXT;
