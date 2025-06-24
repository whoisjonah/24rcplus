import { AircraftCollection, AircraftData } from "./types";

export function roundDp(n: number, dp: number = 0): number {
    const multiplier = Math.pow(10,dp);
    return Math.round(n * multiplier) / multiplier;
}

export function acftCollectionToAcftArray(acftCollection: AircraftCollection): AircraftData[] {
    return Object.entries(acftCollection).map(([callsign, acftData]) => ({
        callsign,
        ...acftData
    }));
}

export function altToFL(altitude: number): string {
    return Math.round(altitude/100).toString().padStart(3, "0");
}