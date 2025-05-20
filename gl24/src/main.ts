import { Application, Assets, Container, ConvertedStrokeStyle, FederatedPointerEvent, Graphics, GraphicsContext } from "pixi.js";
import { roundDp, acftCollectionToAcftArray } from "./util";
import { AircraftCollection } from "./types"
import AircraftDisplay from "./AircraftDisplay";
import { DisplayMap } from "./MapManager";

/** aircraft collection to aircraft array */
const ac2aa = acftCollectionToAcftArray;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};
const antialias = false;

(async () => {
    // Create a new application
    const app = new Application();

    await app.init({ antialias, background: 0, resizeTo: window });
    document.getElementById("pixi-container")!.appendChild(app.canvas);
    
    const basemap = new Container(); //new Graphics(baseMapAsset).stroke({color: 0xFFFF00, pixelLine: true, alpha: 0.4});

    basemap.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(basemap);

    app.stage.on('pointerdown', e => {
        const mousePos = e.getLocalPosition(basemap);
        // console.log({x: roundDp(mousePos.x*100, 1), y: roundDp(mousePos.y*100, 1)});

    });

    let mapClickCount = 0;
    let Approach25R: Graphics;

    app.stage.on("mousedown", async () => {
        if (mapClickCount == 0) {
            const coastAsset: GraphicsContext = await Assets.load({
                src: "/assets/coast.svg",
                data: { parseAsGraphicsContext: true },
            });

            const coast = new Graphics(coastAsset).stroke({color: 0xFFFF00, pixelLine: true, alpha: 0.4});
            basemap.addChild(coast);
        }
        else if (mapClickCount == 1) {
            const approachAsset: GraphicsContext = await Assets.load({
                src: "/assets/IRFD/25R final.svg",
                data: { parseAsGraphicsContext: true },
            });

            Approach25R = new Graphics(approachAsset).stroke({color: 0xFFFF00, pixelLine: true, alpha: 0.4});
            basemap.addChild(Approach25R);
        }
        else if (mapClickCount == 2) {
            Approach25R.destroy();
        }

        mapClickCount++;

    });

    let acftDisplays: AircraftDisplay[] = [];

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));
    app.stage.on('touchstart', () => app.stage.on('pointermove', dragmap));
    app.stage.on('touchend', () => app.stage.off('pointermove', dragmap));

    function positionTexts() {
        acftDisplays.forEach(acftDisplay => acftDisplay.positionText());
    }

    app.renderer.on("resize", (w, h) => {
        basemap.position.set(w / 2, h / 2);
        positionTexts();
    });

    function dragmap(e: FederatedPointerEvent) {
        // change pivot instead of position so we can zoom from centre
        basemap.pivot.x -= e.movementX / basemap.scale.x;
        basemap.pivot.y -= e.movementY / basemap.scale.x;

        positionTexts();
    }

    app.stage.on('wheel', e => {
        // down scroll, zoom out
        if (e.deltaY > 0)
            basemap.scale.set(basemap.scale.x * 1/1.1);
        // up scroll, zoom in
        else if (e.deltaY < 0)
            basemap.scale.set(basemap.scale.x * 1.1);

        positionTexts();
        // console.log(basemap.scale.x);
    })


    let ping = 3000;


    document.addEventListener("keydown", ev => {
        if (ev.key === "ArrowRight") {
            ping = 3000;
        }
    });

    const pollauthority  = "192.168.0.180:3000" // "localhost:3000"

    // Update aircraft displays
    app.ticker.add((time) =>
    {
        ping += time.deltaMS;
        if (ping >= 3000) {
            ping -= 3000;
            fetch(`http://${pollauthority}/acft-data`).then(async (res) => {
                const acftCollection: AircraftCollection = await res.json();
                const acftDatas = ac2aa(acftCollection);

                // Iterate through the existing displays
                acftDisplays.forEach(display => {
                    // If the display has new data
                    const matchingData = acftDatas.find(acftData => acftData.playerName === display.acftData.playerName);
                    if (matchingData) {
                        display.updateData(matchingData)
                    }
                    else {
                        // The display has no new data
                        display.notFound();
                        if (display.ttl <= 0)
                            display.destroy();
                    }
                });

                // Data that cannot be found in existing displays
                const newAcftDatas = acftDatas.filter(acftData => !acftDisplays.find(display => display.acftData.playerName === acftData.playerName));
                newAcftDatas.forEach(acftData => {
                    const acftDisplay = new AircraftDisplay(acftData, app.stage, basemap);
                    acftDisplays.push(acftDisplay);
                    acftDisplay.positionText();
                });

                // Filter displays with TTL < 0;
                acftDisplays = acftDisplays.filter(display => display.ttl > 0);
            }).catch(() => {
                // Ping failed. All displays not found.
                acftDisplays.forEach(display => {
                    display.notFound();
                    if (display.ttl <= 0)
                        display.destroy();
                });

                acftDisplays = acftDisplays.filter(display => display.ttl > 0);
            });
        }
    });

})();
