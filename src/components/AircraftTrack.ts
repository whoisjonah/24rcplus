import { Container, Graphics } from "pixi.js";
import config from "../config";
import { AircraftData, Position } from "../types";
import { headingToCartesian } from "../util";
// import GAPrefixes from "./GAPrefixes.json";
const ACFT_TTL = 3;
const TAIL_TTL = 4;

export default class AircraftTrack {
    stage: Container;
    basemap: Container;
    acftData: AircraftData;
    prevAlt: number;
    head: Graphics;
    tails: { graphic: Graphics, position: Position, ttl: number }[] = [];
    ttl = ACFT_TTL;
    ptl: Graphics; // Predicted track line

    /**
     * 
     * @param acftData AircraftData of the aircraft being tracked
     * @param stage Stage to draw the aircraft track to
     */
    constructor(acftData: AircraftData, stage: Container, basemap: Container) {
        this.acftData = acftData;
        this.prevAlt = acftData.altitude;
        this.stage = stage;
        this.basemap = basemap;

        this.ptl = new Graphics();
        this.stage.addChild(this.ptl);

        this.head = new Graphics();
        this.head.circle(0,0,3).fill(0xFFFFFF);
        this.stage.addChild(this.head);

        this.updateData(acftData);
    }

    /**
     * Reposition the track's elements relative to the basemap
     * @param basemap Basemap to position the elements relative to.
     */
    positionGraphics() {
        this.head.position.copyFrom(this.basemap.position);
        this.head.position.x += (this.acftData.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
        this.head.position.y += (this.acftData.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;

        this.ptl.position.copyFrom(this.head);
        this.ptl.scale.set(this.basemap.scale.x);

        this.tails.forEach(tail => {
            tail.graphic.position.copyFrom(this.basemap.position);
            tail.graphic.position.x += (tail.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
            tail.graphic.position.y += (tail.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;
        });

    }

    updateData(acftData: AircraftData) {
        const tailGraphic = new Graphics();
        tailGraphic.circle(0,0,3).fill({ h: 222, s: 64, v: 50 });
        tailGraphic.zIndex = -1;

        this.stage.addChild(tailGraphic);

        this.tails.push({ graphic: tailGraphic, position: this.acftData.position, ttl: TAIL_TTL });

        this.tails.forEach(tail => {
            tail.graphic.clear();
            tail.graphic.circle(0,0,3).fill({ h: 222, s: 64, v: 50 / (TAIL_TTL + 1 - tail.ttl)});

            tail.ttl--;
            tail.graphic.zIndex--;
            if (tail.ttl <= 0)
                tail.graphic.destroy();
        });
        this.tails = this.tails.filter(tail => tail.ttl > 0);

        this.ttl = ACFT_TTL;
        this.acftData = acftData;

        this.ptl.clear(); // We're not doing this every frame so it's okay
        if (!acftData.isOnGround && config.showPTL) {
            // Magic number found through comparing coordinates at set speed at set interval. TODO: find what equation produces this number.
            const ptlLength = 0.3256 * acftData.groundSpeed
            const [ptlX, ptlY] = headingToCartesian(ptlLength, acftData.heading);
            this.ptl.lineTo(ptlX, ptlY);
            this.ptl.stroke({ color: 0xffffff, pixelLine: true });
        }
        
        this.positionGraphics();
        this.prevAlt = acftData.altitude;
    }

    notFound() {
        if (this.acftData.isOnGround)
            this.ttl = 0;
        // else
        //     this.head.text = "?"; // Plane disappeared mid-air
        this.ttl--;
        console.log(this.ttl);
    }

    destroy() {
        this.head.destroy(true);
        this.ptl.destroy(true);
        this.tails.forEach(tail => {
            tail.graphic.destroy(true);
        });
        this.tails = [];
    }

}