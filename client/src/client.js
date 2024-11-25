import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { FirstPersonControls } from './firstpersoncontrols.js'


let sock

//Canvas

const canvas = document.querySelector('canvas')

//Scene
const scene = new THREE.Scene()

var camera = new THREE.PerspectiveCamera(
    90,                                   // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                                  // Near clipping pane
    1000                                  // Far clipping pane
);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * GUI
 */
//FPS Indicator
const container = document.getElementById('container')
const stats = new Stats()
stats.domElement.style.position = 'absolute'
stats.domElement.style.top = '0px'
container.appendChild(stats.domElement)

/**
 * Lighting
 */
//Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

//Directional Light
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 50
const dLightSize = 200
directionalLight.shadow.camera.left = - dLightSize
directionalLight.shadow.camera.top = dLightSize
directionalLight.shadow.camera.right = dLightSize
directionalLight.shadow.camera.bottom = - dLightSize
directionalLight.position.set(-5, 15, 10)
scene.add(directionalLight)

//Fog or FogExp2 [fog grows exponetially] (color, near limit, far limit)
scene.fog = new THREE.Fog(0xFFFFFF, 400, 600)


//Direction vectors for debugging
const origin = new THREE.Vector3(0, 0, 0);
const length = 5;

const dirX = new THREE.Vector3(1, 0, 0); //normalize the direction vector (convert to vector of length 1) 
dirX.normalize();
const hexX = 0xff0000;
const arrowHelperX = new THREE.ArrowHelper(dirX, origin, length, hexX);

const dirY = new THREE.Vector3(0, 1, 0); //normalize the direction vector (convert to vector of length 1) 
dirY.normalize();
const hexY = 0x00ff00;
const arrowHelperY = new THREE.ArrowHelper(dirY, origin, length, hexY);

const dirZ = new THREE.Vector3(0, 0, 1); //normalize the direction vector (convert to vector of length 1) 
dirZ.normalize();
const hexZ = 0x0000ff;
const arrowHelperZ = new THREE.ArrowHelper(dirZ, origin, length, hexZ);

scene.add(arrowHelperX, arrowHelperY, arrowHelperZ);


/**
 * Event Listeners
 */

window.addEventListener('resize', () => {

    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.render(scene, camera)
})

window.addEventListener('click', (event) => {
    //if (!controls.enabled) {
    //return
    //}
    document.body.requestPointerLock();
})

//Chunk Size
const chunkSize = 32

// Reposition the camera
camera.position.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// A mesh is created from the geometry and material, then added to the scene
var plane = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500, 500, 500),
    new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true })
);
plane.rotateX(Math.PI / 2);
scene.add(plane);

const controls = new FirstPersonControls(camera)
controls.enabled = true


/**
 * Players
 */
const players = {}
const playerEntities = {}
const updatePlayers = (playerUpdate, add) => {
    //console.log(playerEntities)
    //console.log(players)
    if (add) {
        for (const player in playerUpdate) {
            let playerInGame = false
            for (const playerEntity in playerEntities) {
                //console.log(playerEntities[playerEntity].position)
                if (playerEntity == player) {
                    playerInGame = true
                    playerEntities[playerEntity].position.set(playerUpdate[player].position.x, playerUpdate[player].position.y, playerUpdate[player].position.z)
                }
            }
            Object.assign(players, playerUpdate)
            if (!playerInGame) {
                const newPlayerGeo = new THREE.BoxGeometry(0.5, Math.random(), 0.5);
                const newPlayerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const newPlayer = new THREE.Mesh(newPlayerGeo, newPlayerMat);
                newPlayer.name = player
                if (player == camera.uuid) {
                    newPlayer.visible = false
                }
                //console.log(playerUpdate[player].position)
                const playerPosition = playerUpdate[player].position
                newPlayer.position.set(playerPosition.x, playerPosition.y, playerPosition.z)
                scene.add(newPlayer);
                //console.log(newPlayer)
                Object.assign(playerEntities, { [player]: newPlayer })
                //console.log(`Players: ${JSON.stringify(players)}`)
                //console.log(`Player Entities: ${JSON.stringify(playerEntities)}`)
            }
        }
    } else if (!add) {
        delete players[playerUpdate]
        for (const playerEntity in playerEntities) {
            if (playerEntity == playerUpdate) {
                scene.remove(playerEntities[playerEntity])
                delete playerEntities[playerEntity]
            }
        }
    } else {
        console.error('updatePlayers() encountered an error')
    }
}

