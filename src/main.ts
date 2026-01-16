import { Application, Container, FederatedPointerEvent, Point } from "pixi.js";
// import { Button } from '@pixi/ui';
import 'pixi.js/math-extras';
import React from 'react';
import { createRoot } from 'react-dom/client';
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
import PasswordScreen from "./components/PasswordScreen";

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
// Allow overriding endpoints via Vite envs so we can point to a proxy without changing code.
const HTTP_API_BASE = (import.meta as any).env?.VITE_HTTP_API_BASE ?? "https://24data.ptfs.app";
const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? "wss://24data.ptfs.app/wss";
const DOUBLE_CLICK_MS = 300;
const DOUBLE_CLICK_DISTANCE = 200;

// const gameCoords = {
//     top_left:     { x: -49222.1, y: -45890.8},
//     bottom_right: { x:  47132.9, y:  46139.2},
// };
// const gameSize = {x: 96355, y: 92030};
const antialias = false;

// Check authentication before initializing app
function checkAuthentication(callback: () => void) {
    const authRoot = document.getElementById('auth-root');
    if (!authRoot) {
        callback();
        return;
    }

    const root = createRoot(authRoot);
    root.render(
        React.createElement(PasswordScreen, {
            onAuthenticated: () => {
                root.unmount();
                authRoot.remove();
                callback();
            }
        })
    );
}

