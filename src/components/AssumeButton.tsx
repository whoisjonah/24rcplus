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

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        left: x + 30,
        top: y,
        pointerEvents: 'auto'
    };

    const buttonStyle: React.CSSProperties = {
        WebkitAppearance: 'none',
        appearance: 'none',
        background: '#222',
        border: 'none',
        color: '#ffffff',
        textTransform: 'lowercase',
        fontFamily: 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
        fontSize: '9pt',
        padding: '2px 6px',
        height: '20px',
        minWidth: '34px',
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: 'none',
        outline: 'none'
    };

    return (
        <div className="assume-button-container" style={containerStyle}>
            <button className="assume-btn" onClick={handleAssume} style={buttonStyle}>
                assume
            </button>
        </div>
    );
}
