import { Container, Graphics, Text, TextOptions, TextStyleAlign } from "pixi.js";
import { FederatedPointerEvent, Point } from "pixi.js";
import { floorDp, getOppHeading, padHeading, pointsToDistance, pointsToHeading, sizeToPoint, vectorToPoint } from "../util";

export default class DistanceTool {
    stage: Container;
    basemap: Container;
    start?: Point;
    end?: Point;
    heading?: number;
    line?: Graphics;
    startHdgTxt?: Text;
    endHdgTxt?: Text;
    distanceTxt?: Text;

    constructor(stage: Container, basemap: Container) {
        this.stage = stage;
        this.basemap = basemap;
    }

    positionGraphics() {
        if (this.line) {
            this.line?.position.copyFrom(this.basemap.position);
            this.line?.pivot.copyFrom(this.basemap.pivot);
            this.line?.scale.copyFrom(this.basemap.scale);
            
            if (!this.start || !this.end || !this.heading || !this.startHdgTxt || !this.endHdgTxt || !this.distanceTxt)
                return;

            // Correct position of heading texts 
            this.startHdgTxt.position = this.basemap.position
                .add(this.start.multiplyScalar(this.basemap.scale.x))
                .subtract(this.basemap.pivot.multiplyScalar(this.basemap.scale.x))
                .add(vectorToPoint(20, getOppHeading(this.heading))) // Apply vector of 20px in the opposite heading direction
                .subtract(sizeToPoint(this.endHdgTxt.getSize()).multiplyScalar(0.5)); // Centrepoint of text

            this.endHdgTxt.position = this.basemap.position
                .add(this.end.multiplyScalar(this.basemap.scale.x))
                .subtract(this.basemap.pivot.multiplyScalar(this.basemap.scale.x))
                .add(vectorToPoint(20, this.heading)) // Apply vector of 20px in the heading direction
                .subtract(sizeToPoint(this.endHdgTxt.getSize()).multiplyScalar(0.5)); // Centrepoint of text

            // Algorithm to determine the position and angle of the Nautical Mile text.
            const midpoint = this.start.add(this.end.subtract(this.start).multiplyScalar(0.5));

            let position = this.basemap.position
                .add(midpoint.multiplyScalar(this.basemap.scale.x))
                .subtract(this.basemap.pivot.multiplyScalar(this.basemap.scale.x));

            const textSize = this.distanceTxt.getSize();

            if (this.heading < 22.5) {
                this.distanceTxt.angle = this.heading;
                this.distanceTxt.pivot.set(0, textSize.height/2);
                position = position.add(vectorToPoint(5, this.heading + 90));
            }
            else if (this.heading < 180-22.5) {
                this.distanceTxt.angle = this.heading - 90;
                this.distanceTxt.pivot.set(textSize.width/2, 0);
            }
            else if (this.heading < 180+22.5) {
                this.distanceTxt.angle = this.heading - 180;
                this.distanceTxt.pivot.set(0, textSize.height/2);
                position = position.add(vectorToPoint(-5, this.heading + 90));
            }
            else if (this.heading < 360-22.5) {
                this.distanceTxt.angle = this.heading - 270;
                this.distanceTxt.pivot.set(textSize.width/2, 0);
            }
            else {
                this.distanceTxt.angle = this.heading;
                this.distanceTxt.pivot.set(0, textSize.height/2);
                position = position.add(vectorToPoint(5, this.heading + 90));
            }
            this.distanceTxt.position = position;
        }
    }

    mouseMove(e: FederatedPointerEvent) {
        const gameCoords = e.getLocalPosition(this.basemap);

        if (!this.line) {
            this.line = new Graphics();
            this.line.eventMode = "none";
            this.line.position.copyFrom(this.basemap.position);
            this.stage.addChild(this.line);
        }

        const textOptions = (align: TextStyleAlign): TextOptions => ({
            style: {
                fontFamily: 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
                fill: 0xffffff,
                align,
            },
        });

        if (!this.start)
            this.start = gameCoords;

        this.end = gameCoords;

        // Line
        this.line.pivot.copyFrom(this.basemap.pivot);
        this.line.scale.copyFrom(this.basemap.scale);

        this.line.clear();
        this.line.moveTo(this.start.x, this.start.y);
        this.line.lineTo(this.end.x, this.end.y);
        this.line.stroke({ color: 0xffffff, pixelLine: true });
        
        // Vars for texts
        const d = pointsToDistance(this.start, this.end) / 33.07144; // (studs/100) to NM
        const distance = floorDp(d, 1); // round distance to 1dp
        const hdg = pointsToHeading(this.start, this.end);
        const oppHdg = getOppHeading(hdg);

        const startHeading = padHeading(Math.round(hdg));
        const endHeading = padHeading(Math.round(oppHdg));

        // Texts
        if (!this.startHdgTxt) {
            this.startHdgTxt = new Text(textOptions("left"));
            this.startHdgTxt.eventMode = "none";
            this.startHdgTxt.position.copyFrom(this.basemap.position);
            this.stage.addChild(this.startHdgTxt);
        }
        if (!this.endHdgTxt) {
            this.endHdgTxt = new Text(textOptions("right"));
            this.endHdgTxt.eventMode = "none";
            this.endHdgTxt.position.copyFrom(this.basemap.position);
            this.stage.addChild(this.endHdgTxt);
        }
        if (!this.distanceTxt) {
            this.distanceTxt = new Text(textOptions("center"));
            this.distanceTxt.eventMode = "none";
            this.distanceTxt.position.copyFrom(this.basemap.position);
            this.stage.addChild(this.distanceTxt);
        }

        this.heading = hdg;
        this.startHdgTxt.text = startHeading;
        this.endHdgTxt.text = endHeading;
        this.distanceTxt.text = `${distance}NM`;
        this.positionGraphics();
    }

    destroy() {
        this.start = undefined;
        this.end = undefined;
        this.heading = undefined;

        this.line?.destroy();
        this.line = undefined;

        this.startHdgTxt?.destroy();
        this.startHdgTxt = undefined;

        this.endHdgTxt?.destroy();
        this.endHdgTxt = undefined;

        this.distanceTxt?.destroy();
        this.distanceTxt = undefined;
    }
}