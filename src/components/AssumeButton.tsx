import { AircraftData } from '../types';

interface AssumeButtonProps {
    aircraft: AircraftData | null;
    x: number;
    y: number;
}

export default function AssumeButton({ aircraft, x, y }: AssumeButtonProps) {
    if (!aircraft) return null;

    const handleAssume = () => {
        // Find the label and toggle assumed
        if ((window as any).toggleAssumedAircraft) {
            (window as any).toggleAssumedAircraft(aircraft.callsign);
        }
        // Show the flight plan
        if ((window as any).showFlightPlanModal) {
            (window as any).showFlightPlanModal(aircraft);
        }
    };

    return (
        <div 
            className="assume-button-container"
            style={{
                position: 'fixed',
                left: x + 30,
                top: y,
                pointerEvents: 'auto'
            }}
        >
            <button 
                className="assume-btn"
                onClick={handleAssume}
            >
                ASSUME
            </button>
        </div>
    );
}