/**
 * Calculate UV coordinates for a block face in a texture atlas.
 * @param {number} blockTypes - Total number of block types.
 * @param {number} atlasSize - The size of the atlas in grid cells (e.g., 4 for a 4x4 grid).
 * @param {number} blockType - The block type (0 to blockTypes - 1).
 * @param {string} face - The face of the block ("front", "back", "left", "right", "top", "bottom").
 * @returns {number[]} Array of UV coordinates for the face.
 */
const blockTypes = 4
const atlasSize = 2

function getFaceUVs(blockTypes, atlasSize, blockType, face) {
    if (blockType < 0 || blockType >= blockTypes) {
        throw new Error("Invalid block type.");
    }

    // Size of each cell in the atlas
    const cellSize = 1 / atlasSize;

    // Calculate the row and column in the atlas for the block type
    const col = blockType % atlasSize;
    const row = Math.floor(blockType / atlasSize);

    // Calculate the UV bounds for the block type
    const uMin = col * cellSize;
    const vMin = row * cellSize;
    const uMax = uMin + cellSize;
    const vMax = vMin + cellSize;

    // Define UV coordinates for different faces
    // Each face's UV coordinates are ordered as: [bottom-left, bottom-right, top-right, top-right, top-left, bottom-left]
    const uvFaces = {
        front: [uMin, vMin, uMax, vMin, uMax, vMax, uMax, vMax, uMin, vMax, uMin, vMin],
        back: [uMax, vMin, uMin, vMin, uMin, vMax, uMin, vMax, uMax, vMax, uMax, vMin],
        left: [uMin, vMin, uMin, vMax, uMax, vMax, uMax, vMax, uMax, vMin, uMin, vMin],
        right: [uMax, vMin, uMax, vMax, uMin, vMax, uMin, vMax, uMin, vMin, uMax, vMin],
        top: [uMin, vMax, uMin, vMin, uMax, vMin, uMax, vMin, uMax, vMax, uMin, vMax],
        bottom: [uMin, vMin, uMax, vMin, uMax, vMax, uMax, vMax, uMin, vMax, uMin, vMin]
    };

    return uvFaces[face] || [];
}



//const chunks = {}
const chunkEntities = {}
let blockCounts = []

//Store blocks as chunks, update them as chunks. Group chunk data to create instanced meshes for each block type
//Request chunks from server
//Get an array of blocks per chunk from server
//Store the block array client side
//Take the block array and iterate over it, for each block check if there are adjacent blocks and for each side where there is not an adjacent block,
// place an instanced mesh of a blockface on that side with that configuration

//const indices = [0, 1, 2, 2, 3, 0];

/**
 * 
 * Make a BufferGeometry with a ShaderMaterial as the material
 * Compress voxel data into a 32 bit float (use video for reference)
 * Add compressed floats a typed array
 * Pass typed array into the BufferGeometry ShaderMaterial
 * Split the floats apart, then loop through the chunk and calculate the vertices needed for each face (dont add unneeded vertices)
 * 
 * Pass nessicary voxel data to fragment shader
 * Apply textures to each blockface
 * 
 * Add buffergeometry to scene
 * Update it only when needed
 * 
 * 
 * 
 * 
 * 
 * Known issues:
 * chunks generate their entire face on their borders unless there is air on that border
 */


// Vertex Shader
const vertexShader = `
    varying vec2 vUv;  // Pass UV coordinates to the fragment shader

    void main() {
        vUv = uv;  // Assign the UV attribute to the varying vUv
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }

`;

// Fragment Shader
const fragmentShader = `
    uniform sampler2D atlasTexture;  // The texture atlas
    varying vec2 vUv;                // Receive UV coordinates from the vertex shader

    void main() {
        vec4 textureColor = texture2D(atlasTexture, vUv);  // Sample the texture atlas
        gl_FragColor = textureColor;                      // Output the sampled color
    }
`;

const textureLoader = new THREE.TextureLoader();
const atlasTexture = textureLoader.load('../img/atlas.png');

const chunkMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        atlasTexture: { value: atlasTexture }  // Pass the texture to the shader
    }
});


// Helper function to get chunk coordinates from world coordinates
const getChunkCoords = (x, y, z) => ({
    chunkX: Math.floor(x / chunkSize),
    chunkY: Math.floor(y / chunkSize),
    chunkZ: Math.floor(z / chunkSize),
    localX: ((x % chunkSize) + chunkSize) % chunkSize,
    localY: ((y % chunkSize) + chunkSize) % chunkSize,
    localZ: ((z % chunkSize) + chunkSize) % chunkSize
});

const isVoxelAt = (x, y, z, currentChunkView, worldUpdate) => {
    // Get chunk and local coordinates
    const coords = getChunkCoords(x, y, z);

    // If the voxel is within the current chunk
    if (coords.chunkX === 0 && coords.chunkY === 0 && coords.chunkZ === 0) {
        if (x >= 0 && x < chunkSize && y >= 0 && y < chunkSize && z >= 0 && z < chunkSize) {
            const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
            return currentChunkView.getUint8(index) !== 0;
        }
        return false; // Out of bounds within the current chunk
    }

    // Check neighboring chunk
    const neighborChunkKey = `${coords.chunkX},${coords.chunkY},${coords.chunkZ}`;
    const neighborChunk = worldUpdate[neighborChunkKey];

    if (neighborChunk) {
        const neighborView = new DataView(neighborChunk);
        const index = (coords.localZ * chunkSize * chunkSize) + 
                      (coords.localY * chunkSize) + 
                      coords.localX;
        return neighborView.getUint8(index) !== 0;
    }

    // If the neighboring chunk doesn't exist, assume no voxel
    return false;
};


const generateChunkMesh = (worldUpdate) => {
    console.log(worldUpdate)
    for (const chunk in worldUpdate) {
        const chunkView = new DataView(worldUpdate[chunk]);
        const chunkGeometry = new THREE.BufferGeometry();
        let vertices = [];
        let colors = [];
        let uvs = []; 
        
        // Get current chunk coordinates
        const [chunkX, chunkY, chunkZ] = chunk.split(',').map(Number);
        const chunkWorldX = chunkX * chunkSize;
        const chunkWorldY = chunkY * chunkSize;
        const chunkWorldZ = chunkZ * chunkSize;

        for (let z = 0; z < chunkSize; z++) {
            for (let y = 0; y < chunkSize; y++) {
                for (let x = 0; x < chunkSize; x++) {
                    const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
                    const voxel = chunkView.getUint8(index);
                    
                    if (voxel === 0) continue;

                    // Generate random color for the block
                    const r = Math.random();
                    const g = Math.random();
                    const b = Math.random();

                    // World space coordinates for neighbor checks
                    const worldX = chunkWorldX + x;
                    const worldY = chunkWorldY + y;
                    const worldZ = chunkWorldZ + z;

                    // Check neighbors using world coordinates
                    // Right face (positive X)
                    if (!isVoxelAt(x + 1, y, z, chunkView, worldUpdate)) {
                        vertices.push(
                            1 + x, y, z,
                            1 + x, 1 + y, z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, y, 1 + z,
                            1 + x, y, z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "right"));
                    }

                    // Left face (negative X)
                    if (!isVoxelAt(x - 1, y, z, chunkView, worldUpdate)) {
                        vertices.push(
                            x, y, 1 + z,
                            x, 1 + y, 1 + z,
                            x, 1 + y, z,
                            x, 1 + y, z,
                            x, y, z,
                            x, y, 1 + z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "left"));
                    }

                    // Top face (positive Y)
                    if (!isVoxelAt(x, y + 1, z, chunkView, worldUpdate)) {
                        vertices.push(
                            1 + x, 1 + y, z,
                            x, 1 + y, z,
                            x, 1 + y, 1 + z,
                            x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "top"));
                    }

                    // Bottom face (negative Y)
                    if (!isVoxelAt(x, y - 1, z, chunkView, worldUpdate)) {
                        vertices.push(
                            x, y, z,
                            1 + x, y, z,
                            1 + x, y, 1 + z,
                            1 + x, y, 1 + z,
                            x, y, 1 + z,
                            x, y, z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "bottom"));
                    }

                    // Front face (negative Z)
                    if (!isVoxelAt(x, y, z - 1, chunkView, worldUpdate)) {
                        vertices.push(
                            1 + x, y, z,
                            x, y, z,
                            x, 1 + y, z,
                            x, 1 + y, z,
                            1 + x, 1 + y, z,
                            1 + x, y, z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "front"));
                    }

                    // Back face (positive Z)
                    if (!isVoxelAt(x, y, z + 1, chunkView, worldUpdate)) {
                        vertices.push(
                            x, y, 1 + z,
                            1 + x, y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            x, 1 + y, 1 + z,
                            x, y, 1 + z
                        );
                        for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "back"));
                    }
                }
            }
        }

        const vertexArray = new Float32Array(vertices);
        const colorArray = new Float32Array(colors);
        const uvArray = new Float32Array(uvs);
        chunkGeometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
        chunkGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        chunkGeometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
        
        const chunkMesh = new THREE.Mesh(chunkGeometry, chunkMaterial);
        chunkMesh.position.set(chunkWorldX, chunkWorldY, chunkWorldZ);
        scene.add(chunkMesh);
    }
};