(async () => {
    // Check password first
    await new Promise<void>(resolve => {
        checkAuthentication(resolve);
    });

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

    // Load flight plans from Supabase only (no local cache)
    async function loadInitialFlightPlans() {
        try {
            const { fetchAllFlightPlans, convertSupabaseToFlightPlan } = await import('./supabaseClient');
            const supabasePlans = await fetchAllFlightPlans();
            // Read any manual flight plans saved in localStorage so we don't
            // overwrite operator edits when loading from Supabase.
            let manualStored: { [key: string]: any } = {};
            try {
                const cached = localStorage.getItem(MANUAL_FLIGHT_PLANS_KEY);
                if (cached) manualStored = JSON.parse(cached);
            } catch (e) {
                // ignore parse errors
            }

            supabasePlans.forEach((row: any) => {
                const fp = convertSupabaseToFlightPlan(row);
                if (fp.robloxName) {
                    // If operator has a manual flight plan for this player, check
                    // whether the Supabase row represents a new filed plan. If it
                    // does, clear the manual edit and apply the Supabase row.
                    if (manualStored[fp.robloxName]) {
                        if (isDifferentFiledPlan(fp, manualStored[fp.robloxName])) {
                            delete manualStored[fp.robloxName];
                            try {
                                localStorage.setItem(MANUAL_FLIGHT_PLANS_KEY, JSON.stringify(manualStored));
                            } catch (e) { }
                            console.log(`🔓 Cleared manual edits for ${fp.robloxName} due to newer Supabase plan`);
                        } else {
                            console.log(`🔒 Keeping manual edit for ${fp.robloxName}; Supabase plan matches`);
                            return;
                        }
                    }

                    flightPlans[fp.robloxName] = fp;
                    const pnNorm = normalizePlayer(fp.robloxName);
                    if (pnNorm) flightPlansByPlayer[pnNorm] = fp;
                    const rcNorm = normalizeCallsign(fp.realcallsign);
                    if (rcNorm) flightPlansByRealCallsign[rcNorm] = fp;
                    // Do not seed `flightPlanCallsigns` from Supabase here;
                    // `flightPlanCallsigns` is reserved for manual overrides only.
                }
            });
            
            console.log(`✅ Loaded ${supabasePlans.length} flight plans from Supabase`);
        } catch (err) {
            console.warn('⚠️  Could not fetch from Supabase:', err);
        }
    }
    
    // Start loading flight plans
    loadInitialFlightPlans();

    function normalizeCallsign(cs: string | undefined | null): string | undefined {
        if (!cs) return undefined;
        return cs.trim().replace(/\s+/g, "").toUpperCase();
    }

    function normalizePlayer(p: string | undefined | null): string | undefined {
        if (!p) return undefined;
        return p.trim().toUpperCase();
    }

    function isDifferentFiledPlan(fp: any, manual: any): boolean {
        if (!manual) return false;
        const norm = (s: any) => (s || '').toString().trim().toUpperCase();

        // Compare callsign, route, origin/ destination, and flight level
        if (norm(fp.callsign) !== norm(manual.callsign)) return true;
        if (norm(fp.route) !== norm(manual.route)) return true;
        if (norm(fp.departing) !== norm(manual.origin)) return true;
        if (norm(fp.arriving) !== norm(manual.destination)) return true;

        // Compare flight levels: normalize digits only
        const digits = (s: any) => ('' + (s || '')).replace(/\D/g, '');
        if (digits(fp.flightlevel) !== digits(manual.altitude)) return true;

        return false;
    }

    // Manual overrides for flight plan callsign
    const CALLSIGN_OVERRIDES_KEY = "24rc_callsign_overrides";
    const flightPlanCallsigns: { [playerName: string]: string } = {};

    // Manual flight plan edits storage
    const MANUAL_FLIGHT_PLANS_KEY = "24rc_manual_flight_plans";
    const manualFlightPlans: { [playerName: string]: any } = {};

    // Load manual callsign overrides from localStorage
    function loadCallsignOverrides() {
        try {
            const cached = localStorage.getItem(CALLSIGN_OVERRIDES_KEY);
            if (!cached) return;
            const stored = JSON.parse(cached);
            Object.assign(flightPlanCallsigns, stored);
        } catch (e) {
            console.error("Failed to load callsign overrides:", e);
        }
    }

    // Save manual callsign overrides to localStorage
    function saveCallsignOverrides() {
        try {
            localStorage.setItem(CALLSIGN_OVERRIDES_KEY, JSON.stringify(flightPlanCallsigns));
        } catch (e) {
            console.error("Failed to save callsign overrides:", e);
        }
    }

    // Load manual flight plan data from localStorage
    function loadManualFlightPlans() {
        try {
            const cached = localStorage.getItem(MANUAL_FLIGHT_PLANS_KEY);
            if (!cached) return;
            const stored = JSON.parse(cached);
            Object.assign(manualFlightPlans, stored);
            console.log(`📋 Loaded ${Object.keys(stored).length} manual flight plan(s)`);
        } catch (e) {
            console.error("Failed to load manual flight plans:", e);
        }
    }

    // Save manual flight plan data to localStorage
    function saveManualFlightPlan(playerName: string, data: any) {
        try {
            manualFlightPlans[playerName] = { ...data, ts: Date.now() };
            localStorage.setItem(MANUAL_FLIGHT_PLANS_KEY, JSON.stringify(manualFlightPlans));
        } catch (e) {
            console.error("Failed to save manual flight plan:", e);
        }
    }

    loadCallsignOverrides();
    loadManualFlightPlans();

    // Expose flight plan callsign management globally
    (window as any).setFlightPlanCallsign = (playerName: string, callsign: string) => {
        const trimmed = (callsign || "").trim();
        if (!trimmed) {
            delete flightPlanCallsigns[playerName];
        } else {
            flightPlanCallsigns[playerName] = trimmed;
        }
        saveCallsignOverrides();
    };

    (window as any).getFlightPlanCallsign = (playerName: string): string | undefined => {
        return flightPlanCallsigns[playerName];
    };

    // Expose manual flight plan management globally
    (window as any).saveManualFlightPlan = saveManualFlightPlan;
    (window as any).getManualFlightPlan = (playerName: string) => manualFlightPlans[playerName];

    // Expose event mode controls for UI button
    (window as any).toggleEventMode = () => toggleEventMode();
    (window as any).isEventMode = () => eventModeWS;

    // Allow UI to scale label font sizes
    (window as any).setLabelScale = (scale: number) => {
        const clamped = Math.max(0.5, Math.min(2, scale || 1));
        config.labelScale = clamped;
        acftLabels.forEach(label => label.applyFontScale());
    };

    // Allow runtime tuning of ground traffic reveal zoom for quick testing
    (window as any).setGroundTrafficRevealZoom = (v: number) => {
        const next = Number(v) || config.groundTrafficRevealZoom;
        config.groundTrafficRevealZoom = next;
        showToast(`groundTrafficRevealZoom = ${next}`, 'info', 1500);
    };
    (window as any).getGroundTrafficRevealZoom = () => config.groundTrafficRevealZoom;
    function updateGroundVisibilityBasedOnZoom() {
        if (!config.autoToggleGroundByZoom) return;
        const zoomShowsGround = basemap.scale.x >= (config.groundTrafficRevealZoom || 1.1);
        const shouldHide = !zoomShowsGround && !config.forceShowGroundTraffic;
        if (config.hideGroundTraffic !== shouldHide) {
            config.hideGroundTraffic = shouldHide;
            // flash the small blue dot instead of toast
            (window as any).flashGndDot?.();
        }
    }

    function flashGndDot() {
        try {
            const id = 'gnd-dot';
            let el = document.getElementById(id) as HTMLElement | null;
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.className = 'gnd-dot';
                document.body.appendChild(el);
            }
            el.classList.remove('flash');
            // trigger reflow
            void el.offsetWidth;
            el.classList.add('flash');
            setTimeout(() => el && el.classList.remove('flash'), 900);
        } catch (e) { }
    }

    (window as any).updateGroundVisibilityBasedOnZoom = updateGroundVisibilityBasedOnZoom;
    (window as any).flashGndDot = flashGndDot;
    // Debug helpers: inspect and control basemap scale and hideGroundTraffic
    (window as any).getBasemapScale = () => basemap.scale.x;
    (window as any).setBasemapScale = (v: number) => {
        const s = Number(v) || basemap.scale.x;
        basemap.scale.set(s);
        positionGraphics();
        showToast(`basemap.scale = ${s}`, 'info', 1200);
        updateGroundVisibilityBasedOnZoom();
    };
    (window as any).getHideGroundTraffic = () => config.hideGroundTraffic;
    (window as any).toggleForceShowGroundTraffic = () => {
        config.forceShowGroundTraffic = !config.forceShowGroundTraffic;
        showToast(`forceShowGroundTraffic = ${config.forceShowGroundTraffic}`, 'info', 1200);
        return config.forceShowGroundTraffic;
    };
    (window as any).setForceShowGroundTraffic = (v: boolean) => {
        config.forceShowGroundTraffic = !!v;
        showToast(`forceShowGroundTraffic = ${config.forceShowGroundTraffic}`, 'info', 1200);
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

    // Refresh all aircraft labels (used when callsign is changed in flight plan panel)
    (window as any).refreshAircraftLabels = () => {
        acftLabels.forEach(label => {
            label.formatText();
            label.updateGraphics();
            label.scratchPad.updateText();
        });
    };

    // Refresh all flight plans from Supabase, clear manual FP adjustments and
    // remove any assigned FL / speed from labels so the newest filed plans win.
    (window as any).refreshAllFlightPlans = async () => {
        try {
            const { fetchAllFlightPlans, convertSupabaseToFlightPlan } = await import('./supabaseClient');
            const supabasePlans = await fetchAllFlightPlans();

            // For a forced refresh we clear manual flight plan edits and
            // callsign overrides so the newest Supabase flight plans fully
            // replace the displayed callsign and flight plan fields.
            try {
                Object.keys(manualFlightPlans).forEach(k => delete manualFlightPlans[k]);
                localStorage.removeItem(MANUAL_FLIGHT_PLANS_KEY);
            } catch (e) { }
            try {
                Object.keys(flightPlanCallsigns).forEach(k => delete flightPlanCallsigns[k]);
                localStorage.removeItem(CALLSIGN_OVERRIDES_KEY);
            } catch (e) { }

            // Reset in-memory flight plan maps and repopulate from Supabase
            Object.keys(flightPlans).forEach(k => delete flightPlans[k]);
            Object.keys(flightPlansByPlayer).forEach(k => delete flightPlansByPlayer[k]);
            Object.keys(flightPlansByRealCallsign).forEach(k => delete flightPlansByRealCallsign[k]);

            supabasePlans.forEach((row: any) => {
                const fp = convertSupabaseToFlightPlan(row);
                if (fp && fp.robloxName) {
                    flightPlans[fp.robloxName] = fp;
                    const pnNorm = normalizePlayer(fp.robloxName);
                    if (pnNorm) flightPlansByPlayer[pnNorm] = fp;
                    const rcNorm = normalizeCallsign(fp.realcallsign);
                    if (rcNorm) flightPlansByRealCallsign[rcNorm] = fp;
                    // Do not auto-populate `flightPlanCallsigns` here; manual overrides only.
                }
            });

            // Re-apply flight plan fields to currently displayed aircraft
            const acftDataMap: { [key: string]: any } = {};
            const updatedAcftDatas = acftLabels.map(label => {
                const acftData = label.acftData;
                const csNorm = normalizeCallsign(acftData.callsign);
                const pnNorm = normalizePlayer(acftData.playerName);
                const plan = (csNorm && flightPlansByRealCallsign[csNorm])
                    || (pnNorm && flightPlansByPlayer[pnNorm])
                    || flightPlans[acftData.playerName];

                const planCallsign = plan?.callsign;

                // Overwrite displayed flight-plan fields with newest Supabase values.
                const updated = {
                    ...acftData,
                    flightPlanCallsign: planCallsign || acftData.flightPlanCallsign,
                    flightPlanRoute: plan?.route && plan.route !== "N/A" ? plan.route : undefined,
                    flightPlanOrigin: plan?.departing,
                    flightPlanDestination: plan?.arriving,
                    flightPlanRules: plan?.flightrules,
                    flightPlanLevel: plan?.flightlevel ? plan.flightlevel.padStart(3, "0") : undefined,
                    flightPlanAircraft: plan?.aircraft,
                };

                acftDataMap[updated.callsign] = updated;
                acftDataMap[`player:${updated.playerName}`] = updated;

                return { label, updated };
            });

            // Update modal manager with fresh aircraft data
            updateAircraftData(acftDataMap);

            // Push updates into labels and tracks
            updatedAcftDatas.forEach(({ label, updated }) => {
                try {
                    label.updateData(updated);
                    label.updateGraphics();
                    const track = acftTracks.find(t => t.acftData.playerName === updated.playerName);
                    if (track) track.updateData(updated);
                } catch (e) { }
            });

            showToast(`Flight plans refreshed (${supabasePlans.length} fetched)`, 'success', 2500);
        } catch (err) {
            console.error('Failed to refresh flight plans', err);
            showToast('Failed to refresh flight plans', 'error', 3000);
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

    // Scroll wheel - handle zoom but DO NOT call preventDefault() here because
    // Pixi's internal DOM listeners may be passive which causes a console error
    // if preventDefault() is invoked inside them. Instead we install a separate
    // non-passive DOM listener on the canvas (below) to block page scrolling.
    app.stage.on('wheel', e => {
        // down scroll, zoom out
        if (e.deltaY > 0)
            basemap.scale.set(basemap.scale.x * 1 / 1.1);
        // up scroll, zoom in
        else if (e.deltaY < 0)
            basemap.scale.set(basemap.scale.x * 1.1);

        positionGraphics();
        updateGroundVisibilityBasedOnZoom();
    });

    // Helper: add a non-passive wheel listener if the browser supports options.
    const addNonPassiveWheel = (el: EventTarget, handler: (ev: WheelEvent) => void) => {
        let supportsOptions = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get() { supportsOptions = true; return false; }
            });
            window.addEventListener('testPassive', null as any, opts);
            window.removeEventListener('testPassive', null as any, opts as any);
        } catch {}

        if (supportsOptions) {
            el.addEventListener('wheel', handler as EventListener, { passive: false } as AddEventListenerOptions);
        } else {
            // Best-effort fallback; older browsers will attach the listener without options.
            el.addEventListener('wheel', handler as EventListener);
        }
    };

    // Add a non-passive wheel listener on the canvas to block default scrolling
    // behavior when the mouse is over the map canvas.
    addNonPassiveWheel(app.view, (ev: WheelEvent) => ev.preventDefault());

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
        reconnectBase: 5000,   // slower initial retry (5s)
        reconnectMax: 60000,   // cap at 60s between retries
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
        // If zoomed in past `config.groundTrafficRevealZoom`, show ground traffic regardless of hide flag
        const zoomShowsGround = basemap.scale.x >= (config.groundTrafficRevealZoom || 1.1);
        if (config.hideGroundTraffic && !zoomShowsGround && !config.forceShowGroundTraffic) {
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
            console.log(`🛫 Flight plan received: ${fp.robloxName} - ${fp.callsign || 'N/A'}`);

            // If operator has a manual edit for this player, check whether the
            // incoming plan represents a newly filed plan. If so, clear the
            // manual edit and apply the incoming plan. Otherwise, ignore it
            // so the operator's manual edits stay in effect.
            if (manualFlightPlans[fp.robloxName]) {
                if (isDifferentFiledPlan(fp, manualFlightPlans[fp.robloxName])) {
                    // New filed plan detected — clear manual edits so incoming
                    // values take priority.
                    delete manualFlightPlans[fp.robloxName];
                    try {
                        localStorage.setItem(MANUAL_FLIGHT_PLANS_KEY, JSON.stringify(manualFlightPlans));
                    } catch (e) { }
                    console.log(`🔓 Cleared manual edits for ${fp.robloxName} due to new filed plan`);
                    // fall through to apply incoming plan
                } else {
                    console.log(`🔒 Ignoring incoming plan for ${fp.robloxName} (manual edit present)`);
                    return;
                }
            }

            // Apply incoming plan to in-memory maps so the UI reflects it.
            if (fp && fp.robloxName) {
                flightPlans[fp.robloxName] = fp;
                const pnNorm = normalizePlayer(fp.robloxName);
                if (pnNorm) flightPlansByPlayer[pnNorm] = fp;
                const rcNorm = normalizeCallsign(fp.realcallsign);
                if (rcNorm) flightPlansByRealCallsign[rcNorm] = fp;
                // Do not auto-populate `flightPlanCallsigns` from incoming WS events.
            }

        }

        const isMain = msg.t === "ACFT_DATA";
        const isEvent = msg.t === "EVENT_ACFT_DATA";

        if (eventModeWS && !isEvent) return;
        if (!eventModeWS && !isMain) return;

        processData(msg.d);
    }


})();
