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
    const [squawk] = useState(generateSquawk());
    const deriveCallsign = () => aircraft.flightPlanCallsign || (window as any).getFlightPlanCallsign?.(aircraft.playerName) || '';
    const [flightPlanCallsign] = useState(deriveCallsign);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

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

    const route = aircraft.flightPlanRoute !== undefined ? aircraft.flightPlanRoute : "N/A";
    const origin = aircraft.flightPlanOrigin || "N/A";
    const destination = aircraft.flightPlanDestination || "N/A";
    const filedAircraft = aircraft.flightPlanAircraft || aircraft.aircraftType || "N/A";
    const flFromPlan = aircraft.flightPlanLevel ? parseInt(aircraft.flightPlanLevel, 10) : NaN;
    const flComputed = Math.round(aircraft.altitude / 100);
    const flDisplayBase = Number.isFinite(flFromPlan) ? flFromPlan : flComputed;
    const flightLevel = flDisplayBase < 100 
        ? flDisplayBase.toString().padStart(2, '0')
        : flDisplayBase.toString().padStart(3, '0');

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
                        <div className="fp-value">{flightPlanCallsign || aircraft.callsign}</div>
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">AP Data</span>
                        <div className="fp-value">{filedAircraft}</div>
                    </div>
                </div>

                <div className="fp-row">
                    <div className="fp-field">
                        <span className="fp-label">Origin</span>
                        <div className="fp-value">{origin}</div>
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Destination</span>
                        <div className="fp-value">{destination}</div>
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Altitude</span>
                        <div className="fp-value">{flightLevel}</div>
                    </div>
                    <div className="fp-field">
                        <span className="fp-label">Squawk</span>
                        <div className="fp-value">{squawk}</div>
                    </div>
                </div>

                <div className="fp-row fp-route">
                    <div className="fp-field" style={{ flex: 1 }}>
                        <span className="fp-label">Route</span>
                        <div className="fp-value">{route}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
