import { Container, Graphics, Text, TextStyle } from "pixi.js";
import FixesJson from "../data/Fixes.json";
import config from "../config";

interface Fix {
    name: string;
    x: number;
    y: number;
    type?: string;
}

const fixesTextStyle: Partial<TextStyle> = {
    fontFamily: 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 10,
    fill: 0x9e9e9e,
    align: "center",
};

// Defaults for alignment tuning
const DEFAULT_SCALE = 1.108;
const DEFAULT_OFFSET_X = 0;
const DEFAULT_OFFSET_Y = 0;

export default class FixesLayer {
    stage: Container;
    basemap: Container;
    container: Container;
    fixes: Fix[];
    isDestroyed: boolean;

    constructor(stage: Container, basemap: Container) {
        this.stage = stage;
        this.basemap = basemap;
        this.container = new Container();
        this.stage.addChild(this.container);
        this.fixes = FixesJson.fixes || [];
        this.isDestroyed = false;
        
        this.draw();
    }

    // Expose helper to adjust fix alignment at runtime from browser console.
    // Usage example in console:
    //   window.adjustFixes({ scale: 1.12, offsetX: 10, offsetY: -6 })
    //   window.getFixesAlignment()
    static exposeAdjustmentHelpers() {
        (window as any).adjustFixes = ({ scale, offsetX, offsetY }: { scale?: number, offsetX?: number, offsetY?: number }) => {
            if (typeof scale === 'number') localStorage.setItem('fixes_scale', String(scale));
            if (typeof offsetX === 'number') localStorage.setItem('fixes_offset_x', String(offsetX));
            if (typeof offsetY === 'number') localStorage.setItem('fixes_offset_y', String(offsetY));
            // Trigger a redraw if a FixesLayer instance exists
            try { (window as any).refreshFixes?.(); } catch (e) { }
        };

        (window as any).getFixesAlignment = () => {
            return {
                scale: Number(localStorage.getItem('fixes_scale')) || DEFAULT_SCALE,
                offsetX: Number(localStorage.getItem('fixes_offset_x')) || DEFAULT_OFFSET_X,
                offsetY: Number(localStorage.getItem('fixes_offset_y')) || DEFAULT_OFFSET_Y,
            };
        };
    }

    private draw() {
        this.container.removeChildren();

        if (!config.showFixes) {
            return;
        }

        // Alignment factors can be tuned at runtime via localStorage or
        // window.adjustFixes({ scale, offsetX, offsetY }).
        const storedScale = Number(localStorage.getItem('fixes_scale')) || DEFAULT_SCALE;
        const storedOffsetX = Number(localStorage.getItem('fixes_offset_x')) || DEFAULT_OFFSET_X;
        const storedOffsetY = Number(localStorage.getItem('fixes_offset_y')) || DEFAULT_OFFSET_Y;

        const scaleFactor = storedScale;
        const offsetX = storedOffsetX;
        const offsetY = storedOffsetY;

        // Game world extents (from commented gameCoords)
        const topLeft = { x: -49222.1, y: -45890.8 };
        const bottomRight = { x: 47132.9, y: 46139.2 };
        const spanXGame = bottomRight.x - topLeft.x;
        const spanYGame = bottomRight.y - topLeft.y;
        const gameCenterX = topLeft.x + spanXGame / 2;
        const gameCenterY = topLeft.y + spanYGame / 2;

        // Fix extents
        const minX = Math.min(...this.fixes.map(f => f.x));
        const maxX = Math.max(...this.fixes.map(f => f.x));
        const minY = Math.min(...this.fixes.map(f => f.y));
        const maxY = Math.max(...this.fixes.map(f => f.y));
        const spanXFix = (maxX - minX) || 1;
        const spanYFix = (maxY - minY) || 1;

        this.fixes.forEach(fix => {
            // Map fix local coords into game box, then apply scale about center and offsets
            const baseX = topLeft.x + ((fix.x - minX) / spanXFix) * spanXGame;
            const baseY = topLeft.y + ((fix.y - minY) / spanYFix) * spanYGame;

            const gameX = gameCenterX + (baseX - gameCenterX) * scaleFactor + offsetX;
            const gameY = gameCenterY + (baseY - gameCenterY) * scaleFactor + offsetY;

            const screenX = (gameX / 100 - this.basemap.pivot.x) * this.basemap.scale.x + this.basemap.position.x;
            const screenY = (gameY / 100 - this.basemap.pivot.y) * this.basemap.scale.y + this.basemap.position.y;

            // Draw uniform grey triangle marker (70% opacity)
            const FIX_COLOR = 0x9e9e9e;
            const triangle = new Graphics();
            triangle.moveTo(screenX, screenY - 4);
            triangle.lineTo(screenX - 4, screenY + 4);
            triangle.lineTo(screenX + 4, screenY + 4);
            triangle.closePath();
            triangle.beginFill(FIX_COLOR, 0.7);
            triangle.endFill();
            triangle.alpha = 0.7;
            this.container.addChild(triangle);

            // Add fix name label
            const label = new Text({
                text: fix.name,
                style: fixesTextStyle,
            });
            label.position.set(screenX + 6, screenY - 6);
            label.anchor.set(0, 1);
            label.alpha = 0.7;
            this.container.addChild(label);
        });
    }

    updatePosition() {
        if (this.isDestroyed) return;
        this.draw();
    }

    destroy() {
        this.isDestroyed = true;
        this.container.destroy(true);
    }
}

// Ensure the window helper functions are available immediately
try { FixesLayer.exposeAdjustmentHelpers(); } catch (e) { /* ignore during build */ }
