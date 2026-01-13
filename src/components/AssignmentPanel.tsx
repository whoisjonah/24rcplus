import { useState } from 'react';
import { AircraftData } from '../types';

interface AssignmentPanelProps {
    aircraft: AircraftData;
    onClose: () => void;
    onAssign: (type: 'heading' | 'altitude' | 'speed', value: number) => void;
}

export default function AssignmentPanel({ aircraft, onClose, onAssign }: AssignmentPanelProps) {
    const [heading, setHeading] = useState(Math.round(aircraft.heading));
    const [altitude, setAltitude] = useState(Math.round(aircraft.altitude / 100));
    const [speed, setSpeed] = useState(Math.round(aircraft.speed));

    const handleAssign = (type: 'heading' | 'altitude' | 'speed') => {
        let value = 0;
        switch (type) {
            case 'heading':
                value = heading;
                break;
            case 'altitude':
                value = altitude * 100;
                break;
            case 'speed':
                value = speed;
                break;
        }
        onAssign(type, value);
    };

    return (
        <div className="assignment-overlay" onClick={onClose}>
            <div className="assignment-panel" onClick={(e) => e.stopPropagation()}>
                <div className="assignment-header">
                    <h2>{aircraft.callsign} - Assignments</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                
                <div className="assignment-content">
                    <div className="current-status">
                        <h3>Current Status</h3>
                        <div className="status-grid">
                            <div className="status-item">
                                <span className="status-label">HDG</span>
                                <span className="status-value">{Math.round(aircraft.heading)}°</span>
                            </div>
                            <div className="status-item">
                                <span className="status-label">ALT</span>
                                <span className="status-value">FL{Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}</span>
                            </div>
                            <div className="status-item">
                                <span className="status-label">SPD</span>
                                <span className="status-value">{Math.round(aircraft.speed)} kts</span>
                            </div>
                        </div>
                    </div>

                    <div className="assignment-section">
                        <h3>Assign Heading</h3>
                        <div className="input-group">
                            <input
                                type="number"
                                min="0"
                                max="359"
                                value={heading}
                                onChange={(e) => setHeading(parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                            />
                            <span className="unit">°</span>
                            <button onClick={() => handleAssign('heading')}>ASSIGN</button>
                        </div>
                        <div className="quick-buttons">
                            <button onClick={() => { setHeading((heading + 10) % 360); }}>+10°</button>
                            <button onClick={() => { setHeading((heading - 10 + 360) % 360); }}>-10°</button>
                            <button onClick={() => { setHeading((heading + 90) % 360); }}>+90°</button>
                            <button onClick={() => { setHeading((heading - 90 + 360) % 360); }}>-90°</button>
                        </div>
                    </div>

                    <div className="assignment-section">
                        <h3>Assign Altitude</h3>
                        <div className="input-group">
                            <span className="prefix">FL</span>
                            <input
                                type="number"
                                min="0"
                                max="600"
                                value={altitude}
                                onChange={(e) => setAltitude(parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                            />
                            <button onClick={() => handleAssign('altitude')}>ASSIGN</button>
                        </div>
                        <div className="quick-buttons">
                            <button onClick={() => setAltitude(Math.min(600, altitude + 10))}>+1000ft</button>
                            <button onClick={() => setAltitude(Math.max(0, altitude - 10))}>-1000ft</button>
                            <button onClick={() => setAltitude(Math.min(600, altitude + 50))}>+5000ft</button>
                            <button onClick={() => setAltitude(Math.max(0, altitude - 50))}>-5000ft</button>
                        </div>
                    </div>

                    <div className="assignment-section">
                        <h3>Assign Speed</h3>
                        <div className="input-group">
                            <input
                                type="number"
                                min="0"
                                max="500"
                                value={speed}
                                onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                            />
                            <span className="unit">kts</span>
                            <button onClick={() => handleAssign('speed')}>ASSIGN</button>
                        </div>
                        <div className="quick-buttons">
                            <button onClick={() => setSpeed(250)}>250 kts</button>
                            <button onClick={() => setSpeed(210)}>210 kts</button>
                            <button onClick={() => setSpeed(180)}>180 kts</button>
                            <button onClick={() => setSpeed(160)}>160 kts</button>
                        </div>
                    </div>

                    <div className="assignment-info">
                        <p>💡 Press ASSIGN to send the command to the aircraft</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
