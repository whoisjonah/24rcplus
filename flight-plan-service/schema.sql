-- Supabase SQL Schema for Flight Plans
-- Run this in your Supabase SQL Editor

-- Create flight_plans table
CREATE TABLE IF NOT EXISTS flight_plans (
    id BIGSERIAL PRIMARY KEY,
    roblox_name TEXT NOT NULL UNIQUE,
    callsign TEXT,
    real_callsign TEXT,
    aircraft TEXT,
    departing TEXT,
    arriving TEXT,
    route TEXT,
    flight_rules TEXT,
    flight_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on roblox_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_flight_plans_roblox_name ON flight_plans(roblox_name);
CREATE INDEX IF NOT EXISTS idx_flight_plans_callsign ON flight_plans(callsign);
CREATE INDEX IF NOT EXISTS idx_flight_plans_real_callsign ON flight_plans(real_callsign);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flight_plans_updated_at BEFORE UPDATE
    ON flight_plans FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE flight_plans ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for your client)
CREATE POLICY "Allow anonymous read access" ON flight_plans
    FOR SELECT TO anon
    USING (true);

-- Allow service role full access (for the listener service)
CREATE POLICY "Allow service role full access" ON flight_plans
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to cleanup old flight plans (optional - runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_flight_plans()
RETURNS void AS $$
BEGIN
    DELETE FROM flight_plans 
    WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