const getVoxelIndex = (x, y, z) => {
    return x + y * chunkSize + z * chunkSize ** 2
}

const getVoxelPosition = (index) => {
    // x,y,z
    return [index % 32, (((index - (index % 32)) / 32) % 32), (((index - (index % (32 ** 2))) / 32) / 32) % 32]
}

const seedRandom = (seed) => {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
};

const generateChunkData = (chunkKey, seed) => {
    const chunkPosition = chunkKey.split(',').map(Number);

    const newChunk = new ArrayBuffer(chunkSize * chunkSize * chunkSize);
    const chunkView = new DataView(newChunk);

    // Use a seeded PRNG for consistency
    const random = seedRandom(seed + chunkPosition.join(''));
    for (let i = 0; i < chunkView.byteLength; i++) {
        const block = Math.floor(random() * blockTypes);
        chunkView.setUint8(i, block);
    }

    return newChunk;
};




const log = (text) => {
    const parent = document.querySelector('#events')
    const el = document.createElement('li')
    el.innerHTML = text

    parent.appendChild(el)
    parent.scrollTop = parent.scrollHeight
}

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault()

    const input = document.querySelector('#chat')
    const text = input.value
    input.value = ''
    //sends to server
    sock.emit('message', text)
}

const sendPlayerData = (sock) => {

    const username = camera.uuid
    const playerData = {}
    playerData.position = camera.position
    const player = { [username]: playerData }
    //console.log(player)
    sock.emit('playerData', (player))
}

const sendWorldData = (worldData) => {
    console.log('worldData', worldData)
    sock.emit('worldData', (worldData))
}


document.addEventListener('mousemove', onMouseMove)
document.addEventListener('mousedown', onMouseDown)

//Placeholder block
//const placeholderGeo = new THREE.BoxGeometry(1, 1, 1)
//let placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
//let placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMaterial)
//scene.add(placeholderMesh)

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2(0, 0)

function onMouseMove(event) {

    raycaster.setFromCamera(mouse, camera)

    // //the line below tanks the fps for some reason lol
    // const intersects = raycaster.intersectObjects(scene.children, false)

    // if (intersects.length > 0) {

    //     const intersect = intersects[0]

    //     //Moves placeholder mesh
    //     placeholderMesh.position.copy(intersect.point).add(intersect.face.normal)
    // }
}

