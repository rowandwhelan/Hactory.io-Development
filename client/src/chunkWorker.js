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

/** ===============================
 *  1) NOISE UTILS (2D & 3D)
 * =============================== */
/** 
 * Minimal "Perlin-like" 2D noise with random gradients and smooth fade. 
 * For more robust terrain, consider a library like 'simplex-noise'.
 */
function pseudoRandom2D(x, z, seed) {
    let h = x * 374761393 + z * 668265263 ^ seed;
    h = (h ^ (h >> 13)) * 1274126177;
    h ^= (h >> 16);
    return (h & 0xffff) / 32767 - 1; // [-1..1]
}

function fade(t) {
    // Smooth fade curve
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function perlin2D(x, z, seed, scale) {
    // cell coords
    const X = x * scale;
    const Z = z * scale;
    const x0 = Math.floor(X);
    const z0 = Math.floor(Z);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    // local coords
    const sx = X - x0;
    const sz = Z - z0;

    // corner randoms
    const n00 = pseudoRandom2D(x0, z0, seed);
    const n10 = pseudoRandom2D(x1, z0, seed);
    const n01 = pseudoRandom2D(x0, z1, seed);
    const n11 = pseudoRandom2D(x1, z1, seed);

    // fade
    const u = fade(sx);
    const v = fade(sz);

    // interpolate along x, then z
    const nx0 = lerp(n00, n10, u);
    const nx1 = lerp(n01, n11, u);
    const n = lerp(nx0, nx1, v);
    return n; // [-1..1]
}

/**
 * Basic 3D "Perlin-like" noise hack:
 * We'll combine two 2D perlin calls for an approximate 3D effect.
 */
function perlin3D(x, y, z, seed, scale = 0.02) {
    // We'll fold y into seed offset to vary the noise
    const xy = perlin2D(x, y, seed, scale);
    const xz = perlin2D(x, z, seed + 99999, scale);
    return (xy + xz) * 0.5; // average => approx. [-1..1]
}

/** ===============================
 *  2) TERRAIN HEIGHT & CAVES
 * =============================== */
function getHeight(x, z, seed) {
    // Combine multiple octaves for more interesting mountains & valleys
    let height = 0;

    // Big broad hills
    height += perlin2D(x, z, seed, 0.002) * 150;   // amplitude ~150 blocks
    // Mid-range detail
    height += perlin2D(x, z, seed + 1234, 0.01) * 16;
    // Fine detail
    height += perlin2D(x, z, seed + 9999, 0.02) * 4;

    // shift upward to avoid negatives
    const base = 40; // "sea level" or "base land level"
    const finalHeight = Math.floor(height + base);
    return finalHeight;
}

function isCave(x, y, z, seed) {
    // 3D noise for cave
    const noiseVal = perlin3D(x, y, z, seed + 5555, 0.02);
    // If noiseVal is high => carve out air
    // tweak threshold to change frequency of caves
    return noiseVal > 0.1;
}

/** ===============================
 *  3) ORE DISTRIBUTION
 * =============================== */
function getOreType(x, y, z, seed) {
    // random hash => if < certain threshold => spawn an ore
    // We'll pick stone by default, maybe randomly spawn iron/coal/diamond
    const oreSeed = x * 374761393 + y * 668265263 + z * 987643211 ^ seed;
    let rng = (oreSeed ^ (oreSeed >> 13)) * 1274126177;
    rng ^= (rng >> 16);

    // We'll limit to 0..999 range
    const val = rng % 1000;
    // e.g. diamond => < 2 ( 0.2% ), gold => < 6, iron => < 25, coal => < 60
    if (val < 2) return 7;     // diamond
    if (val < 6) return 6;     // gold
    if (val < 25) return 5;    // iron
    if (val < 40) return 0;    // air pocket
    if (val < 60) return 4;    // coal
    return 3; // default stone
}

/** ===============================
 *  4) ASSEMBLE FINAL BLOCK
 * =============================== */
function pickBlockType(x, y, z, terrainHeight, seed) {
    // Below ground => might be cave => 0 if isCave
    if (y > terrainHeight) {
        return 0; // above ground = air
    }
    // Carve caves
    if (isCave(x, y, z, seed)) {
        return 0;
    }

    // surface / layering
    const depth = terrainHeight - y;
    if (depth === 0) {
        // topmost => grass
        return 1; 
    } else if (depth < 4) {
        // next few => dirt
        return 2; 
    } else {
        // deeper => stone / ore
        // ore distribution
        return getOreType(x, y, z, seed);
    }
}

/** ===============================
 *  5) GENERATE CHUNK DATA
 * =============================== */
function generateChunkData(chunkKey, chunkSize, seed, blockTypes) {
    const data = new ArrayBuffer(chunkSize ** 3);
    const view = new DataView(data);

    // chunk coords
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkSize; y++) {
            for (let x = 0; x < chunkSize; x++) {
                // world coords
                const worldX = chunkX * chunkSize + x;
                const worldY = chunkY * chunkSize + y;
                const worldZ = chunkZ * chunkSize + z;

                // get terrain height
                const terrainHeight = getHeight(worldX, worldZ, seed);
                // pick final block
                const blockType = pickBlockType(worldX, worldY, worldZ, terrainHeight, seed);

                const index = z * chunkSize * chunkSize + y * chunkSize + x;
                view.setUint8(index, blockType);
            }
        }
    }
    return data;
}
