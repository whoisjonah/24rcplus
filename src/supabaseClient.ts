import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oylkvbswjpcqruxrxqjx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bGt2YnN3anBjcXJ1eHJ4cWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTEyMDUsImV4cCI6MjA4Mzk4NzIwNX0.JZlSRVX_KOk5-w_gSDF7IHkFiYyBlgBrDUnc7ARl2_k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchAllFlightPlans() {
    try {
        // Order ascending so that when the consumer iterates and assigns
        // values the newest record for a given key ends up last (and thus
        // remains the final value). This avoids returning an older plan
        // when multiple rows exist for the same user.
        const { data, error } = await supabase
            .from('flight_plans')
            .select('*')
            .order('updated_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching flight plans:', error);
            return [];
        }

        console.log(`📥 Fetched ${data?.length || 0} flight plans from Supabase`);
        return data || [];
    } catch (err) {
        console.error('❌ Error fetching flight plans:', err);
        return [];
    }
}

export function convertSupabaseToFlightPlan(row: any) {
    return {
        robloxName: row.roblox_name,
        callsign: row.callsign,
        realcallsign: row.real_callsign,
        aircraft: row.aircraft,
        departing: row.departing,
        arriving: row.arriving,
        route: row.route,
        flightrules: row.flight_rules,
        flightlevel: row.flight_level,
    };
}
