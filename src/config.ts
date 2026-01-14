export default {
    showPTL: false,
    hideGroundTraffic: false,
    showFixes: false,
    showSIDs: false,
    showSTARs: false,
    labelScale: 1,
    // When the basemap scale (zoom) is >= this value, ground traffic will be shown
    // even if `hideGroundTraffic` is true.
    groundTrafficRevealZoom: 3,
    // Debug: when true, always show ground traffic regardless of hide flag or zoom
    forceShowGroundTraffic: false,
    // Automatically toggle `hideGroundTraffic` based on zoom crossing the threshold
    autoToggleGroundByZoom: true,
};