export default {
    showPTL: false,
    hideGroundTraffic: false,
    showFixes: false,
    showSIDs: false,
    showSTARs: false,
    labelScale: 1,
    // When the basemap scale (zoom) is >= this value, ground traffic will be shown
    // even if `hideGroundTraffic` is true. Increase to require more zoom.
    groundTrafficRevealZoom: 1.5,
};