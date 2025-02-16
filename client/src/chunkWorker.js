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
 * A helper hash function (Wang’s hash variant) that operates on a 32-bit integer.
 */
function wangHash(seed) {
    seed = (seed ^ 61) ^ (seed >>> 16);
    seed = seed + (seed << 3);
    seed = seed ^ (seed >>> 4);
    seed = Math.imul(seed, 0x27d4eb2d);
    seed = seed ^ (seed >>> 15);
    return seed >>> 0;
}

/**
 * Combines the global coordinates and seed using prime multipliers to produce a well‑mixed value.
 */
function hashCoordinates(x, y, z, seed) {
    // The multipliers are large primes chosen to reduce collisions.
    const h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) ^ seed;
    return wangHash(h);
}

/**
 * Determines the voxel type at a given global coordinate.
 * Returns 0 for air, or a value from 1 to blockTypes - 1 for solid blocks.
 * Adjust the threshold (here 10 out of 100) as needed.
 */
function getVoxelAtGlobal(x, y, z, seed, blockTypes) {
    const h = hashCoordinates(x, y, z, seed);
    // For example, if h % 100 is less than 10, designate as air.
    if (h % 100 < 1) return 0;
    return (h % (blockTypes - 1)) + 1;
}

/**
 * Generates voxel data for a chunk based on global coordinates.
 * The voxel value is computed deterministically from world coordinates.
 */
function generateChunkData(chunkKey, chunkSize, seed, blockTypes) {
    const data = new ArrayBuffer(chunkSize ** 3);
    const view = new DataView(data);
    
    // Parse the chunk key (e.g., "0,0,0") into chunk coordinates.
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
    
    for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkSize; y++) {
            for (let x = 0; x < chunkSize; x++) {
                // Calculate global coordinates:
                const worldX = chunkX * chunkSize + x;
                const worldY = chunkY * chunkSize + y;
                const worldZ = chunkZ * chunkSize + z;
                
                // Determine the block type using the global function.
                const block = getVoxelAtGlobal(worldX, worldY, worldZ, seed, blockTypes);
                const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
                view.setUint8(index, block);
            }
        }
    }
    
    return data;
}
