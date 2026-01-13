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
    fill: 0x4d9d4d,
    align: "center",
};

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

    private draw() {
        this.container.removeChildren();

        if (!config.showFixes) {
            return;
        }

        // Fixed alignment factors derived from tuning session
        const scaleFactor = 1.108;
        const offsetX = 0;
        const offsetY = 0;

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

            // Draw fix marker (small triangle)
            const triangle = new Graphics();
            triangle.moveTo(screenX, screenY - 4);
            triangle.lineTo(screenX - 4, screenY + 4);
            triangle.lineTo(screenX + 4, screenY + 4);
            triangle.closePath();
            triangle.fill({ color: 0x4d9d4d });
            this.container.addChild(triangle);

            // Add fix name label
            const label = new Text({
                text: fix.name,
                style: fixesTextStyle,
            });
            label.position.set(screenX + 6, screenY - 6);
            label.anchor.set(0, 1);
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
