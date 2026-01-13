import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import FlightPlanViewer from './FlightPlanViewer';
import AssignmentPanel from './AssignmentPanel';
import { AircraftData } from '../types';
import config from '../config';

interface ModalManagerState {
    showFlightPlan: boolean;
    showAssignment: boolean;
    selectedAircraft: AircraftData | null;
}

let setModalState: React.Dispatch<React.SetStateAction<ModalManagerState>>;
let currentAircraftData: { [key: string]: AircraftData } = {};

export function showFlightPlanModal(aircraft: AircraftData) {
    setModalState({
        showFlightPlan: true,
        showAssignment: false,
        selectedAircraft: aircraft
    });
}

export function showAssignmentModal(aircraft: AircraftData) {
    setModalState({
        showFlightPlan: false,
        showAssignment: true,
        selectedAircraft: aircraft
    });
}

export function updateAircraftData(data: { [key: string]: AircraftData }) {
    currentAircraftData = data;
}

function ModalManager() {
    const [state, setState] = useState<ModalManagerState>({
        showFlightPlan: false,
        showAssignment: false,
        selectedAircraft: null
    });

    setModalState = setState;

    const closeModals = () => {
        setState({
            showFlightPlan: false,
            showAssignment: false,
            selectedAircraft: null
        });
    };

    const handleAssignment = (type: 'heading' | 'altitude' | 'speed', value: number) => {
        if (!state.selectedAircraft) return;
        
        // In a real implementation, this would send commands to the aircraft
        console.log(`Assigning ${type} ${value} to ${state.selectedAircraft.callsign}`);
        
        const message = type === 'heading' 
            ? `${state.selectedAircraft.callsign}, fly heading ${value}°`
            : type === 'altitude'
            ? `${state.selectedAircraft.callsign}, ${value > state.selectedAircraft.altitude ? 'climb' : 'descend'} to FL${Math.round(value / 100).toString().padStart(3, '0')}`
            : `${state.selectedAircraft.callsign}, ${value > state.selectedAircraft.speed ? 'increase' : 'reduce'} speed ${value} knots`;
        
        // Show toast notification
        if ((window as any).showToast) {
            (window as any).showToast(message, 'info');
        }
    };

    // Update selected aircraft data if it changes
    useEffect(() => {
        if (state.selectedAircraft) {
            const updated = currentAircraftData[state.selectedAircraft.callsign];
            if (updated && updated !== state.selectedAircraft) {
                setState(prev => ({
                    ...prev,
                    selectedAircraft: updated
                }));
            }
        }
    }, [currentAircraftData]);

    return (
        <>
            {state.showFlightPlan && state.selectedAircraft && (
                <FlightPlanViewer
                    aircraft={state.selectedAircraft}
                    onClose={closeModals}
                />
            )}
            {state.showAssignment && state.selectedAircraft && (
                <AssignmentPanel
                    aircraft={state.selectedAircraft}
                    onClose={closeModals}
                    onAssign={handleAssignment}
                />
            )}
        </>
    );
}

export function initializeModalManager() {
    const container = document.getElementById('modals');
    if (!container) {
        console.error('Modal container not found');
        return;
    }
    const root = createRoot(container);
    root.render(<ModalManager />);
}

// Expose config toggles to window for keyboard shortcuts
(window as any).toggleShowOnlyAssumed = () => {
    config.showOnlyAssumed = !config.showOnlyAssumed;
    if ((window as any).showToast) {
        (window as any).showToast(`Show only assumed: ${config.showOnlyAssumed ? 'ON' : 'OFF'}`, 'info');
    }
};

(window as any).toggleHideGroundTraffic = () => {
    config.hideGroundTraffic = !config.hideGroundTraffic;
    if ((window as any).showToast) {
        (window as any).showToast(`Hide ground traffic: ${config.hideGroundTraffic ? 'ON' : 'OFF'}`, 'info');
    }
};

(window as any).toggleShowFixes = () => {
    config.showFixes = !config.showFixes;
    if ((window as any).showToast) {
        (window as any).showToast(`Show fixes: ${config.showFixes ? 'ON' : 'OFF'}`, 'info');
    }
};
