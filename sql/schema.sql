-- Run this in your Supabase SQL editor to create the full budget schema

CREATE TABLE budget_profile (
  profile_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE budget_period (
  period_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES budget_profile(profile_id) ON DELETE CASCADE,
  label         text NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE income_source (
  income_source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES budget_profile(profile_id) ON DELETE CASCADE,
  name             text NOT NULL,
  UNIQUE (profile_id, name)
);

CREATE TABLE monthly_income (
  monthly_income_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id         uuid NOT NULL REFERENCES budget_period(period_id) ON DELETE CASCADE,
  income_source_id  uuid NOT NULL REFERENCES income_source(income_source_id) ON DELETE CASCADE,
  amount            numeric(12,2) NOT NULL DEFAULT 0,
  notes             text
);

-- Repeat for each category: food, hygiene, medication, communication,
-- transportation, shelter, assets, investments, entertainment, events
-- (Full migration available in your Supabase project dashboard)
