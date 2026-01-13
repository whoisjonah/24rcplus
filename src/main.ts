import { Application, Container, FederatedPointerEvent, Point } from "pixi.js";
// import { Button } from '@pixi/ui';
import 'pixi.js/math-extras';
import { acftCollectionToAcftArray, pointsToDistance } from "./util";
import { AircraftCollection, FlightPlanData } from "./types";
import config from "./config";
import AircraftTrack from "./components/AircraftTrack";
import DistanceTool from "./components/DistanceTool";
import AssetManager from "./AssetManager";
import DisplayControlBar from "./components/DisplayControlBar";
import AircraftLabel from "./components/AircraftLabel";
import FixesLayer from "./components/FixesLayer";
import createWebSocketManager from "./ws/Connector";
import { initializeModalManager, showFlightPlanModal, showContextMenu, hideContextMenu, updateAircraftData } from "./components/ModalManager";

// Toolbar toggle functionality
let toolbarVisible = true;
(window as any).toggleToolbar = () => {
    toolbarVisible = !toolbarVisible;
    const dcb = document.getElementById('dcb');
    const toggle = document.getElementById('toolbar-toggle');
    if (dcb && toggle) {
        if (toolbarVisible) {
            dcb.classList.remove('hidden');
            toggle.textContent = '▼';
            toggle.classList.remove('toolbar-hidden');
        } else {
            dcb.classList.add('hidden');
            toggle.textContent = '▲';
            toggle.classList.add('toolbar-hidden');
        }
    }
};

