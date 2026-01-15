
// Solar Panel Constants
const PANEL_WIDTH = 1.134;
const PANEL_HEIGHT = 1.762;
const GAP = 0.02; // Default gap (2cm) for grid effect
const MARGIN = 0.50; // Default margin

export function calculateSolarLayout(surfaceWidth, surfaceLength, forceFullCoverage = false, customGap = null) {
    const effectiveGap = customGap !== null ? customGap : (forceFullCoverage ? 0 : GAP);
    const effectiveMargin = forceFullCoverage ? 0 : MARGIN;

    const usableWidth = surfaceWidth - (2 * effectiveMargin);
    const usableLength = surfaceLength - (2 * effectiveMargin);

    if (usableWidth <= 0 || usableLength <= 0) {
        return {
            totalGridWidth: 0,
            totalGridLength: 0,
            rowsX: 0,
            colsZ: 0,
            dimX: 0,
            dimZ: 0
        };
    }

    // Option A: Width along Slope (X)
    const countX_A = Math.floor((usableWidth + effectiveGap) / (PANEL_WIDTH + effectiveGap));
    const countZ_A = Math.floor((usableLength + effectiveGap) / (PANEL_HEIGHT + effectiveGap));
    const total_A = countX_A * countZ_A;

    // Option B: Height along Slope (X)
    const countX_B = Math.floor((usableWidth + effectiveGap) / (PANEL_HEIGHT + effectiveGap));
    const countZ_B = Math.floor((usableLength + effectiveGap) / (PANEL_WIDTH + effectiveGap));
    const total_B = countX_B * countZ_B;

    let selected = {};

    if (total_B > total_A) {
        selected = {
            rowsX: countX_B,
            colsZ: countZ_B,
            dimX: PANEL_HEIGHT,
            dimZ: PANEL_WIDTH
        };
    } else {
        selected = {
            rowsX: countX_A,
            colsZ: countZ_A,
            dimX: PANEL_WIDTH,
            dimZ: PANEL_HEIGHT
        };
    }

    const totalGridWidth = selected.rowsX * selected.dimX + (selected.rowsX - 1) * effectiveGap;
    const totalGridLength = selected.colsZ * selected.dimZ + (selected.colsZ - 1) * effectiveGap;

    return {
        ...selected,
        totalGridWidth,
        totalGridLength,
        effectiveGap,
        effectiveMargin
    };
}
