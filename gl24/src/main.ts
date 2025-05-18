import { Application, Assets, FederatedPointerEvent, Text, Graphics, NOOP, loadJson } from "pixi.js";
import { roundDp } from "./util";

interface AircraftPosition {
    y: number;
    x: number;
}

interface AircraftCollectionData {
    heading: number;
    playerName: string;
    altitude: number;
    aircraftType: string;
    position: AircraftPosition;
    speed: number;
    wind: string;
    isOnGround: boolean;
    groundSpeed: number;
}

interface AircraftCollection {
    [callsign: string]: AircraftCollectionData;
}

interface AircraftData extends AircraftCollectionData {
    callsign: string;
}

function acftCollectionToAcftArray(acftCollection: AircraftCollection): AircraftData[] {
    return Object.entries(acftCollection).map(([callsign, acftData]) => ({
        callsign,
        ...acftData
    }));
}

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

    await app.init({ antialias: true, background: "#1099bb", resizeTo: window });
    document.getElementById("pixi-container")!.appendChild(app.canvas);


    const basemapAsset = await Assets.load({
        src: '/assets/basemap.svg',
        data: { parseAsGraphicsContext: true },
    });

    const basemap = new Graphics(basemapAsset);

    basemap.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(basemap);

    basemap.eventMode = 'static';
    app.stage.on('pointerdown', e => {
        const mousePos = e.getLocalPosition(basemap)
        console.log({x: roundDp(mousePos.x*100, 1), y: roundDp(mousePos.y*100, 1)});
    });

    const acftsDisplay: { text: Text, acftData: AircraftCollectionData }[] = [];

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));

    function positionTexts() {
        acftsDisplay.forEach(acftDisplay => {
            const {text, acftData} = acftDisplay;
            text.position.copyFrom(basemap.position);
            text.position.x += (acftData.position.x / 100 - basemap.pivot.x) * basemap.scale.x;
            text.position.y += (acftData.position.y / 100 - basemap.pivot.y) * basemap.scale.x;
        });
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

    let ping = 3000

    


    // Initialise aircraft displays
    const initAcftCollectionReq = await fetch("http://localhost:3000/acft-data")
    const initAcftCollection: AircraftCollection = await initAcftCollectionReq.json();
    const initAcftDatas = ac2aa(initAcftCollection);

    initAcftDatas.forEach(acftData => {
        const text = new Text({
            text: '*',
            style: {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffffff,
                align: 'center',
            }
        });
        acftsDisplay.push({ text, acftData });
        positionTexts();
        app.stage.addChild(text);
        console.log(`${acftData.callsign}: ${acftData.position.x}, ${acftData.position.y}`);
    });
    
    // Update aircraft displays
    app.ticker.add((time) =>
    {
        ping += time.deltaMS;
        if (ping >= 3000) {
            ping -= 3000;
            fetch("http://localhost:3000/acft-data").then(async (res) => {
                const newAcftCollection: AircraftCollection = await res.json();
                const newAcftDatas = ac2aa(newAcftCollection);

                newAcftDatas.forEach(acftData => {
                    const matchingDisplay = acftsDisplay.find(display => display.acftData.playerName == acftData.playerName);
                    if (matchingDisplay) {
                        matchingDisplay.acftData = acftData
                    }
                });
            });
            positionTexts();
        }
    });

})();
