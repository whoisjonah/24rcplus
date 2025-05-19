import { Container, Graphics, Text } from "pixi.js";
import { AircraftData } from "./types";
const DEFAULT_TTL = 3

export default class AircraftDisplay {
    acftData: AircraftData;
    head: Text;
    stage: Container;
    basemap: Graphics;
    ttl = DEFAULT_TTL;

    /**
     * 
     * @param acftData AircraftData of the aircraft being tracked
     * @param stage Stage to draw the aircraft display to
     */
    constructor(acftData: AircraftData, stage: Container, basemap: Graphics) {
        this.acftData = acftData;
        this.stage = stage;
        this.basemap = basemap;
        this.head = new Text({
            text: '*',
            style: {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffffff,
                align: 'center',
            },
        });
        this.stage.addChild(this.head);
    }

    updateData(acftData: AircraftData) {
        this.head.text = "*";
        this.ttl = DEFAULT_TTL;
        this.acftData = acftData;
        this.positionText();
    }

    notFound() {
        if (this.acftData.isOnGround)
            this.head.text = "";
        else
            this.head.text = "?"; // Plane disappeared mid-air
        this.ttl--;
        console.log(this.ttl);
    }

    destroy() {
        this.head.destroy(true);
        return true;
    }

    /**
     * Reposition the display's elements relative to the basemap
     * @param basemap Basemap to position the elements relative to.
     */
    positionText() {
        this.head.position.copyFrom(this.basemap.position);
        this.head.position.x += (this.acftData.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
        this.head.position.y += (this.acftData.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;
    }
}