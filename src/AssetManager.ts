import { Container, Graphics, GraphicsContext } from "pixi.js";
import assetCategories from "./data/assets.json";
import { SVGParser } from "./lineParser/SVGParser";

const defaultStyle = {
    color: 0xFFFFFF, pixelLine: true, alpha: 0.4
};

export default class AssetManager {
    basemap: Container;
    private loadedAssets = new Map<string, Graphics>();

    constructor(basemap: Container) {
        this.basemap = basemap;
    }

    getCategory(cateogryName: string) {
        const category = assetCategories.find(category => category.cateogry === cateogryName);
        return category;
    }

    parseAssetString(assetString: string) {
        const parts = assetString.split("/");
        const [cateogryName, assetId] = parts;
        if (!cateogryName || !assetId) throw new Error(`AssetManager: Could not parse asset string ${assetString}.`);

        const category = assetCategories.find(category => category.cateogry === cateogryName);
        if (!category) throw new Error(`AssetManager: Asset category with name ${cateogryName} not found.`);

        const assetInfo = category.assets.find(asset => asset.id === assetId);
        if (!assetInfo) throw new Error(`AssetManager: Asset with name ${assetString} not found.`);

        return assetInfo;
    }
    
    async loadAsset(assetString: string) {
        const cachedAsset = this.loadedAssets.get(assetString);
        if (cachedAsset) {
            return cachedAsset
        }

        const assetInfo = this.parseAssetString(assetString);
        console.log(`Loading ${assetInfo.route}`);
        const assetRequest = await fetch(assetInfo.route);
        const assetSource = await assetRequest.text();

        const assetContext = SVGParser(assetSource, new GraphicsContext());
    
        const assetGraphics = new Graphics();
        assetContext.paths.forEach(path => {
            assetGraphics
                .path(path)
                .stroke(assetInfo.defaultStyle || defaultStyle);
        });

        this.loadedAssets.set(assetString, assetGraphics);
        this.basemap.addChild(assetGraphics);
        return assetGraphics;
    }

    unloadAsset(assetString: string) {
        const asset = this.loadedAssets.get(assetString);
        if (asset) {
            asset.destroy();
        }
        this.loadedAssets.delete(assetString);
    }

    isAssetLoaded(assetString: string) {
        return this.loadedAssets.has(assetString);
    }
}

