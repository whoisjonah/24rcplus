import { Container, Graphics, GraphicsContext } from "pixi.js";
import assets from "./assets.json";
import { SVGParser } from "./lineParser/SVGParser";

const defaultStyle = {
    color: 0xFFFFFF, pixelLine: true, alpha: 0.4
};

const loadedAssets: Asset[] = [];

class Asset {
    name;
    graphics;

    constructor (name: string, graphics: Graphics) {
        this.name = name;
        this.graphics = graphics;
    }
}

export class AssetManager {
    basemap: Container;

    constructor(basemap: Container) {
        this.basemap = basemap;
    }
    
    async loadAsset(assetName: string) {
        const assetInfo = assets.find(asset => asset.name === assetName);
        if (!assetInfo) throw new Error(`AssetManager: Asset with name ${assetName} not found`);

        const assetRequest = await fetch(assetInfo.route);
        const assetSource = await assetRequest.text();

        const assetContext = SVGParser(assetSource, new GraphicsContext());
    
        const assetGraphics = new Graphics();
        assetContext.paths.forEach(path => {
            assetGraphics
                .path(path)
                .stroke(assetInfo.defaultStyle || defaultStyle);
        });

        const asset = new Asset(assetInfo.name, assetGraphics);
        loadedAssets.push(asset);

        this.basemap.addChild(assetGraphics);
        return assetGraphics;
    }
}

