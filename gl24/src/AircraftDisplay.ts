import { Container, Graphics, Text } from "pixi.js";
import { AircraftData } from "./types";
import { altToFL } from "./util";
const DEFAULT_TTL = 3

export default class AircraftDisplay {
    stage: Container;
    basemap: Graphics;
    acftData: AircraftData;
    head: Text;
    txtcallsign: Text;
    ttl = DEFAULT_TTL;
    climbrate = 0;

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

        this.txtcallsign = new Text({
            style: {
                fontFamily: 'Cascadia Code',
                fontSize: 14,
                fill: 0xffffff,
                align: 'left',
            },
        });
        this.formatText();
        this.stage.addChild(this.txtcallsign);
    }
    
    formatText() {
        const acftData = this.acftData;
        let climbLetter = "";
        if (Math.abs(this.climbrate) > 5) // Arbitrary.
            climbLetter = this.climbrate > 0 ? "C" : "D"

        this.txtcallsign.text =
            `${acftData.callsign}\n` +
            `${altToFL(acftData.altitude)}${climbLetter}\n` +
            `${acftData.heading.toString().padStart(3, "0")} ${acftData.speed}`
    }

    /**
     * Reposition the display's elements relative to the basemap
     * @param basemap Basemap to position the elements relative to.
     */
    positionText() {
        this.head.position.copyFrom(this.basemap.position);
        this.head.position.x += (this.acftData.position.x / 100 - this.basemap.pivot.x) * this.basemap.scale.x;
        this.head.position.y += (this.acftData.position.y / 100 - this.basemap.pivot.y) * this.basemap.scale.x;

        this.txtcallsign.position.copyFrom(this.head);
        this.txtcallsign.position.x += 12
        this.txtcallsign.position.y -= 12
    }


    updateData(acftData: AircraftData) {
        this.head.text = "*";
        this.ttl = DEFAULT_TTL;
        this.climbrate = acftData.altitude - this.acftData.altitude // New alt - old alt
        this.acftData = acftData;
        this.formatText();
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
        this.txtcallsign.destroy(true);
    }

}