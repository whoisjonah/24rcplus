import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { AircraftData } from "../types";
import config from "../config";

import AirlineMapJson from "../data/AirlineMap.json";
import { acftToScreenPos, ScreenPosition } from "../helpers/coordConversions";
import LabelScratchPad from "./LabelScratchPad";
const AirlineMap = new Map(Object.entries(AirlineMapJson));

function callsignToIcao(callsign: string) {
    const callsignParts = callsign.split("-");
    const carrier = callsignParts[0];
    const number = callsignParts[1];
    const icaoCarrier = AirlineMap.get(carrier);
    if (!icaoCarrier)
        return;
    return `${icaoCarrier}${number}`;
}

function callsignFallback(callsign: string) {
    const callsignParts = callsign.split("-");
    const carrier = callsignParts[0];
    const number = callsignParts[1];
    return `${carrier.toUpperCase()}${number}`;
}

export const unassumedTextStyle: Partial<TextStyle> = {
    fontFamily:
        'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
    fill: 0x8f8f8f,
    align: "left",
};

export const assumedTextStyle: Partial<TextStyle> = {
    fontFamily:
        'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
    fill: 0xffffff,
    align: "left",
}

export default class AircraftLabel {
    isDestroyed: boolean;

    stage: Container;
    basemap: Container;
    acftData: AircraftData;
    prevAlt: number;

    isHovered: boolean;
    isDragged: boolean;
    isFlipped: boolean;
    isAssumed: boolean;
    dragOffset: ScreenPosition;
    callsignZoneDragStart: { x: number, y: number } | null;
    
    lastClickTime: number;

    line: Graphics;
    hoverBackground: Graphics;
    dataBlock: Text;
    callsignClickZone: Graphics;
    fpButton: Text;
    scratchPad: LabelScratchPad;
    baseFontSize = 14;

    /**
     * @param acftData AircraftData of the aircraft being tracked
     * @param stage Stage to draw the aircraft track to
     */
    constructor(acftData: AircraftData, stage: Container, basemap: Container) {
        this.isDestroyed = false;

        this.acftData = acftData;
        this.prevAlt = acftData.altitude;
        this.stage = stage;
        this.basemap = basemap;

        this.line = new Graphics();
        this.stage.addChild(this.line);

        this.hoverBackground = new Graphics();
        this.isHovered = false;
        this.isDragged = false;
        this.isFlipped = false;
        this.isAssumed = false;
        this.lastClickTime = 0;
        this.callsignZoneDragStart = null;

        this.dragOffset = {
            x: 0,
            y: 0
        };
        this.stage.addChild(this.hoverBackground);

        this.dataBlock = new Text({
            style: unassumedTextStyle,
        });

        this.dataBlock.interactive = true;

        this.dataBlock.on("pointerover", () => this.handlePointerEnter());
        this.dataBlock.on("pointerout", () => this.handlePointerLeave());
        this.dataBlock.on("pointerdown", (ev) => this.handlePointerDown(ev));
        this.dataBlock.on("pointerup", () => this.handlePointerUp());
        this.dataBlock.on("pointermove", this.handlePointerMove.bind(this));
        this.dataBlock.on("rightclick", () => this.handleRightClick());
        this.stage.addChild(this.dataBlock);

        // Create invisible clickable zone for callsign line to show context menu
        this.callsignClickZone = new Graphics();
        this.callsignClickZone.interactive = true;
        this.callsignClickZone.on('pointerdown', (ev) => {
            if (ev.button === 0) {
                this.callsignZoneDragStart = { x: ev.clientX, y: ev.clientY };
            }
        });
        this.callsignClickZone.on('pointerup', (ev) => {
            if (ev.button === 0 && this.callsignZoneDragStart) {
                const dx = ev.clientX - this.callsignZoneDragStart.x;
                const dy = ev.clientY - this.callsignZoneDragStart.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Only show context menu if it was a click (not a drag)
                if (distance < 5 && (window as any).showContextMenu) {
                    (window as any).showContextMenu(this.acftData, ev.clientX, ev.clientY, this.isAssumed);
                }
                this.callsignZoneDragStart = null;
            }
        });
        this.stage.addChild(this.callsignClickZone);

        // Create FP button
        this.fpButton = new Text({
            text: 'FP',
            style: {
                fontFamily: 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: 14,
                fill: 0x00ff00,
                align: 'left',
            },
        });
        this.fpButton.interactive = true;
        this.fpButton.visible = false;
        this.fpButton.on('pointerdown', () => this.handleFPButtonClick());
        this.fpButton.on('pointerover', () => {
            this.fpButton.style.fill = 0x00cc00;
        });
        this.fpButton.on('pointerout', () => {
            this.fpButton.style.fill = 0x00ff00;
        });
        this.stage.addChild(this.fpButton);

        this.scratchPad = new LabelScratchPad(this);

    this.applyFontScale();

        this.updateData(acftData);
        this.formatText();
        this.updatePosition();

        this.scratchPad.updatePosition();
    }

