import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';

// Environment variables - set these in your hosting platform
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service_role key
const WS_URL = 'wss://24data.ptfs.app/wss';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let lastMessageAt = Date.now();

const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 30000;
const RECONNECT_BASE = 2000;
const RECONNECT_MAX = 30000;
let reconnectDelay = RECONNECT_BASE;

async function saveFlightPlan(fp) {
    try {
        const { data, error } = await supabase
            .from('flight_plans')
            .upsert({
                roblox_name: fp.robloxName,
                callsign: fp.callsign || null,
                real_callsign: fp.realcallsign || null,
                aircraft: fp.aircraft || null,
                departing: fp.departing || null,
                arriving: fp.arriving || null,
                route: fp.route || null,
                flight_rules: fp.flightrules || null,
                flight_level: fp.flightlevel || null,
                last_seen: new Date().toISOString()
            }, {
                onConflict: 'roblox_name'
            });

        if (error) {
            console.error('❌ Supabase error:', error);
        } else {
            console.log(`✅ Saved FP: ${fp.robloxName} - ${fp.callsign || 'N/A'}`);
        }
    } catch (err) {
        console.error('❌ Error saving flight plan:', err);
    }
}

function startHeartbeat() {
    if (heartbeatInterval) return;
    
    heartbeatInterval = setInterval(() => {
        if (!ws) return;
        
        // Check if we've received messages recently
        if (Date.now() - lastMessageAt > HEARTBEAT_TIMEOUT) {
            console.log('⚠️  No messages received, reconnecting...');
            ws.close();
            return;
        }
        
        // Send ping if connected
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ t: 'PING' }));
            } catch (e) {
                console.error('❌ Error sending ping:', e);
            }
        }
        
        // Reconnect if closed
        if (ws.readyState === WebSocket.CLOSED) {
            scheduleReconnect();
        }
    }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function scheduleReconnect() {
    if (reconnectTimeout) return;
    
    const wait = Math.min(reconnectDelay, RECONNECT_MAX);
    console.log(`🔄 Reconnecting in ${wait}ms...`);
    
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
        reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
    }, wait);
}

function connect() {
    if (ws) {
        try { ws.close(); } catch (e) {}
    }
    
    console.log(`🔌 Connecting to ${WS_URL}...`);
    ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
        console.log('✅ Connected to WebSocket');
        reconnectDelay = RECONNECT_BASE;
        lastMessageAt = Date.now();
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    });
    
    ws.on('message', (data) => {
        lastMessageAt = Date.now();
        
        try {
            const msg = JSON.parse(data.toString());
            
            if (!msg || !msg.t) return;
            
            // Handle flight plan messages
            if (msg.t === 'FLIGHT_PLAN' || msg.t === 'FLIGHTPLAN' || msg.t === 'EVENT_FLIGHT_PLAN') {
                const fp = msg.d;
                if (fp && fp.robloxName) {
                    console.log(`🛫 Flight plan received: ${fp.robloxName} - ${fp.callsign || 'N/A'}`);
                    saveFlightPlan(fp);
                }
            }
        } catch (err) {
            console.error('❌ Error processing message:', err);
        }
    });
    
    ws.on('close', (code, reason) => {
        console.log(`❌ Disconnected: ${code} - ${reason}`);
        scheduleReconnect();
    });
    
    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
    });
}

// Cleanup old flight plans every hour
setInterval(async () => {
    try {
        const { data, error } = await supabase
            .from('flight_plans')
            .delete()
            .lt('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        if (!error) {
            console.log('🧹 Cleaned up old flight plans');
        }
    } catch (err) {
        console.error('❌ Error cleaning up:', err);
    }
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Shutting down...');
    stopHeartbeat();
    if (ws) ws.close();
    process.exit(0);
});

// Start the service
console.log('🚀 Flight Plan Listener starting...');
connect();
startHeartbeat();
