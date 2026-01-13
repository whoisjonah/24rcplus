import { useState } from 'react';
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
                            <span className="fp-label">Callsign</span>
                            <input className="fp-value" value={aircraft.callsign} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">AF Data</span>
                            <input className="fp-value" value={aircraft.aircraftType} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Origin</span>
                            <input className="fp-value" value="IRFD" disabled />
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-cell">
                            <span className="fp-label">Destination</span>
                            <input className="fp-value" value="ITKO" disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Altitude</span>
                            <input className="fp-value" value={`${Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}`} disabled />
                        </div>
                        <div className="fp-cell">
                            <span className="fp-label">Squawk</span>
                            <input className="fp-value" value={squawk} disabled />
                        </div>
                    </div>

                    <div className="fp-row">
                        <span className="fp-label">Route</span>
                        <input className="fp-value route-input" value="RADAR VECTORS" disabled />
                    </div>
                </div>
            </div>
        </div>
    );
}
