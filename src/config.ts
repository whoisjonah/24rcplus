export default {
    showPTL: false,
    hideGroundTraffic: false,
    showFixes: false,
    showSIDs: false,
    showSTARs: false,
    // Default label scale (0.8 = 80%) — controls the -LBL value shown in UI
    labelScale: 0.8,
    // When the basemap scale (zoom) is >= this value, ground traffic will be shown
    // even if `hideGroundTraffic` is true. Increased from 4 to 6.
    groundTrafficRevealZoom: 6,
    // Debug: when true, always show ground traffic regardless of hide flag or zoom
    forceShowGroundTraffic: false,
    // Automatically toggle `hideGroundTraffic` based on zoom crossing the threshold
    autoToggleGroundByZoom: true,
};