import { Container } from "pixi.js";
import { AircraftData } from "../types";

export interface ScreenPosition {
    x: number;
    y: number;
}

export function acftToScreenPos(acftData: AircraftData, basemap: Container): ScreenPosition {
    return {
        x: (acftData.position.x / 100 - basemap.pivot.x) * basemap.scale.x + basemap.position.x,
        y: (acftData.position.y / 100 - basemap.pivot.y) * basemap.scale.y + basemap.position.y,
    }
}