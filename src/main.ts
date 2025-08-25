import { Application, Container, FederatedPointerEvent, Point} from "pixi.js";
// import { Button } from '@pixi/ui';
import 'pixi.js/math-extras';
import { acftCollectionToAcftArray, pointsToDistance } from "./util";
import { AircraftCollection } from "./types";
import config from "./config";
import AircraftTrack from "./components/AircraftTrack";
import DistanceTool from "./components/DistanceTool";
import AssetManager from "./AssetManager";
import DisplayControlBar from "./components/DisplayControlBar";
import AircraftLabel from "./components/AircraftLabel";

// const pollAuthority = "http://localhost:3000";
const POLL_AUTHORITY = "https://24data.ptfs.app";
const POLL_INTERVAL = 3000;
const POLL_ROUTES = ["/acft-data", "/acft-data/event"];
const ROUTE_SWITCH_DELAY = 1000;

const DOUBLE_CLICK_MS = 300;
const DOUBLE_CLICK_DISTANCE = 200;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};
const antialias = false;

let tickInterval: number;

(async () => {
    // Initialisation
    ///////////////////
    const container = document.getElementById("pixi-container");
    if (!container) {
        document.body.innerHTML = `Could not start. No element with ID "pixi-container" exists.`;
        return;
    }
    
    const app = new Application();

    let failed = false;
    let failReason = "";
    await app.init({ antialias, background: 0, resizeTo: container.parentElement || container }).catch(e => { failed = true; failReason = e });
    if (failed) {
        document.body.innerHTML = `Could not start. Try reloading. ${failReason}`;
        return;
    }
    container.appendChild(app.canvas);
    
    const basemap = new Container();
    const trackContainer = new Container();
    const uiContainer = new Container();

    basemap.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(basemap);
    app.stage.addChild(trackContainer);
    app.stage.addChild(uiContainer);

    const assetManager = new AssetManager(basemap);
    // @ts-ignore
    globalThis.assetManager = assetManager;

    assetManager.loadAsset("global/coast");
    assetManager.loadAsset("global/boundaries");

    new DisplayControlBar(assetManager);

    // Distance tool stuff
    ////////////////////////
    const distanceTool = new DistanceTool(trackContainer, basemap);
    const distanceToolMouseMove = (e: FederatedPointerEvent) => distanceTool.mouseMove(e);

    let lastClickTime = 0;
    let doubleClickPoint = new Point();
    let disableMove = false;
    let destroy = false;

    app.stage.on("mousedown", e => {
        if (destroy) {
            distanceTool.destroy();
            destroy = false;
        }
        if (disableMove) {
            app.stage.off('pointermove', distanceToolMouseMove);
            app.stage.cursor = 'auto';
            disableMove = false;
            destroy = true;
            return;
        }
        const now = Date.now();
        const clickPoint = new Point(e.x, e.y);

        const distance = pointsToDistance(doubleClickPoint, clickPoint);

        if (now - lastClickTime > DOUBLE_CLICK_MS || distance > DOUBLE_CLICK_DISTANCE) {
            lastClickTime = now;
            doubleClickPoint = clickPoint;
            return;
        }
        app.stage.on('pointermove', distanceToolMouseMove);
        app.stage.cursor = 'crosshair';
        disableMove = true;
    });

    // Event switching & keybinds
    ///////////////////////////////
    let activeRoute = 0;
    let lastSwitchTime = 0;

    window.addEventListener("keydown", ev => {
        // Switch polling source between event and normal server
        if (ev.key.toLocaleUpperCase() === "E") {
            const now = Date.now();
            if (now - lastSwitchTime < ROUTE_SWITCH_DELAY)
                return; // 1s cooldown on switching event mode.
            lastSwitchTime = now;
            acftTracks.forEach(track => {
                track.destroy();
            });
            acftTracks = [];
            activeRoute = (activeRoute + 1) % (POLL_ROUTES.length);

            clearInterval(tickInterval);
            tick();
            tickInterval = setInterval(tick, POLL_INTERVAL);
        }
        // Toggle for Predicted track lines
        else if (ev.key.toUpperCase() === "P") {
            config.showPTL = !config.showPTL;
            positionGraphics();
        }
    });

    let acftTracks: AircraftTrack[] = [];
    let acftLabels: AircraftLabel[] = [];

    // Resizing and moving
    ////////////////////////
    function positionGraphics() {
        acftTracks.forEach(acftTrack => acftTrack.positionGraphics());      
        acftLabels.forEach(label => label.tickUpdate());
        distanceTool.positionGraphics();
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
    
    // Register events for dragging map
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('rightdown', () => app.stage.on('pointermove', dragmap));
    app.stage.on('rightup', () => app.stage.off('pointermove', dragmap));
    app.stage.on('touchstart', () => app.stage.on('pointermove', dragmap));
    app.stage.on('touchend', () => app.stage.off('pointermove', dragmap));

    // Scroll wheel
    app.stage.on('wheel', e => {
        // down scroll, zoom out
        if (e.deltaY > 0)
            basemap.scale.set(basemap.scale.x * 1/1.1);
        // up scroll, zoom in
        else if (e.deltaY < 0)
            basemap.scale.set(basemap.scale.x * 1.1);

        positionGraphics();
    })

    // Update aircraft tracks
    ///////////////////////////
    const tick = () => {
        fetch(
            `${POLL_AUTHORITY}${POLL_ROUTES[activeRoute]}`,
        ).then(async (res) => {
            const acftCollection: AircraftCollection = await res.json();
            const acftDatas = acftCollectionToAcftArray(acftCollection);

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


            acftLabels = acftLabels.filter(label => !label.isDestroyed);

            // Iterate through existing labels
            acftLabels.forEach(label => {
                const matchingData = acftDatas.find(acftData => acftData.playerName === label.acftData.playerName);
                if(matchingData) {
                    label.updateData(matchingData);
                    label.updateGraphics();
                } else {
                    // No new data received, plane probably deleted => destroy label
                    label.destroy();
                }
            });

            // Create new labels for new aircraft
            newAcftDatas.forEach(acftData => {
                const label = new AircraftLabel(acftData, trackContainer, basemap);
                acftLabels.push(label);
            });
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
    tickInterval = setInterval(tick, POLL_INTERVAL);
})();
