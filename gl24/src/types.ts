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

export interface AircraftCollection {
    [callsign: string]: AircraftCollectionData;
}

export interface AircraftData extends AircraftCollectionData {
    callsign: string;
}