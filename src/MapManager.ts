import { Assets, Container, Graphics } from "pixi.js";

/** DisplayMap */
export class DisplayMap {
    basemap: Container;
    url: string;
    graphic?: Graphics;
    
    private _visible = false;

    constructor(basemap: Container, url: string) {
        this.basemap = basemap;
        this.url = url;
    }
    
    get visible(): boolean {
        return this._visible;
    }
    set visible(visible: boolean) {
        if (this.graphic)
            this.graphic.visible = visible;
        this._visible = visible;
    }

    async load() {
        const mapAsset = await Assets.load({
            src: this.url,
            data: { parseAsGraphicsContext: true },
        });
        this.graphic = new Graphics(mapAsset).stroke({ color: 0xFFFFFF, pixelLine: true, alpha: 0.4 });
        this.basemap.addChild(this.graphic);
        this.graphic.visible = this.visible;
    }
}