    applyFontScale() {
        if (this.isDestroyed) return;
        const scale = config.labelScale || 1;
        const nextSize = Math.max(8, Math.round(this.baseFontSize * scale));

        // Mutate shared styles so scratchpad pulls correct size on next update
        unassumedTextStyle.fontSize = nextSize;
        assumedTextStyle.fontSize = nextSize;

        this.dataBlock.style.fontSize = nextSize;
        this.fpButton.style.fontSize = nextSize;
        this.scratchPad.textElement.style.fontSize = nextSize;
        this.scratchPad.updateText();

        this.updatePosition();
        this.updateGraphics();
    }

    formatText() {
        if (this.isDestroyed) return;
        
        const callsign = callsignToIcao(this.acftData.callsign) || callsignFallback(this.acftData.callsign);
        
        if (this.isAssumed) {
            // Show full data block for assumed aircraft
            this.dataBlock.style = assumedTextStyle;
            
            // Format altitude (3 digits, pad with leading zeros if needed)
            const altFormatted = Math.floor(this.acftData.altitude / 100).toString().padStart(3, '0');
            
            // Format speed (2-3 digits)
            const speedFormatted = Math.round(this.acftData.speed).toString();
            
            // Format heading (3 digits)
            const headingFormatted = Math.round(this.acftData.heading).toString().padStart(3, '0');
            
            // Get aircraft type (abbreviated)
            const acftType = this.acftData.aircraftType.replace('Boeing ', 'B').replace('Airbus ', '');
            
            // Build data block
            // Line 1: Callsign
            // Line 2: FL + altitude, speed + kt
            // Line 3: heading + °, aircraft type
            this.dataBlock.text = `${callsign}\nFL${altFormatted} ${speedFormatted}kt\n${headingFormatted}° ${acftType}`;
            
            this.fpButton.visible = true;
        } else {
            // Show only callsign for unassumed aircraft
            this.dataBlock.style = unassumedTextStyle;
            this.dataBlock.text = callsign;
            this.fpButton.visible = false;
        }
    }

    drawHoveringBackground() {
        if (this.isDestroyed) return;
        this.hoverBackground.clear();
        if (!this.isHovered) return;
        /* Redraw each time to future proof for changes to the label */
        this.hoverBackground.clear();
        const { minX, minY, width, height } = this.dataBlock.getBounds();

        this.hoverBackground.rect(minX, minY, width, height);

        this.hoverBackground.fill({
            color: 'rgba(119, 119, 119, 0.30)'
        });
    }

    drawLine() {
        /* Only runs when acft data is received, not every frame, that's fine */
        if (this.isDestroyed) return;
        this.line.clear();
        const { x: acftX, y: acftY } = acftToScreenPos(this.acftData, this.basemap);

        const labelX = this.dataBlock.position.x;
        const labelY = this.dataBlock.position.y + this.dataBlock.height / 2;

        this.line.moveTo(acftX, acftY);
        this.line.lineTo(labelX, labelY);

        this.line.stroke({
            width: 1,
            color: 0x6f6f6f,
        });
    }

    // Event handlers
    ////////////////////
    handlePointerEnter() {
        this.isHovered = true;
        this.drawHoveringBackground();
    }

    handlePointerLeave() {
        this.isHovered = false;
        this.drawHoveringBackground();
    }
    handlePointerDown(_ev: PointerEvent) {
        // Start dragging on any mouse button
        this.isDragged = true;
        // I changed this to global drag handlers as dragging the label fast would cause the mouse to leave the label
        // and stop receiving pointermove events, making it impossible to drag fast or far. - awdev 11.24.2025
    
        const moveHandler = (ev: PointerEvent) => {
            if (!this.isDragged) return;

            this.dragOffset.x += ev.movementX / this.basemap.scale.x;
            this.dragOffset.y += ev.movementY / this.basemap.scale.y;

            this.isFlipped =
                this.dataBlock.position.x - acftToScreenPos(this.acftData, this.basemap).x < 0;

            this.updatePosition();
            this.updateGraphics();
            this.scratchPad.updatePosition();
        };

        const upHandler = () => {
            this.isDragged = false;
            window.removeEventListener("pointermove", moveHandler);
            window.removeEventListener("pointerup", upHandler);
        };

        window.addEventListener("pointermove", moveHandler);
        window.addEventListener("pointerup", upHandler);
    }

