import { Application, Assets, FederatedPointerEvent, Graphics } from "pixi.js";
import { roundDp, acftCollectionToAcftArray } from "./util";
import { AircraftCollection } from "./types"
import AircraftDisplay from "./AircraftDisplay";

/** aircraft collection to aircraft array */
const ac2aa = acftCollectionToAcftArray;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};

(async () => {
    // Create a new application
    const app = new Application();

    await app.init({ antialias: true, background: "#181818", resizeTo: window });
    document.getElementById("pixi-container")!.appendChild(app.canvas);


    const basemapAsset = await Assets.load({
        src: '/assets/basemap.svg',
        data: { parseAsGraphicsContext: true },
    });

    const basemap = new Graphics(basemapAsset);

    basemap.position.set(app.screen.width / 2, app.screen.height / 2);
    basemap.scale.set(1);
    app.stage.addChild(basemap);

    basemap.eventMode = 'static';
    app.stage.on('pointerdown', e => {
        const mousePos = e.getLocalPosition(basemap)
        console.log({x: roundDp(mousePos.x*100, 1), y: roundDp(mousePos.y*100, 1)});
    });

    let acftDisplays: AircraftDisplay[] = [];

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));

    function positionTexts() {
        acftDisplays.forEach(acftDisplay => acftDisplay.positionText());
    }

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
        console.log(basemap.scale.x);
    })





    let ping = 3000;


    document.addEventListener("keydown", ev => {
        if (ev.key === "ArrowRight") {
            ping = 3000;
        }
    })

    // Initialise aircraft displays
    const initAcftCollectionReq = await fetch("http://localhost:3000/acft-data")
    const initAcftCollection: AircraftCollection = await initAcftCollectionReq.json();
    const initAcftDatas = ac2aa(initAcftCollection);

    initAcftDatas.forEach(acftData => {
        const acftDisplay = new AircraftDisplay(acftData, app.stage, basemap);
        acftDisplays.push(acftDisplay);
        acftDisplay.positionText();
        console.log(`${acftData.callsign}: ${acftData.position.x}, ${acftData.position.y}`);
    });
    

    // Update aircraft displays
    app.ticker.add((time) =>
    {
        ping += time.deltaMS;
        if (ping >= 3000) {
            ping -= 3000;
            fetch("http://localhost:3000/acft-data").then(async (res) => {
                const acftCollection: AircraftCollection = await res.json();
                const acftDatas = ac2aa(acftCollection);

                const displaysToKill = [];

                // Iterate through the existing displays
                acftDisplays.forEach((display, index) => {
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
                            displaysToKill.push(index);
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
            });
        }
    });

})();
