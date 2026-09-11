-- Migración inicial: tablas de captura de leads de squai.io
-- D1 es SQLite. Aplicar con `wrangler d1 migrations apply squai-leads`.
-- https://developers.cloudflare.com/d1/reference/migrations/

-- Formulario "Reserva tu lugar en la próxima cohorte" (Waitlist.astro).
-- Un correo = un lugar en la lista, por eso email es UNIQUE y el endpoint
-- hace upsert en vez de duplicar filas.
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  country_code  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  phone_e164    TEXT NOT NULL,
  source_page   TEXT,
  ip_country    TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at
  ON waitlist_signups (created_at DESC);

-- Formulario "Agenda una llamada" (ContactModal.astro), compartido por los
-- ecosistemas Grow y Learn. Cada envío es una solicitud distinta: se guardan
-- todas, sin deduplicar por correo.
CREATE TABLE IF NOT EXISTS contact_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ecosystem     TEXT NOT NULL CHECK (ecosystem IN ('grow', 'learn')),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  organization  TEXT NOT NULL,
  role          TEXT,
  country_code  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  phone_e164    TEXT NOT NULL,
  team_size     TEXT NOT NULL CHECK (team_size IN ('menos-10', '10-30', '30-100', 'mas-100')),
  message       TEXT,
  source_page   TEXT,
  ip_country    TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_email
  ON contact_requests (email);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
  ON contact_requests (created_at DESC);
