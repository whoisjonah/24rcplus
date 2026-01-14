import { Container, Graphics, Text, TextStyle, Rectangle } from "pixi.js";
import { AircraftData } from "../types";
import config from "../config";
import airlineMap from "../data/AirlineMap.json";

import { acftToScreenPos, ScreenPosition } from "../helpers/coordConversions";
import LabelScratchPad from "./LabelScratchPad";

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
    flClickZone: Graphics;
    spdClickZone: Graphics;
    fpButton: Text;
    scratchPad: LabelScratchPad;
    baseFontSize = 14;
    assignedFL: string | null = null;
    assignedSpeed: string | null = null;

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

        // Click zones for FL / speed selection
        this.flClickZone = new Graphics();
        this.flClickZone.eventMode = 'static';
        this.flClickZone.cursor = 'pointer';
        this.flClickZone.on('pointertap', ev => this.openFLDropdown(ev));
        this.stage.addChild(this.flClickZone);

        this.spdClickZone = new Graphics();
        this.spdClickZone.eventMode = 'static';
        this.spdClickZone.cursor = 'pointer';
        this.spdClickZone.on('pointertap', ev => this.openSpeedDropdown(ev));
        this.stage.addChild(this.spdClickZone);

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
        
        // Show the flight plan callsign if present, otherwise convert in-game callsign to ICAO
        let callsign = this.acftData.flightPlanCallsign || this.convertToICAO(this.acftData.callsign);
        
        if (this.isAssumed) {
            // Show full data block for assumed aircraft
            this.dataBlock.style = assumedTextStyle;
            
            // Format flight level with two digits below FL100 (drop leading zero)
            const fl = Math.floor(this.acftData.altitude / 100);
            const altFormatted = fl < 100 ? fl.toString().padStart(2, '0') : fl.toString();
            
            // Format speed (2-3 digits)
            const speedFormatted = Math.round(this.acftData.speed).toString();
            
            // Build data block
            const afl = this.assignedFL ? `AFL${this.assignedFL}` : "AFL";
            const asp = this.assignedSpeed ? `ASP${this.assignedSpeed}` : "ASP";
            this.dataBlock.text = `${callsign}\nFL${altFormatted} ${speedFormatted}kt\n${afl} ${asp}`;
            
            this.fpButton.visible = true;
        } else {
            // Show only callsign for unassumed aircraft
            this.dataBlock.style = unassumedTextStyle;
            this.dataBlock.text = callsign;
            this.fpButton.visible = false;
            this.assignedFL = null;
            this.assignedSpeed = null;
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

        // Update FL / speed click zones when assumed
        this.flClickZone.clear();
        this.spdClickZone.clear();
        if (this.isAssumed) {
            const lines = this.dataBlock.text.split('\n');
            const approxLineH = lines.length > 0 ? this.dataBlock.height / lines.length : lineHeight;
            const line3Y = bounds.minY + approxLineH * 2; // AFL/ASP line

            const aflText = this.assignedFL ? `AFL${this.assignedFL}` : "AFL";
            const aflWidth = this.measureTextWidthTemp(aflText, this.dataBlock.style);
            const aspWidth = bounds.width - aflWidth - 6; // ASP takes remaining space
            const aspX = bounds.minX + aflWidth + 6;

            // AFL portion opens FL dropdown
            this.setZoneRect(this.flClickZone, bounds.minX, line3Y, aflWidth, approxLineH, 0.06);

            // ASP portion opens speed dropdown
            this.setZoneRect(this.spdClickZone, aspX, line3Y, aspWidth, approxLineH, 0.06);
        }

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

    private openFLDropdown(ev: PointerEvent) {
        ev.stopPropagation();
        this.openDropdown(this.getFlightLevelOptions(), ev.clientX, ev.clientY, selected => {
            this.assignedFL = selected;
            this.formatText();
            this.updatePosition();
        });
    }

    private openSpeedDropdown(ev: PointerEvent) {
        ev.stopPropagation();
        this.openDropdown(this.getSpeedOptions(), ev.clientX, ev.clientY, selected => {
            this.assignedSpeed = selected;
            this.formatText();
            this.updatePosition();
        });
    }

    private getFlightLevelOptions(): string[] {
        const opts: string[] = [];
        for (let fl = 10; fl <= 450; fl += 5) {
            opts.push(fl.toString().padStart(3, '0'));
        }
        return opts;
    }

    private getSpeedOptions(): string[] {
        const opts: string[] = [];
        for (let spd = 80; spd <= 340; spd += 5) {
            opts.push(spd.toString());
        }
        return opts;
    }


    private openDropdown(options: string[], x: number, y: number, onSelect: (val: string) => void) {
        // Remove any existing dropdown
        document.querySelectorAll('.label-dropdown').forEach(el => el.remove());

        const menu = document.createElement('div');
        menu.className = 'label-dropdown';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.background = 'rgba(0,0,0,0.9)';
        menu.style.border = '1px solid #4d9d4d';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.zIndex = '3000';
        menu.style.maxHeight = '220px';
        menu.style.overflowY = 'auto';
        menu.style.scrollbarWidth = 'none'; // Hide scrollbar in Firefox
        (menu.style as any).msOverflowStyle = 'none'; // Hide scrollbar in IE/Edge
        menu.style.fontFamily = 'ui-monospace, monospace';
        menu.style.fontSize = '12px';
        menu.style.color = '#d8ffd8';

        options.forEach(val => {
            const item = document.createElement('div');
            item.textContent = val;
            item.style.padding = '2px 6px';
            item.style.cursor = 'pointer';
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(77,157,77,0.35)');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                onSelect(val);
                menu.remove();
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Hide scrollbar in Chrome/Webkit browsers
        const style = document.createElement('style');
        style.textContent = `.label-dropdown::-webkit-scrollbar { display: none; }`;
        document.head.appendChild(style);

        const closeOnClick = (evt: MouseEvent) => {
            if (!menu.contains(evt.target as Node)) {
                menu.remove();
                window.removeEventListener('mousedown', closeOnClick, true);
            }
        };
        window.addEventListener('mousedown', closeOnClick, true);
    }

    private setZoneRect(target: Graphics, x: number, y: number, w: number, h: number, alpha = 0.06) {
        target.clear();
        target.hitArea = new Rectangle(x, y, w, h);
        target.rect(x, y, w, h);
        target.fill({ color: 0x000000, alpha });
    }

    private measureTextWidthTemp(text: string, style: any): number {
        const temp = new Text({ text, style });
        const width = temp.width;
        temp.destroy();
        return width;
    }

    private convertToICAO(callsign: string): string {
        // Extract airline name from callsign (e.g., "Tedex-4579" → "Tedex")
        const parts = callsign.split('-');
        const airlineName = parts[0];
        
        // Look up in AirlineMap
        const icao = (airlineMap as any)[airlineName];
        
        // Return ICAO code + flight number, or original if not found
        if (icao && parts[1]) {
            return icao + parts[1];
        }
        return callsign; // Fallback to original if no match
    }

    destroy() {
        this.isDestroyed = true;
        this.line.destroy(true);
        this.dataBlock.destroy(true);
        this.callsignClickZone.destroy(true);
        this.flClickZone.destroy(true);
        this.spdClickZone.destroy(true);
        this.fpButton.destroy(true);
        this.scratchPad.destroy();
    }
}