    handlePointerUp() {
        this.isDragged = false;
    }

    handlePointerMove(ev: PointerEvent) {
        const { minX, minY, maxX, maxY } = this.dataBlock.getBounds();

        /* Even if I wanted to I couldnt tell you why its there */
        /* Number can be retrieved by looking at the result of ev.y - maxY at the borders */
        const mouseOffset = -75;

        if (this.isDragged) {
            /**
             * Double verify that the mouse is still over the label
             * This is necessary because of the zoom going into the screen center instead
             * of to the mouse, so by scrolling users may move their mouse off the label
             * while dragging it
             */

            this.isDragged =
                ev.x >= minX &&
                ev.x <= maxX &&
                ev.y + mouseOffset >= minY &&
                ev.y + mouseOffset <= maxY &&
                ev.buttons === 1 // make sure mouse is still held to drag
        }


        if (!this.isDragged) return;

        this.dragOffset.x += ev.movementX / this.basemap.scale.x;
        this.dragOffset.y += ev.movementY / this.basemap.scale.y;

        this.isFlipped = this.dataBlock.position.x - acftToScreenPos(this.acftData, this.basemap).x < 0;

        this.scratchPad.updatePosition();

        this.updatePosition();
        this.updateGraphics();
    }

    handleRightClick() {
        // Right-click also shows context menu
        if ((window as any).showContextMenu) {
            (window as any).showContextMenu(this.acftData, 0, 0, this.isAssumed);
        }
    }

    handleFPButtonClick() {
        // Open flight plan modal when FP button is clicked
        if ((window as any).showFlightPlanModal) {
            (window as any).showFlightPlanModal(this.acftData);
        }
    }

    /**
     * Update all graphics included in this component
     */
    updateGraphics() {
        this.drawLine();
        this.drawHoveringBackground();
    }

    /**
     * Reposition label relative to its aircraft
     */
    updatePosition() {
        if (this.isDestroyed) return;
        this.dataBlock.position.copyFrom(this.basemap.position);

        const flipFactor = 0;

        this.dataBlock.position.x += (this.acftData.position.x / 100 - this.basemap.pivot.x + this.dragOffset.x - flipFactor) * this.basemap.scale.x;
        this.dataBlock.position.y += (this.acftData.position.y / 100 - this.basemap.pivot.y + this.dragOffset.y) * this.basemap.scale.y;

        this.dataBlock.position.x += 18;
        this.dataBlock.position.y -= 12;

        // Update callsign click zone to cover the callsign (first line for assumed, entire text for unassumed)
        const bounds = this.dataBlock.getBounds();
        const lineHeight = this.dataBlock.style.fontSize as number || 14;
        this.callsignClickZone.clear();
        if (this.isAssumed) {
            // Only cover first line (callsign) for assumed aircraft
            this.callsignClickZone.rect(bounds.minX, bounds.minY, bounds.width, lineHeight);
        } else {
            // Cover entire text for unassumed aircraft (which is just the callsign anyway)
            this.callsignClickZone.rect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
        this.callsignClickZone.fill({ color: 0x000000, alpha: 0.01 }); // Nearly invisible

        this.scratchPad.updatePosition();

        // Position FP button to the right of the scratchpad
        if (this.fpButton.visible) {
            const scratchpadBounds = this.scratchPad.textElement.getBounds();
            this.fpButton.position.x = scratchpadBounds.maxX + 4;
            this.fpButton.position.y = scratchpadBounds.minY;
        }
    }

    updateData(acftData: AircraftData) {
        this.acftData = acftData;
        this.updatePosition();
        this.formatText();
        this.drawLine();
    }

    tickUpdate() {
        this.updatePosition();
        this.updateGraphics();
    }

    destroy() {
        this.isDestroyed = true;
        this.line.destroy(true);
        this.dataBlock.destroy(true);
        this.callsignClickZone.destroy(true);
        this.fpButton.destroy(true);
        this.scratchPad.destroy();
    }
}
