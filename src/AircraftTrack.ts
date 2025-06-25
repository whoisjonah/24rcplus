import { Container, Text } from "pixi.js";
import { AircraftData, Position } from "./types";
import { altToFL } from "./util";
const DEFAULT_TTL = 3

export default class AircraftTrack {
    stage: Container;
    basemap: Container;
    acftData: AircraftData;
    prevAlt: number;
    head: Text;
    tails: { text: Text, position: Position, ttl: number }[] = [];
    dataBlock: Text;
    ttl = DEFAULT_TTL;

    /**
     * 
     * @param acftData AircraftData of the aircraft being tracked
     * @param stage Stage to draw the aircraft display to
     */
    constructor(acftData: AircraftData, stage: Container, basemap: Container) {
        this.acftData = acftData;
        this.prevAlt = acftData.altitude;
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

        this.dataBlock = new Text({
            style: {
                fontFamily: 'Cascadia Mono',
                fontSize: 14,
                fill: 0xffffff,
                align: 'left',
            },
        });
        this.formatText();
        this.stage.addChild(this.dataBlock);
    }
    
    formatText() {
        const acftData = this.acftData;
        const altitudeDelta = acftData.altitude - this.prevAlt;
        const thresholdFPM = 500; // Show arrow if climbing or descending greater than 500 FPM.
        const threasholdDelta = thresholdFPM / (60 / 3); // 60/Δt. We assume Δt is 3. In future we can timestamp acftData and find real Δt.
        const altitudeArrow = (altitudeDelta > threasholdDelta) ? "↑" : (altitudeDelta < -threasholdDelta) ? "↓" : " "

        this.dataBlock.text =
            `${acftData.callsign}\n` +
            `FL${altToFL(acftData.altitude)}${altitudeArrow}  ${acftData.speed}kt\n` +
            `${acftData.aircraftType}\n`
            // `${acftData.playerName}\n`
    }

    /**
     * Reposition the display's elements relative to the basemap
     * @param basemap Basemap to position the elements relative to.
     */
    positionText() {
        this.head.position.copyFrom(this.basemap.position);
        this.head.position.x += (this.acftData.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
        this.head.position.y += (this.acftData.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;

        this.dataBlock.position.copyFrom(this.head);
        this.dataBlock.position.x += 18;
        this.dataBlock.position.y -= 12;

        this.tails.forEach(tail => {
            tail.text.position.copyFrom(this.basemap.position);
            tail.text.position.x += (tail.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
            tail.text.position.y += (tail.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;
        });
    }


    updateData(acftData: AircraftData) {
        const tailText = new Text({
            text: "•",
            style: {
                fontFamily: 'Cascadia Mono',
                fontSize: 14,
                fill: 0xffffff,
                align: 'left',
            },
        });
        this.stage.addChild(tailText);

        this.tails.push({text: tailText, position: this.acftData.position, ttl: 4});
        this.tails.forEach(tail => {
           tail.ttl--;
            if (tail.ttl <= 0)
                tail.text.destroy();
        });
        this.tails = this.tails.filter(tail => tail.ttl > 0);

        this.head.text = "*";
        this.ttl = DEFAULT_TTL;
        this.acftData = acftData;
        this.formatText();
        this.positionText();
        this.prevAlt = acftData.altitude;

    }

    notFound() {
        if (this.acftData.isOnGround)
            this.ttl = 0;
        else
            this.head.text = "?"; // Plane disappeared mid-air
        this.ttl--;
        console.log(this.ttl);
    }

    destroy() {
        this.head.destroy(true);
        this.dataBlock.destroy(true);
        this.tails.forEach(tail => {
            tail.text.destroy(true);
        })
    }

}