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
    const [squawk, setSquawk] = useState(generateSquawk());
    const deriveCallsign = () => aircraft.flightPlanCallsign || (window as any).getFlightPlanCallsign?.(aircraft.playerName) || '';
    const [callsign, setCallsign] = useState(deriveCallsign);
    const [apData, setApData] = useState(aircraft.flightPlanAircraft || aircraft.aircraftType || "");
    const [origin, setOrigin] = useState(aircraft.flightPlanOrigin || "");
    const [destination, setDestination] = useState(aircraft.flightPlanDestination || "");
    const [route, setRoute] = useState(aircraft.flightPlanRoute || "");
    
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Derive altitude from flight plan level or current altitude
    const flFromPlan = aircraft.flightPlanLevel ? parseInt(aircraft.flightPlanLevel, 10) : NaN;
    const flComputed = Math.round(aircraft.altitude / 100);
    const flDisplayBase = Number.isFinite(flFromPlan) ? flFromPlan : flComputed;
    const flightLevel = flDisplayBase < 100 
        ? flDisplayBase.toString().padStart(2, '0')
        : flDisplayBase.toString().padStart(3, '0');
    const [altitude, setAltitude] = useState(flightLevel);

    // Reset state when aircraft changes
    useEffect(() => {
        setCallsign(deriveCallsign());
        setApData(aircraft.flightPlanAircraft || aircraft.aircraftType || "");
        setOrigin(aircraft.flightPlanOrigin || "");
        setDestination(aircraft.flightPlanDestination || "");
        setRoute(aircraft.flightPlanRoute || "");
        setSquawk(generateSquawk());
        setAltitude(flightLevel);
    }, [aircraft.callsign]); // Reset when aircraft callsign changes (indicates new spawn)

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
