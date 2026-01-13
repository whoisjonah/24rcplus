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
                    <h2>Flight Plan - {aircraft.callsign}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                
                <div className="flight-plan-content">
                    <div className="fp-section">
                        <h3>Aircraft Identification</h3>
                        <div className="fp-row">
                            <span className="fp-label">Callsign:</span>
                            <span className="fp-value">{aircraft.callsign}</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Aircraft Type:</span>
                            <span className="fp-value">{aircraft.aircraftType}</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Squawk Code:</span>
                            <span className="fp-value squawk">{squawk}</span>
                        </div>
                    </div>

                    <div className="fp-section">
                        <h3>Current Status</h3>
                        <div className="fp-row">
                            <span className="fp-label">Altitude:</span>
                            <span className="fp-value">{Math.round(aircraft.altitude)} ft</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Heading:</span>
                            <span className="fp-value">{Math.round(aircraft.heading)}°</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Speed:</span>
                            <span className="fp-value">{Math.round(aircraft.speed)} kts (IAS)</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Ground Speed:</span>
                            <span className="fp-value">{Math.round(aircraft.groundSpeed)} kts</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Status:</span>
                            <span className="fp-value">{aircraft.isOnGround ? '🔴 ON GROUND' : '🟢 AIRBORNE'}</span>
                        </div>
                    </div>

                    <div className="fp-section">
                        <h3>Position</h3>
                        <div className="fp-row">
                            <span className="fp-label">X Position:</span>
                            <span className="fp-value">{aircraft.position.x.toFixed(2)}</span>
                        </div>
                        <div className="fp-row">
                            <span className="fp-label">Y Position:</span>
                            <span className="fp-value">{aircraft.position.y.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="fp-section">
                        <h3>Weather</h3>
                        <div className="fp-row">
                            <span className="fp-label">Wind:</span>
                            <span className="fp-value">{aircraft.wind}</span>
                        </div>
                    </div>

                    <div className="fp-section">
                        <h3>Pilot</h3>
                        <div className="fp-row">
                            <span className="fp-label">Player Name:</span>
                            <span className="fp-value">{aircraft.playerName}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
