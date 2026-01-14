import { useEffect, useState, useRef } from 'react';
import { AircraftData } from '../types';

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
                        <span className="fp-label">Altitude</span>
                        <input className="fp-value fp-input" type="text" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Squawk</span>
                        <input className="fp-value fp-input" type="text" value={squawk} onChange={(e) => setSquawk(e.target.value)} />
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
