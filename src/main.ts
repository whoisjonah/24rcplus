import { Application, Assets, Container, FederatedPointerEvent, Graphics, GraphicsContext } from "pixi.js";
import { acftCollectionToAcftArray } from "./util";
import { SVGParser } from "./lineParser/SVGParser";
import { AircraftCollection } from "./types";
import AircraftTrack from "./AircraftTrack";

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

    let failed = false;
    let failReason = "";
    await app.init({ antialias, background: 0, resizeTo: window }).catch(e => { failed = true; failReason = e });
    if (failed) {
        document.body.innerHTML = `Could not start. Try reloading. ${failReason}`;
        return;
    }
    document.getElementById("pixi-container")!.appendChild(app.canvas);
    
    const basemap = new Container();

    const trackContainer = new Container();
    basemap.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(basemap);
    app.stage.addChild(trackContainer);


    // const expensiveAsset = await Assets.load<Texture>("/assets/expensive.png");
    // const expensiveSprite = new Sprite(expensiveAsset);
    // const expensiveContainer = new Container();

    // expensiveSprite.scale.x = (gameSize.x / expensiveSprite.width/100)
    // expensiveSprite.scale.y = (gameSize.y / expensiveSprite.height/100)
    // expensiveContainer.addChild(expensiveSprite);

    // expensiveContainer.pivot.set(-gameCoords.top_left.x/100, -gameCoords.top_left.y/100);
    // // expensiveContainer.position.set(gameCoords.top_left.x/100, gameCoords.top_left.y/100);
    // basemap.addChild(expensiveContainer);



    const coastAsset: GraphicsContext = await Assets.load({
        src: "/assets/coast.svg",
        data: { parseAsGraphicsContext: true },
    });
    const coast = new Graphics(coastAsset)
        .stroke({color: 0xFFFF00, pixelLine: true, alpha: 0.4});
    const coastContainer = new Container();
    coastContainer.addChild(coast);
    basemap.addChild(coastContainer);

    // const e = await fetch("/assets/IRFD/25R final.svg")
    // const f = await e.text();

    // const session = SVGParser(f, new GraphicsContext());

    // const Approach25R = new Graphics();
    // Approach25R.setStrokeStyle({ pixelLine: true})
    // // session.paths.forEach(path => {
    //     Approach25R
    //         .path(path)
    //         .stroke();
    // })

    // basemap.addChild(Approach25R);
    // Approach25R.alpha = 0.4;
    // Approach25R.tint = 0xFFFF00;


    const groundSourceReq = await fetch("/assets/all-grounds.svg")
    const groundSource = await groundSourceReq.text();

    const groundSvgSess = SVGParser(groundSource, new GraphicsContext());

    const allGrounds = new Graphics();
    allGrounds.setStrokeStyle({ pixelLine: true });
    groundSvgSess.paths.forEach(path => {
        allGrounds
            .path(path)
            .stroke();
    });

    basemap.addChild(allGrounds);
    allGrounds.alpha = 0.2;




    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));
    app.stage.on('touchstart', () => app.stage.on('pointermove', dragmap));
    app.stage.on('touchend', () => app.stage.off('pointermove', dragmap));

    let acftDisplays: AircraftTrack[] = [];

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

    // const pollauthority = "http://localhost:3000";
    const pollauthority = "https://24data.ptfs.app";

    // Update aircraft displays
    const tick = () => {
        fetch(`${pollauthority}/acft-data`).then(async (res) => {
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
                const acftDisplay = new AircraftTrack(acftData, trackContainer, basemap);
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
    };

    tick();
    setInterval(tick, 3000)

})();
