import { useEffect, useState, useRef, useMemo } from 'react';
import { AircraftData } from '../types';
import airportCentroids from '../data/AirportCentroids.json';

interface FlightPlanViewerProps {
    aircraft: AircraftData;
    onClose: () => void;
}

function generateSquawk(): string {
    // Generate a random 4-digit squawk code (0000-7777 in octal)
    const digits = [];
    for (let i = 0; i < 4; i++) {
        digits.push(Math.floor(Math.random() * 8));
    }
    return digits.join('');
}

export default function FlightPlanViewer({ aircraft, onClose }: FlightPlanViewerProps) {
    // Try to load manual flight plan data first, fall back to aircraft data
    const manualFP = (window as any).getManualFlightPlan?.(aircraft.playerName);

    const formatFlightLevel = (fl?: string | number) => {
        const n = fl === undefined || fl === null ? NaN : parseInt(String(fl), 10);
        if (!Number.isFinite(n)) return undefined;
        return n < 100 ? n.toString().padStart(2, '0') : n.toString().padStart(3, '0');
    };

    const initialAltitude = manualFP?.altitude
        || formatFlightLevel(aircraft.flightPlanLevel)
        || "N/A";

    const [squawk, setSquawk] = useState(manualFP?.squawk || generateSquawk());
    const deriveCallsign = () => aircraft.flightPlanCallsign || (window as any).getFlightPlanCallsign?.(aircraft.playerName) || '';
    const [callsign, setCallsign] = useState(manualFP?.callsign || deriveCallsign());
    const [apData, setApData] = useState(manualFP?.apData || aircraft.flightPlanAircraft || aircraft.aircraftType || "");
    const [origin, setOrigin] = useState(manualFP?.origin || aircraft.flightPlanOrigin || "");
    const [destination, setDestination] = useState(manualFP?.destination || aircraft.flightPlanDestination || "");
    const [route, setRoute] = useState(manualFP?.route || aircraft.flightPlanRoute || "");
    
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Altitude should never fall back to current altitude; use filed FL or N/A
    const [altitude, setAltitude] = useState(initialAltitude);

    // Compute direction (eastbound/westbound) and validate FL parity
    const flightDirection = useMemo(() => {
        const norm = (s: string) => (s || '').trim().toUpperCase();
        const o = norm(origin);
        const d = norm(destination);
        const getPt = (code: string) => {
            if (!code) return null;
            const p = (airportCentroids as any)[code];
            return Array.isArray(p) && p.length === 2 ? { x: p[0], y: p[1] } : null;
        };

        const oPt = getPt(o);
        const dPt = getPt(d);

        // If we have both centroids, compute bearing between them. Otherwise fallback to aircraft heading.
        if (dPt && (oPt || true)) {
            const originPt = oPt || { x: aircraft.position.x, y: aircraft.position.y };
            const dx = dPt.x - originPt.x;
            const dy = dPt.y - originPt.y;
            // Bearing: 0 = north, increase clockwise
            let angle = (Math.atan2(dx, dy) * 180) / Math.PI;
            if (isNaN(angle)) angle = 0;
            angle = (angle + 360) % 360;
            const direction = angle >= 0 && angle < 180 ? 'eastbound' : 'westbound';
            return { heading: Math.round(angle), direction };
        }

        // Fallback: use aircraft heading (0 = north, clockwise)
        const raw = Number(aircraft.heading);
        const angle = Number.isFinite(raw) ? ((raw % 360) + 360) % 360 : NaN;
        const direction = Number.isFinite(angle) ? (angle >= 0 && angle < 180 ? 'eastbound' : 'westbound') : undefined;
        return { heading: Number.isFinite(angle) ? Math.round(angle) : NaN, direction };
    }, [origin, destination, aircraft.position.x, aircraft.position.y, aircraft.heading]);

    const altitudeValidity = useMemo(() => {
        const fl = parseInt(String(altitude || '').replace(/[^0-9]/g, ''), 10);
        if (!Number.isFinite(fl)) return { valid: undefined, expected: undefined };
        const parity = fl % 2 === 1 ? 'odd' : 'even';
        const expected = flightDirection.direction === 'eastbound' ? 'odd' : flightDirection.direction === 'westbound' ? 'even' : undefined;
        const valid = expected ? parity === expected : undefined;
        return { valid, expected, parity };
    }, [altitude, flightDirection]);

    // Reset state when aircraft changes
    useEffect(() => {
        const latestManual = (window as any).getManualFlightPlan?.(aircraft.playerName);
        setCallsign(latestManual?.callsign || deriveCallsign());
        setApData(latestManual?.apData || aircraft.flightPlanAircraft || aircraft.aircraftType || "");
        setOrigin(latestManual?.origin || aircraft.flightPlanOrigin || "");
        setDestination(latestManual?.destination || aircraft.flightPlanDestination || "");
        setRoute(latestManual?.route || aircraft.flightPlanRoute || "");
        setSquawk(latestManual?.squawk || generateSquawk());
        setAltitude(latestManual?.altitude || formatFlightLevel(aircraft.flightPlanLevel) || "N/A");
    }, [aircraft.callsign]); // Reset when aircraft callsign changes (indicates new spawn)

    // Sync callsign changes to scope
    useEffect(() => {
        const currentCallsign = deriveCallsign();
        if (callsign !== currentCallsign) {
            (window as any).setFlightPlanCallsign?.(aircraft.playerName, callsign);
            // Trigger aircraft label refresh
            if ((window as any).refreshAircraftLabels) {
                (window as any).refreshAircraftLabels();
            }
        }
    }, [callsign]);

    // Save flight plan data to localStorage whenever fields change
    useEffect(() => {
        if ((window as any).saveManualFlightPlan) {
            (window as any).saveManualFlightPlan(aircraft.playerName, {
                callsign,
                apData,
                origin,
                destination,
                route,
                altitude,
                squawk
            });
        }
    }, [callsign, apData, origin, destination, route, altitude, squawk]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragging) {
                setPosition({
                    x: e.clientX - dragStart.current.x,
                    y: e.clientY - dragStart.current.y,
                });
            }
        };
        const handleMouseUp = () => setDragging(false);
        if (dragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setDragging(true);
        }
    };

    return (
        <div 
            ref={panelRef}
            className="flight-plan-panel" 
            style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: dragging ? 'grabbing' : 'grab' }}
        >
            <div className="flight-plan-header" onMouseDown={handleMouseDown}>
                <h2>Flight Plan</h2>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>
            
            <div className="flight-plan-content">
                <div className="fp-row">
                    <div className="fp-field">
                        <span className="fp-label">Callsign</span>
                        <input className="fp-value fp-input" type="text" value={callsign} onChange={(e) => setCallsign(e.target.value)} />
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">AP Data</span>
                        <input className="fp-value fp-input" type="text" value={apData} onChange={(e) => setApData(e.target.value)} />
                    </div>
                </div>

                <div className="fp-row">
                    <div className="fp-field">
                        <span className="fp-label">Origin</span>
                        <input className="fp-value fp-input" type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} />
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Destination</span>
                        <input className="fp-value fp-input" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} />
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Squawk</span>
                        <input className="fp-value fp-input" type="text" value={squawk} onChange={(e) => setSquawk(e.target.value)} />
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Altitude</span>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input className="fp-value fp-input" type="text" value={altitude} onChange={(e) => setAltitude(e.target.value)} style={{ paddingRight: 28 }} />
                            {altitudeValidity.valid !== undefined && (
                                <div
                                    title={altitudeValidity.valid ? 'Flight level parity OK' : `Expected ${altitudeValidity.expected} FLs for ${flightDirection.direction || 'unknown'}`}
                                    style={{
                                        position: 'absolute',
                                        right: 6,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 12,
                                        height: 12,
                                        borderRadius: 8,
                                        background: altitudeValidity.valid ? '#00cc00' : '#cc0000',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.25)',
                                        pointerEvents: 'none',
                                        zIndex: 3
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="fp-row fp-route">
                    <div className="fp-field" style={{ flex: 1 }}>
                        <span className="fp-label">Route</span>
                        <input className="fp-value fp-input" type="text" value={route} onChange={(e) => setRoute(e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
