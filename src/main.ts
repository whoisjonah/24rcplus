import { Application, Assets, Container, FederatedPointerEvent, Graphics, GraphicsContext } from "pixi.js";
import { acftCollectionToAcftArray } from "./util";
import { SVGParser } from "./lineParser/SVGParser";
import { AircraftCollection } from "./types";
import AircraftTrack from "./AircraftTrack";
import config from "./config";

// const pollAuthority = "http://localhost:3000";
const pollAuthority = "https://data-temp.ptfs.app";

/** aircraft collection to aircraft array */
const ac2aa = acftCollectionToAcftArray;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};
const antialias = false;

let tickInterval: number;

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

    const boundariesSourceReq = await fetch("/assets/boundaries.svg")
    const boundariesSource = await boundariesSourceReq.text();

    const boundariesSess = SVGParser(boundariesSource, new GraphicsContext());

    const boundaries = new Graphics();
    boundaries.setStrokeStyle({ pixelLine: true });
    boundariesSess.paths.forEach(path => {
        boundaries
            .path(path)
            .stroke();
    });

    basemap.addChild(boundaries);
    boundaries.alpha = 0.2;


    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));
    app.stage.on('touchstart', () => app.stage.on('pointermove', dragmap));
    app.stage.on('touchend', () => app.stage.off('pointermove', dragmap));

    // Event switching
    const pollRoutes = ["/acft-data", "/acft-data/event"]
    let activeRoute = 0;
    let lastSwitchTime = Date.now();

    window.addEventListener("keydown", ev => {
        // Switch polling source between event and normal server
        if (ev.key === "e") {
            const now = Date.now();
            if (now - lastSwitchTime < 1000)
                return; // 1s cooldown on switching event mode.
            lastSwitchTime = now;
            acftTracks.forEach(track => {
                track.destroy();
            });
            acftTracks = [];
            activeRoute = (activeRoute + 1) % (pollRoutes.length);

            clearInterval(tickInterval);
            tick();
            tickInterval = setInterval(tick, 3000);
        }
        // Toggle for Predicted track lines
        else if (ev.key === "p") {
            config.showPTL = !config.showPTL;
            positionGraphics();
        }
    });

    let acftTracks: AircraftTrack[] = [];

    function positionGraphics() {
        acftTracks.forEach(acftTrack => acftTrack.positionGraphics());
    }

    app.renderer.on("resize", (w, h) => {
        basemap.position.set(w / 2, h / 2);
        positionGraphics();
    });

    function dragmap(e: FederatedPointerEvent) {
        // change pivot instead of position so we can zoom from centre
        basemap.pivot.x -= e.movementX / basemap.scale.x;
        basemap.pivot.y -= e.movementY / basemap.scale.x;

        positionGraphics();
    }

    app.stage.on('wheel', e => {
        // down scroll, zoom out
        if (e.deltaY > 0)
            basemap.scale.set(basemap.scale.x * 1/1.1);
        // up scroll, zoom in
        else if (e.deltaY < 0)
            basemap.scale.set(basemap.scale.x * 1.1);

        positionGraphics();
        // console.log(basemap.scale.x);
    })

    // Update aircraft tracks
    const tick = () => {
        fetch(`${pollAuthority}${pollRoutes[activeRoute]}`).then(async (res) => {
            const acftCollection: AircraftCollection = await res.json();
            const acftDatas = ac2aa(acftCollection);

            // Iterate through the existing track
            acftTracks.forEach(track => {
                // If the track has new data
                const matchingData = acftDatas.find(acftData => acftData.playerName === track.acftData.playerName);
                if (matchingData) {
                    track.updateData(matchingData);
                }
                else {
                    // The track has no new data
                    track.notFound();
                    if (track.ttl <= 0)
                        track.destroy();
                }
            });

            // Data that cannot be found in existing tracks
            const newAcftDatas = acftDatas.filter(acftData => !acftTracks.find(track => track.acftData.playerName === acftData.playerName));
            newAcftDatas.forEach(acftData => {
                const track = new AircraftTrack(acftData, trackContainer, basemap);
                acftTracks.push(track);
                track.positionGraphics();
            });

            // Filter tracks with TTL < 0;
            acftTracks = acftTracks.filter(track => track.ttl > 0);
        }).catch(() => {
            // Ping failed. All tracks not found.
            acftTracks.forEach(track => {
                track.notFound();
                if (track.ttl <= 0)
                    track.destroy();
            });

            acftTracks = acftTracks.filter(track => track.ttl > 0);
        });
    };

    tick();
    tickInterval = setInterval(tick, 3000);

})();