// const pollAuthority = "http://localhost:3000";
// const POLL_INTERVAL = 3000;
// const POLL_ROUTES = ["/acft-data", "/acft-data/event"];
const ROUTE_SWITCH_DELAY = 1000;
const WS_URL = "wss://24data.ptfs.app/wss";
const HTTP_API_BASE = "https://24data.ptfs.app";
const DOUBLE_CLICK_MS = 300;
const DOUBLE_CLICK_DISTANCE = 200;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};
const antialias = false;

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

    function createToastContainer(): HTMLElement {
        let existing = document.querySelector('.toast-container') as HTMLElement | null;
        if (existing) return existing;
        const c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
        return c;
    }

    const toastContainer = createToastContainer();

    function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', timeout = 3500) {
        try {
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.textContent = message;
            toastContainer.appendChild(t);
            // Delay adding the show class slightly so the browser
            // registers the starting transform/opacity and animates it.
            setTimeout(() => t.classList.add('show'), 60);
            setTimeout(() => {
                t.classList.remove('show');
                t.classList.add('hide');
                t.addEventListener('transitionend', () => t.remove(), { once: true });
            }, timeout);
        } catch (e) {
        }
    }
    
    // Expose showToast globally for modal manager
    (window as any).showToast = showToast;
    
    // Initialize modal manager
    initializeModalManager();
    
    // Expose modal functions globally for AircraftLabel
    (window as any).showFlightPlanModal = showFlightPlanModal;
    (window as any).showContextMenu = showContextMenu;
    (window as any).hideContextMenu = hideContextMenu;
    
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

    // Fixes layer
    ////////////////////////
    const fixesLayer = new FixesLayer(trackContainer, basemap);
    (window as any).refreshFixes = () => fixesLayer.updatePosition();

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
    let lastSwitchTime = 0;

    function toggleEventMode() {
        const now = Date.now();
        if (now - lastSwitchTime < ROUTE_SWITCH_DELAY)
            return; // 1s cooldown on switching event mode.
        lastSwitchTime = now;
        eventModeWS = !eventModeWS;
        acftTracks.forEach(track => track.destroy());
        acftTracks = [];
        acftLabels.forEach(label => label.destroy());
        acftLabels = [];
        showToast(`Event mode ${eventModeWS ? 'ON' : 'OFF'}`, 'info');
    }

    // Keybinds removed (P/G/F) by request; use UI controls instead

    let acftTracks: AircraftTrack[] = [];
    let acftLabels: AircraftLabel[] = [];
    const assumedPlayers = new Set<string>();

    // Flight plan storage keyed by robloxName/playerName and realcallsign
    const flightPlans: { [playerName: string]: FlightPlanData } = {};
    const flightPlansByRealCallsign: { [realcallsign: string]: FlightPlanData } = {};
    const flightPlansByPlayer: { [normPlayer: string]: FlightPlanData } = {};

    const FLIGHT_PLAN_CACHE_KEY = "24rc_flight_plans";
    const FLIGHT_PLAN_TTL_MS = 45 * 60 * 1000; // 45 minutes

    function loadCachedFlightPlans() {
        try {
            const cached = localStorage.getItem(FLIGHT_PLAN_CACHE_KEY);
            if (!cached) return;
            const stored = JSON.parse(cached) as { [key: string]: { fp: FlightPlanData; ts: number } };
            const now = Date.now();
            
            Object.entries(stored).forEach(([, { fp, ts }]) => {
                if (now - ts < FLIGHT_PLAN_TTL_MS) {
                    // Plan is still valid
                    flightPlans[fp.robloxName] = fp;
                    const pnNorm = normalizePlayer(fp.robloxName);
                    if (pnNorm) flightPlansByPlayer[pnNorm] = fp;
                    const rcNorm = normalizeCallsign(fp.realcallsign);
                    if (rcNorm) flightPlansByRealCallsign[rcNorm] = fp;
                    if (fp.callsign && !flightPlanCallsigns[fp.robloxName]) {
                        flightPlanCallsigns[fp.robloxName] = fp.callsign;
                    }
                    console.log(`📦 Loaded cached FP for ${fp.robloxName}: ${fp.callsign}`);
                }
            });
        } catch (e) {
            console.error("Failed to load cached flight plans:", e);
        }
    }

    function saveFlightPlanToCache(fp: FlightPlanData) {
        try {
            const cached = localStorage.getItem(FLIGHT_PLAN_CACHE_KEY);
            const stored = cached ? JSON.parse(cached) : {};
            stored[fp.robloxName] = { fp, ts: Date.now() };
            localStorage.setItem(FLIGHT_PLAN_CACHE_KEY, JSON.stringify(stored));
        } catch (e) {
            console.error("Failed to save flight plan to cache:", e);
        }
    }

    // Load cached flight plans on startup
    loadCachedFlightPlans();

    function normalizeCallsign(cs: string | undefined | null): string | undefined {
        if (!cs) return undefined;
        return cs.trim().replace(/\s+/g, "").toUpperCase();
    }

    function normalizePlayer(p: string | undefined | null): string | undefined {
        if (!p) return undefined;
        return p.trim().toUpperCase();
    }

    // Manual overrides for flight plan callsign
    const flightPlanCallsigns: { [playerName: string]: string } = {};

    // Expose flight plan callsign management globally
    (window as any).setFlightPlanCallsign = (playerName: string, callsign: string) => {
        const trimmed = (callsign || "").trim();
        if (!trimmed) {
            delete flightPlanCallsigns[playerName];
            return;
        }
        flightPlanCallsigns[playerName] = trimmed;
    };

    (window as any).getFlightPlanCallsign = (playerName: string): string | undefined => {
        return flightPlanCallsigns[playerName];
    };

    // Expose event mode controls for UI button
    (window as any).toggleEventMode = () => toggleEventMode();
    (window as any).isEventMode = () => eventModeWS;

    // Allow UI to scale label font sizes
    (window as any).setLabelScale = (scale: number) => {
        const clamped = Math.max(0.5, Math.min(2, scale || 1));
        config.labelScale = clamped;
        acftLabels.forEach(label => label.applyFontScale());
    };

    // Expose toggleAssumedAircraft globally
    (window as any).toggleAssumedAircraft = (callsign: string) => {
        const label = acftLabels.find(l => l.acftData.callsign === callsign);
        if (label) {
            label.isAssumed = !label.isAssumed;
            label.formatText();
            label.updateGraphics();
            label.scratchPad.updatePosition();
            label.scratchPad.updateText();

            if (label.isAssumed) {
                assumedPlayers.add(label.acftData.playerName);
            } else {
                assumedPlayers.delete(label.acftData.playerName);
            }
            
            // Update corresponding track's PTL
            const track = acftTracks.find(t => t.acftData.callsign === callsign);
            if (track) {
                track.isAssumed = label.isAssumed;
                track.updateData(track.acftData);
            }
        }
    };

    // Resizing and moving
    ////////////////////////
    function positionGraphics() {
        acftTracks.forEach(acftTrack => acftTrack.positionGraphics());
        acftLabels.forEach(label => label.tickUpdate());
        distanceTool.positionGraphics();
        fixesLayer.updatePosition();
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
            basemap.scale.set(basemap.scale.x * 1 / 1.1);
        // up scroll, zoom in
        else if (e.deltaY < 0)
            basemap.scale.set(basemap.scale.x * 1.1);

        positionGraphics();
    })

    // Update aircraft tracks
    ///////////////////////////

    let eventModeWS = false;

    const wsManager = createWebSocketManager(WS_URL, {
        onMessage: onWSMessage,
        onOpen: () => showToast('WebSocket connected', 'success'),
        onClose: () => showToast('WebSocket disconnected', 'error'),
        onError: () => showToast('WebSocket error', 'error'),
    }, {
        heartbeatInterval: 15000,
        heartbeatTimeout: 30000,
        reconnectBase: 2000,
        reconnectMax: 30000,
    });

    // Poll HTTP API for aircraft data to check for flight plan fields (backup method)
    let lastAcftDataFetch = 0;
    setInterval(async () => {
        try {
            const now = Date.now();
            if (now - lastAcftDataFetch < 2000) return; // Rate limit to 2s min
            lastAcftDataFetch = now;

            const route = eventModeWS ? "/acft-data/event" : "/acft-data";
            const res = await fetch(`${HTTP_API_BASE}${route}`);
            if (!res.ok) return;
            
            await res.json() as AircraftCollection;
            // For now, we're just fetching to verify connectivity
            // Flight plan data should come via WebSocket FLIGHT_PLAN events
        } catch (err) {
            // Silently fail on HTTP errors
        }
    }, 3000); // Poll every 3 seconds as recommended

    wsManager.start();

    function processData(acftCollection: AircraftCollection) {
        let acftDatas = acftCollectionToAcftArray(acftCollection);
        
        // Populate flight plan fields from stored flight plans and overrides
        acftDatas = acftDatas.map(acftData => {
            // Prefer mapping by normalized realcallsign (the in-game callsign key), fallback to playerName
            const csNorm = normalizeCallsign(acftData.callsign);
            const pnNorm = normalizePlayer(acftData.playerName);
            const plan = (csNorm && flightPlansByRealCallsign[csNorm])
                || (pnNorm && flightPlansByPlayer[pnNorm])
                || flightPlans[acftData.playerName];
            
            const manualCallsign = flightPlanCallsigns[acftData.playerName];
            const planCallsign = plan?.callsign;

            return {
                ...acftData,
                flightPlanCallsign: manualCallsign || planCallsign,
                flightPlanRoute: plan?.route && plan.route !== "N/A" ? plan.route : plan?.route,
                flightPlanOrigin: plan?.departing,
                flightPlanDestination: plan?.arriving,
                flightPlanRules: plan?.flightrules,
                flightPlanLevel: plan?.flightlevel ? plan.flightlevel.padStart(3, "0") : undefined,
                flightPlanAircraft: plan?.aircraft,
            };
        });
        
        // Filter based on config settings; assumed aircraft always shown
        if (config.hideGroundTraffic) {
            acftDatas = acftDatas.filter(acft => !acft.isOnGround || assumedPlayers.has(acft.playerName));
        }
        
        // Update aircraft data for modal manager
        const acftDataMap: { [key: string]: any } = {};
        acftDatas.forEach(acft => {
            acftDataMap[acft.callsign] = acft;
            acftDataMap[`player:${acft.playerName}`] = acft; // allow lookup by playerName for flight plan sync
        });
        updateAircraftData(acftDataMap);

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
            console.log(`✈️  New aircraft: ${acftData.callsign} (${acftData.playerName}) - FP callsign: ${acftData.flightPlanCallsign || 'N/A'}`);
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
            if (matchingData) {
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
    }

    function onWSMessage(ev: MessageEvent) {
        const msg = JSON.parse(ev.data);
        if (!msg || !msg.t) return;

        // Capture flight plan payloads (main and event)
        if (msg.t === "FLIGHT_PLAN" || msg.t === "FLIGHTPLAN" || msg.t === "EVENT_FLIGHT_PLAN") {
            const fp = msg.d as FlightPlanData;
            console.log("🛫 FLIGHT_PLAN EVENT:", { t: msg.t, robloxName: fp?.robloxName, callsign: fp?.callsign, realcallsign: fp?.realcallsign });
            if (fp && fp.robloxName) {
                flightPlans[fp.robloxName] = fp;
                const pnNorm = normalizePlayer(fp.robloxName);
                if (pnNorm) flightPlansByPlayer[pnNorm] = fp;
                const rcNorm = normalizeCallsign(fp.realcallsign);
                if (rcNorm) flightPlansByRealCallsign[rcNorm] = fp;
                if (fp.callsign && !flightPlanCallsigns[fp.robloxName]) {
                    flightPlanCallsigns[fp.robloxName] = fp.callsign;
                }
                // Save to localStorage so it persists for 45 minutes even if bot restarts
                saveFlightPlanToCache(fp);
                console.log(`   ✅ Stored FP for ${fp.robloxName}`);
            }
            return;
        }

        const isMain = msg.t === "ACFT_DATA";
        const isEvent = msg.t === "EVENT_ACFT_DATA";

        if (eventModeWS && !isEvent) return;
        if (!eventModeWS && !isMain) return;

        processData(msg.d);
    }


})();
