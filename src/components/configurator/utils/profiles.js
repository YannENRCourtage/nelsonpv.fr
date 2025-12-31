import * as THREE from 'three';

/**
 * Creates an IPE profile shape.
 * 
 * @param {number} height - Total height (h)
 * @param {number} width - Flange width (b)
 * @param {number} webThickness - Web thickness (tw)
 * @param {number} flangeThickness - Flange thickness (tf)
 * @param {number} [radius=0] - Root radius (r) (Optional, for realism)
 * @returns {THREE.Shape}
 */
export const createIPEProfile = (height, width, webThickness, flangeThickness, radius = 0) => {
    const shape = new THREE.Shape();

    const h = height;
    const b = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const r = radius;

    // Start at bottom-right of bottom flange
    shape.moveTo(b / 2, -h / 2);
    shape.lineTo(-b / 2, -h / 2); // Bottom flange
    shape.lineTo(-b / 2, -h / 2 + tf); // Bottom flange thickness

    // Web connection (left side)
    shape.lineTo(-tw / 2, -h / 2 + tf);

    // Up the web
    shape.lineTo(-tw / 2, h / 2 - tf);

    // Top flange (left side)
    shape.lineTo(-b / 2, h / 2 - tf);
    shape.lineTo(-b / 2, h / 2); // Top flange
    shape.lineTo(b / 2, h / 2); // Top flange
    shape.lineTo(b / 2, h / 2 - tf); // Top flange thickness

    // Web connection (right side)
    shape.lineTo(tw / 2, h / 2 - tf);

    // Down the web
    shape.lineTo(tw / 2, -h / 2 + tf);

    // Bottom flange (right side)
    shape.lineTo(b / 2, -h / 2 + tf);
    shape.lineTo(b / 2, -h / 2); // Close loop

    return shape;
};

/**
 * Creates a Z-Profile shape (Purlins/Pannes)
 * @param {number} h - Height
 * @param {number} b - Flange width
 * @param {number} t - Thickness
 * @returns {THREE.Shape}
 */
export const createZProfile = (h, b, t) => {
    const shape = new THREE.Shape();
    // Simplified Z: Top flange right, Bottom flange left
    shape.moveTo(-b / 2, -h / 2);
    shape.lineTo(b / 2, -h / 2); // Bottom flange
    shape.lineTo(b / 2, -h / 2 + t);
    shape.lineTo(t / 2, -h / 2 + t);

    shape.lineTo(t / 2, h / 2 - t);
    shape.lineTo(b / 2, h / 2 - t);
    shape.lineTo(b / 2, h / 2); // Top flange
    shape.lineTo(-b / 2, h / 2);
    shape.lineTo(-b / 2, h / 2 - t);
    shape.lineTo(-t / 2, h / 2 - t);

    shape.lineTo(-t / 2, -h / 2 + t);
    shape.lineTo(-b / 2, -h / 2 + t);
    shape.lineTo(-b / 2, -h / 2);

    return shape;
};

/**
 * Creates a Trapezoidal Profile for Roofing (Bac Acier)
 * @param {number} totalWidth - Total width of the sheet
 * @param {number} ribHeight - Height of the wave
 * @param {number} ribSpacing - Distance between ribs
 * @returns {THREE.Shape}
 */
export const createTrapezoidalProfile = (totalWidth, ribHeight = 0.035, ribSpacing = 0.25) => {
    const shape = new THREE.Shape();

    // Start top-left
    const startX = -totalWidth / 2;
    shape.moveTo(startX, 0);

    const ribTopWidth = 0.03;
    const ribBottomWidth = 0.08;

    // Create waves across the width
    let currentX = startX;
    while (currentX < totalWidth / 2) {
        // Flat section
        const flatWidth = ribSpacing - ribBottomWidth;
        shape.lineTo(currentX + flatWidth, 0);
        currentX += flatWidth;

        // Up slope
        shape.lineTo(currentX + (ribBottomWidth - ribTopWidth) / 2, ribHeight);

        // Top flat
        shape.lineTo(currentX + (ribBottomWidth - ribTopWidth) / 2 + ribTopWidth, ribHeight);

        // Down slope
        shape.lineTo(currentX + ribBottomWidth, 0);

        currentX += ribBottomWidth;
    }

    // Close the loop to make it a solid sheet (simple rectangle bottom)
    shape.lineTo(totalWidth / 2, -0.001); // 1mm thickness
    shape.lineTo(-totalWidth / 2, -0.001);
    shape.lineTo(startX, 0);

    return shape;
};

/**
 * Returns geometry settings for specific IPE types
 */
export const getIPEProfileParams = (ipeType, length) => {
    // Dimensions in meters (based on standard European IPE)
    const specs = {
        'IPE80': { h: 0.080, b: 0.046, tw: 0.0038, tf: 0.0052 },
        'IPE100': { h: 0.100, b: 0.055, tw: 0.0041, tf: 0.0057 },
        'IPE120': { h: 0.120, b: 0.064, tw: 0.0044, tf: 0.0063 },
        'IPE140': { h: 0.140, b: 0.073, tw: 0.0047, tf: 0.0069 },
        'IPE160': { h: 0.160, b: 0.082, tw: 0.0050, tf: 0.0074 },
        'IPE180': { h: 0.180, b: 0.091, tw: 0.0053, tf: 0.0080 },
        'IPE200': { h: 0.200, b: 0.100, tw: 0.0056, tf: 0.0085 },
        'IPE220': { h: 0.220, b: 0.110, tw: 0.0059, tf: 0.0092 },
        'IPE240': { h: 0.240, b: 0.120, tw: 0.0062, tf: 0.0098 },
        'IPE270': { h: 0.270, b: 0.135, tw: 0.0066, tf: 0.0102 },
        'IPE300': { h: 0.300, b: 0.150, tw: 0.0071, tf: 0.0107 },
        'IPE330': { h: 0.330, b: 0.160, tw: 0.0075, tf: 0.0115 },
        'IPE360': { h: 0.360, b: 0.170, tw: 0.0080, tf: 0.0127 },
        'IPE400': { h: 0.400, b: 0.180, tw: 0.0086, tf: 0.0135 },
        'IPE450': { h: 0.450, b: 0.190, tw: 0.0094, tf: 0.0146 },
        'IPE500': { h: 0.500, b: 0.200, tw: 0.0102, tf: 0.0160 },
        'IPE550': { h: 0.550, b: 0.210, tw: 0.0111, tf: 0.0172 },
        'IPE600': { h: 0.600, b: 0.220, tw: 0.0120, tf: 0.0190 },
    };

    const params = specs[ipeType] || specs['IPE450']; // Default to heavy

    return {
        shape: createIPEProfile(params.h, params.b, params.tw, params.tf),
        options: {
            depth: length,
            bevelEnabled: false,
        }
    };
};
