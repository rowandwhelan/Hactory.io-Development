console.log("Chunk worker loaded");

self.onmessage = (e) => {
    const { action, payload } = e.data;
    if (action === "generateChunk") {
        const { chunkKey, chunkSize, seed, blockTypes } = payload;
        try {
            const chunkData = generateChunkData(chunkKey, chunkSize, seed, blockTypes);
            self.postMessage({ action: "chunkGenerated", chunkKey, chunkData });
        } catch (error) {
            console.error("Error generating chunk:", error);
            self.postMessage({ action: "error", error: error.message });
        }
    }
};

/**
 * ======== 1) BASIC NOISE UTILS ========
 * This minimal "Perlin-ish" noise uses random gradients + smooth interpolation.
 * It is not production-level Perlin, but enough to give "hilly" terrain.
 * For truly robust noise, consider a library (e.g., SimplexNoise) or a more complete Perlin reference.
 */
function pseudoRandom2D(x, z, seed) {
    // Combines x,z,seed into one integer
    let h = (x * 374761393) + (z * 668265263) ^ seed;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    // Returns a float in range [-1..1]
    return (h & 0xffff) / 32767 - 1;
}

// Smooth interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Fade function for smoother interpolation
function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

// Single octave "Perlin-ish" noise
function perlin2D(x, z, seed, scale = 0.01) {
    // Scale input
    const X = x * scale;
    const Z = z * scale;

    // Grid cell coords
    const x0 = Math.floor(X);
    const z0 = Math.floor(Z);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    // Local coords within cell
    const sx = X - x0;
    const sz = Z - z0;

    // Random gradients at four corners
    const n00 = pseudoRandom2D(x0, z0, seed);
    const n10 = pseudoRandom2D(x1, z0, seed);
    const n01 = pseudoRandom2D(x0, z1, seed);
    const n11 = pseudoRandom2D(x1, z1, seed);

    // Smooth fade
    const u = fade(sx);
    const v = fade(sz);

    // Interpolate in X
    const nx0 = lerp(n00, n10, u);
    const nx1 = lerp(n01, n11, u);

    // Interpolate in Z
    const n = lerp(nx0, nx1, v);

    return n; // [-1..1]
}

/**
 * ======== 2) TERRAIN HEIGHT FUNCTION ========
 * Creates a "rolling hills" effect with multiple octaves.
 */
function getTerrainHeight(x, z, seed) {
    // Combine multiple octaves of perlin-like noise
    let height = 0;
    let amplitude = 20.0;  // overall "mountain" height
    let frequency = 0.01;  // how "wide" the hills are

    // Octave 1
    height += perlin2D(x, z, seed, frequency) * amplitude;

    // Octave 2 (finer detail)
    height += perlin2D(x, z, seed + 9999, frequency * 2) * (amplitude / 2);

    // Shift height upward so we don't go negative
    // base = 24 => sea level, or "base terrain" level
    let base = 24; 
    let finalHeight = Math.floor(height + base);
    return finalHeight;
}

/**
 * ======== 3) CAVES (OPTIONAL) ========
 * If you want caves, uncomment code in generateChunkData that checks 3D noise.
 */
function perlin3D(x, y, z, seed, scale = 0.02) {
    // Convert (x,y,z) into two "2D" perlin calls for simplicity
    // Real 3D Perlin is more involved
    const xy = perlin2D(x, y, seed, scale); 
    const xz = perlin2D(x, z, seed + 12345, scale);
    return (xy + xz) * 0.5; // average => [-1..1]
}

/**
 * ======== 4) GENERATE CHUNK DATA ========
 * Builds an ArrayBuffer of size chunkSize^3, with each voxel = block type (0 => air)
 */
function generateChunkData(chunkKey, chunkSize, seed, blockTypes) {
    const data = new ArrayBuffer(chunkSize ** 3);
    const view = new DataView(data);

    // Parse chunk coordinates
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkSize; y++) {
            for (let x = 0; x < chunkSize; x++) {
                // Global coords
                const worldX = chunkX * chunkSize + x;
                const worldY = chunkY * chunkSize + y;
                const worldZ = chunkZ * chunkSize + z;

                // =========== MAIN TERRAIN: HILLS =============
                let terrainHeight = getTerrainHeight(worldX, worldZ, seed);

                let block = 0; // default air

                if (worldY <= terrainHeight) {
                    // Simple layering logic:
                    const depth = terrainHeight - worldY;
                    if (depth === 0) {
                        // top block => grass
                        block = 1; 
                    } else if (depth < 4) {
                        // next 3 => dirt
                        block = 2; 
                    } else {
                        // below => stone
                        block = 3; 
                    }
                }

                // =========== OPTIONAL: CAVES =============
                /*
                const noise3D = perlin3D(worldX, worldY, worldZ, seed + 5555, 0.02);
                // if noise3D > 0.6 => carve out a cave
                if (noise3D > 0.6) {
                    block = 0; // air
                }
                */

                // Write final block type
                const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
                view.setUint8(index, block);
            }
        }
    }

    return data;
}
