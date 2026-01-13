import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ContextMenu from './ContextMenu';
import FlightPlanViewer from './FlightPlanViewer';
import { AircraftData } from '../types';

interface ModalManagerState {
    showFlightPlan: boolean;
    selectedAircraft: AircraftData | null;
    contextMenuAircraft: AircraftData | null;
    contextMenuX: number;
    contextMenuY: number;
    contextMenuIsAssumed: boolean;
    dataVersion: number; // increments when aircraft data map updates
}

let setModalState: React.Dispatch<React.SetStateAction<ModalManagerState>>;
let currentAircraftData: { [key: string]: AircraftData } = {};
let dataVersion = 0;

export function showFlightPlanModal(aircraft: AircraftData) {
    setModalState(prev => ({
        ...prev,
        showFlightPlan: true,
        selectedAircraft: aircraft,
        contextMenuAircraft: null
    }));
}

export function showContextMenu(aircraft: AircraftData, x: number, y: number, isAssumed: boolean) {
    setModalState(prev => ({
        ...prev,
        contextMenuAircraft: aircraft,
        contextMenuX: x,
        contextMenuY: y,
        contextMenuIsAssumed: isAssumed
    }));
}

export function hideContextMenu() {
    setModalState(prev => ({
        ...prev,
        contextMenuAircraft: null
    }));
}

export function updateAircraftData(data: { [key: string]: AircraftData }) {
    currentAircraftData = data;
    // bump version so ModalManager reacts to fresh aircraft data (e.g., flight plan updates)
    if (setModalState) {
        const next = ++dataVersion;
        setModalState(prev => ({ ...prev, dataVersion: next }));
    }
}

function ModalManager() {
    const [state, setState] = useState<ModalManagerState>({
        showFlightPlan: false,
        selectedAircraft: null,
        contextMenuAircraft: null,
        contextMenuX: 0,
        contextMenuY: 0,
        contextMenuIsAssumed: false,
        dataVersion: 0
    });
    const [callsignInput, setCallsignInput] = useState("");
    const [seedTimer, setSeedTimer] = useState<number | null>(null);

    setModalState = setState;

    const closeModals = () => {
        if (seedTimer) {
            clearTimeout(seedTimer);
            setSeedTimer(null);
        }
        setState(prev => ({
            ...prev,
            showFlightPlan: false,
            selectedAircraft: null,
            contextMenuAircraft: null,
            contextMenuX: 0,
            contextMenuY: 0,
            contextMenuIsAssumed: false,
            dataVersion: prev.dataVersion
        }));
    };

    // When opening flight plan editor, seed input once after 5s if still empty (avoid clobbering user typing)
    useEffect(() => {
        if (seedTimer) {
            clearTimeout(seedTimer);
            setSeedTimer(null);
        }

        if (state.showFlightPlan && state.selectedAircraft) {
            const acft = state.selectedAircraft;
            const fpCallsign = acft.flightPlanCallsign || (window as any).getFlightPlanCallsign?.(acft.playerName) || acft.callsign || "";
            // Seed immediately if empty AND user hasn't typed, otherwise delay 5s before restoring
            if (callsignInput === "") {
                const t = window.setTimeout(() => {
                    setCallsignInput(prev => (prev === "" ? fpCallsign : prev));
                    setSeedTimer(null);
                }, 5000) as unknown as number;
                setSeedTimer(t);
            }
        }

        return () => {
            if (seedTimer) {
                clearTimeout(seedTimer);
                setSeedTimer(null);
            }
        };
    }, [state.showFlightPlan, state.selectedAircraft]);

    // Update selected aircraft data if it changes
    useEffect(() => {
        if (state.selectedAircraft) {
            const updated = currentAircraftData[state.selectedAircraft.callsign]
                || currentAircraftData[`player:${state.selectedAircraft.playerName}`];
            if (updated && updated !== state.selectedAircraft) {
                setState(prev => ({
                    ...prev,
                    selectedAircraft: updated
                }));
            }
        }
    }, [state.selectedAircraft, state.dataVersion]);

    return (
        <>
            {state.showFlightPlan && state.selectedAircraft && (
                <FlightPlanViewer
                    aircraft={state.selectedAircraft}
                    onClose={closeModals}
                />
            )}
            {state.contextMenuAircraft && (
                <ContextMenu
                    aircraft={state.contextMenuAircraft}
                    x={state.contextMenuX}
                    y={state.contextMenuY}
                    isAssumed={state.contextMenuIsAssumed}
                    onAssume={() => {
                        if ((window as any).toggleAssumedAircraft) {
                            (window as any).toggleAssumedAircraft(state.contextMenuAircraft!.callsign);
                        }
                        setState(prev => ({
                            ...prev,
                            contextMenuAircraft: null
                        }));
                    }}
                    onClose={() => {
                        setState(prev => ({
                            ...prev,
                            contextMenuAircraft: null
                        }));
                    }}
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
