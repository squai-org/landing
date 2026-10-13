ALTER TABLE waitlist_signups ADD COLUMN referral_source TEXT
  CHECK (referral_source IN ('instagram', 'linkedin', 'tiktok', 'youtube', 'google', 'otras'));

ALTER TABLE contact_requests ADD COLUMN referral_source TEXT
  CHECK (referral_source IN ('instagram', 'linkedin', 'tiktok', 'youtube', 'google', 'otras'));
