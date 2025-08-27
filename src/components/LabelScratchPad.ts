import { Graphics, Text } from "pixi.js";
import AircraftLabel, { assumedTextStyle, unassumedTextStyle } from "./AircraftLabel";

let currentScratchpad: LabelScratchPad | null;

const MAX_CONTENT = 25;
const ALLOWED_CONTENT = /^[a-zA-Z0-9 .+-\/]$/;

function handleKeydown(ev: KeyboardEvent) {    
    if(!currentScratchpad) return;
    
    if(ev.key === "Escape" || ev.key == "Enter") {
        exitScratchpad();
        return;
    }

    if(ev.key === "Delete") {
        currentScratchpad.content = "";
        currentScratchpad.updateText();
    }

    if(ev.key === "Backspace") {        
        if(currentScratchpad.content.length === 0) return;
        currentScratchpad.content = currentScratchpad.content.slice(0, -1);
        currentScratchpad.updateText();
        return;
    }
    
    let regexResult = ev.key.match(ALLOWED_CONTENT);
    
    if(!regexResult) return;
    if(currentScratchpad.content.length + 1 > MAX_CONTENT) return;
    
    currentScratchpad.content += ev.key;
    currentScratchpad.updateText();
}

function exitScratchpad() {
    currentScratchpad?.disableBorderBox();
    currentScratchpad = null;
}

document.addEventListener("keydown", handleKeydown);


export default class LabelScratchPad {
    label: AircraftLabel;

    content: string;
    isBorderBoxDrawn: boolean;
    isBeingEdited: boolean; // same as above, other name for code clarity in main.ts keydown filtering

    textElement: Text;
    borderBox: Graphics;


    constructor(label: AircraftLabel) {
        this.label = label;

        this.content = "";
        
        this.textElement = new Text({
            style: unassumedTextStyle,
            text: label.isAssumed ? "RMK" : ""
        });
        
        this.label.stage.addChild(this.textElement);
        
        this.textElement.interactive = true;
        this.textElement.on("pointerdown", this.handlePointerdown.bind(this));
        
        this.isBorderBoxDrawn = false;
        this.isBeingEdited = false;
        this.borderBox = new Graphics();
        this.label.stage.addChild(this.borderBox);
    }

    // Event Handlers
    ///////////////////

    handlePointerdown() {
        if(!this.label.isAssumed) return;
        currentScratchpad = this;
        this.enableBorderBox();
        this.renderBorderBox();
    }

    // Graphics
    renderBorderBox() {
        this.borderBox.clear();
        
        if(!this.isBorderBoxDrawn) return;

        this.borderBox.moveTo(this.textElement.position.x, this.textElement.position.y);
        let {minX, minY, width, height} = this.textElement.getBounds();

        this.borderBox.rect(minX, minY, width, height);
        this.borderBox.stroke({
            width: 2,
            color: "#ff0000"
        });
    }

    enableBorderBox() {
        this.isBorderBoxDrawn = true;
        this.isBeingEdited = true;
        this.renderBorderBox();
    }

    disableBorderBox() {
        this.isBorderBoxDrawn = false;
        this.isBeingEdited = false;
        this.renderBorderBox();
    }

    // Updates
    updateText() {
        this.textElement.style = this.label.isAssumed ? assumedTextStyle : unassumedTextStyle;
        if(this.label.isAssumed) this.textElement.text = this.content || "RMK"
        else this.textElement.text = this.content || ""
        this.renderBorderBox();
    }

    updatePosition() {
        this.textElement.position.copyFrom(this.label.dataBlock.position);

        this.textElement.position.y += this.label.dataBlock.height;

        this.renderBorderBox();
    }

    destroy() {
        this.textElement.destroy(true);
    }
}