function onMouseDown(event) {

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {

        const intersect = intersects[0]

        // delete cube
        if (event.button == 2) {
            let chunkCoordX = 0
            let chunkCoordY = 0
            let chunkCoordZ = 0
            let x
            let y
            let z
            if (intersect.object.position.x >= 0) {
                for (x = intersect.object.position.x; x > chunkSize; x -= chunkSize) {
                    chunkCoordX++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.x < 0) {
                for (x = intersect.object.position.x; x < 0; x += chunkSize) {
                    chunkCoordX--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }

            if (intersect.object.position.y >= 0) {
                for (y = intersect.object.position.y; y > chunkSize; y -= chunkSize) {
                    chunkCoordY++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.y < 0) {
                for (y = intersect.object.position.y; y < 0; y += chunkSize) {
                    chunkCoordY--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }

            if (intersect.object.position.z >= 0) {
                for (z = intersect.object.position.z; z > chunkSize; z -= chunkSize) {
                    chunkCoordZ++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.z < 0) {
                for (z = intersect.object.position.z; z < 0; z += chunkSize) {
                    chunkCoordZ--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }
            const innerChunkIndex = x + chunkSize * z + y * chunkSize * chunkSize
            const chunkCoordsString = `${chunkCoordX},${chunkCoordY},${chunkCoordZ}`
            sendWorldData({ [chunkCoordsString]: { [innerChunkIndex]: { 'x': x, 'y': y, 'z': z, 'type': 0, 'config': undefined } } })

            //create cube
        } else if (event.button == 1) {
            console.log('added')
            console.log(intersect)
        }

    }
}


(() => {
    sock = io()
    //receives from server
    sock.on('message', (text) => {
        log(text)
    })

    //Receives an object with one or more players sent from the server
    sock.on('receivePlayerData', (playerUpdate) => {
        updatePlayers(playerUpdate, true)
        //console.log(`New player: ${JSON.stringify(playerUpdate)}`)
    })

    sock.on('receiveWorldData', (worldUpdate) => {
        console.log(`World Update: ${JSON.stringify(worldUpdate)}`)
        generateChunkMesh(worldUpdate)

    })

    sock.on('worldSeed', (worldSeed) => {
        //seed = worldSeed
    })

    sock.on('removePlayer', (playerUpdate) => {
        updatePlayers(playerUpdate, false)
        //console.log(`Player removed: ${JSON.stringify(playerUpdate)}`)
    })

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(sock))
    sendPlayerData(sock)
})()

let renderDistance = 4
const chunks = {}; // Store loaded chunks
const loadedChunkSet = new Set(); // Track which chunks are currently loaded

const loadWorld = (chunkKey, seed) => {
    if (loadedChunkSet.has(chunkKey)) return; // Skip already loaded chunks

    const newChunk = generateChunkData(chunkKey, seed);
    Object.assign(chunks, { [chunkKey]: newChunk });
    loadedChunkSet.add(chunkKey);
    generateChunkMesh({ [chunkKey]: newChunk });
};

const unloadChunk = (chunkKey) => {
    if (!loadedChunkSet.has(chunkKey)) return;

    delete chunks[chunkKey];
    loadedChunkSet.delete(chunkKey);

    // Optionally remove associated mesh from the scene
    const chunkMesh = scene.getObjectByName(chunkKey);
    if (chunkMesh) {
        scene.remove(chunkMesh);
    }
};

const updateChunks = (playerPosition, seed) => {
    const playerChunk = {
        x: Math.floor(playerPosition.x / chunkSize),
        y: Math.floor(playerPosition.y / chunkSize),
        z: Math.floor(playerPosition.z / chunkSize),
    };

    const chunksToLoad = [];
    const chunksToUnload = new Set(loadedChunkSet);

    for (let x = -renderDistance; x <= renderDistance; x++) {
        for (let y = -renderDistance; y <= renderDistance; y++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
                const chunkKey = `${playerChunk.x + x},${playerChunk.y + y},${playerChunk.z + z}`;
                chunksToLoad.push(chunkKey);
                chunksToUnload.delete(chunkKey);
            }
        }
    }

    // Load new chunks
    for (const chunkKey of chunksToLoad) {
        loadWorld(chunkKey, seed);
    }

    // Unload chunks outside render distance
    for (const chunkKey of chunksToUnload) {
        unloadChunk(chunkKey);
    }
};


/**
 * Animation Loop
 */
//Current Time
let time = Date.now()

//animation
const playerPosition = { x: 0, y: 0, z: 0 }; // Update this based on player movement
const seed = 12345; // Fixed seed for deterministic generation

const tick = () => {
    window.requestAnimationFrame(tick);

    const currentTime = Date.now();
    const deltaTime = currentTime - time;
    time = currentTime;

    // Update player position and load/unload chunks
    updateChunks(playerPosition, seed);

    controls.update(deltaTime);
    sendPlayerData(sock);
    renderer.render(scene, camera);
    stats.update();
};
tick();
