import { Point } from "pixi.js";
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

export function padHeading(heading: number): string {
    return heading.toString().padStart(3, "0");
}

const RADIANS_CONSTANT = (Math.PI/180);
export function headingToCartesian(radius: number, degrees: number): number[] {
    const radians = (degrees-90) * RADIANS_CONSTANT;
    const x = radius * Math.cos(radians);
    const y = radius * Math.sin(radians);
    return [x, y];
}

export function pointsToHeading(p1: Point, p2: Point) {
    const x1 = p1.x;
    const y1 = p1.y
    const x2 = p2.x;
    const y2 = p2.y;

    const radians = Math.atan2(y2 - y1, x2 - x1);
    const degrees = (radians / RADIANS_CONSTANT) + 90;
    return ((degrees % 360) + 360) % 360; // Weird mod so that negative values will be modulo'd correctly.
}

export function pointsToDistance(p1: Point, p2: Point) {
    const normalised = p1.subtract(p2);
    return normalised.magnitude();
}