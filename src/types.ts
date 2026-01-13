export interface Position {
    y: number;
    x: number;
}

export interface AircraftCollectionData {
    heading: number;
    playerName: string;
    altitude: number;
    aircraftType: string;
    position: Position;
    speed: number;
    wind: string;
    isOnGround: boolean;
    groundSpeed: number;
}

// Flight plan payload delivered over WebSocket
export interface FlightPlanData {
    robloxName: string;    // Roblox username of command operator
    callsign: string;      // User-set callsign from command
    realcallsign: string;  // In-game callsign as filed
    aircraft: string;      // Filed aircraft type
    flightrules: string;   // IFR/VFR
    departing: string;     // Origin airport
    arriving: string;      // Destination airport
    route: string;         // Route string or "N/A"
    flightlevel: string;   // Flight level string (e.g., "040")
}

export interface AircraftCollection {
    [callsign: string]: AircraftCollectionData;
}

export interface AircraftData extends AircraftCollectionData {
    callsign: string;
    flightPlanCallsign?: string;      // User-set via command, from flight plan
    flightPlanRoute?: string;         // Route from flight plan
    flightPlanOrigin?: string;        // Origin airport from flight plan
    flightPlanDestination?: string;   // Destination airport from flight plan
    flightPlanRules?: string;         // IFR/VFR
    flightPlanLevel?: string;         // Flight level string
    flightPlanAircraft?: string;      // Filed aircraft
}