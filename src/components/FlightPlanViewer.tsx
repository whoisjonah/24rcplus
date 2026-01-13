import { useEffect, useState } from 'react';
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
    const [flightPlanCallsign, setFlightPlanCallsign] = useState(deriveCallsign);

    // Keep local callsign in sync when aircraft prop updates with fresh flight plan data
    useEffect(() => {
        setFlightPlanCallsign(deriveCallsign());
    }, [aircraft]);

    const route = aircraft.flightPlanRoute !== undefined ? aircraft.flightPlanRoute : "RADAR VECTORS";
    const origin = aircraft.flightPlanOrigin || "IRFD";
    const destination = aircraft.flightPlanDestination || "ITKO";
    const rules = aircraft.flightPlanRules || "";
    const filedAircraft = aircraft.flightPlanAircraft || aircraft.aircraftType;
    const flightLevel = (aircraft.flightPlanLevel && aircraft.flightPlanLevel.toString().padStart(3, '0'))
        || `${Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}`;

    const handleSaveCallsign = () => {
        if ((window as any).setFlightPlanCallsign) {
            (window as any).setFlightPlanCallsign(aircraft.playerName, flightPlanCallsign);
            if ((window as any).showToast) {
                (window as any).showToast('Flight plan callsign updated', 'success');
            }
        }
    };

    return (
        <div className="flight-plan-overlay" onClick={onClose}>
            <div className="flight-plan-panel" onClick={(e) => e.stopPropagation()}>
                <div className="flight-plan-header">
                    <h2>Flight Plan</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                
                <div className="flight-plan-content">
                    <div className="fp-row">
                        <div className="fp-cell">
                            <span className="fp-label">Callsign (In-Game)</span>
                            <input className="fp-value" value={aircraft.callsign} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Callsign (Flight Plan)</span>
                            <input 
                                className="fp-value" 
                                value={flightPlanCallsign} 
                                onChange={(e) => setFlightPlanCallsign(e.target.value)}
                                placeholder="Enter flight plan callsign"
                            />
                            <button onClick={handleSaveCallsign} style={{marginTop: '4px', padding: '4px 8px', fontSize: '12px'}}>Save</button>
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">AF Data</span>
                            <input className="fp-value" value={filedAircraft} disabled />
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-cell">
                            <span className="fp-label">Origin</span>
                            <input className="fp-value" value={origin} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Destination</span>
                            <input className="fp-value" value={destination} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Altitude</span>
                            <input className="fp-value" value={flightLevel} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Squawk</span>
                            <input className="fp-value" value={squawk} disabled />
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-cell">
                            <span className="fp-label">Flight Rules</span>
                            <input className="fp-value" value={rules} disabled />
                        </div>
                        <span className="fp-label">Route</span>
                        <input className="fp-value route-input" value={route} disabled />
                    </div>
                </div>
            </div>
        </div>
    );
}
