import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { FirstPersonControls } from './firstpersoncontrols.js'

let sock

/**
 * Initialize
 */
function initialize() {
    // Canvas
    const canvas = document.querySelector('canvas');

    // Scene
    const scene = new THREE.Scene();

    // Camera
    var camera = new THREE.PerspectiveCamera(
        90,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    // Reposition the camera
    camera.position.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Stats (FPS)
    const stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.getElementById('container').appendChild(stats.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 50;
    const dLightSize = 200;
    directionalLight.shadow.camera.left = -dLightSize;
    directionalLight.shadow.camera.top = dLightSize;
    directionalLight.shadow.camera.right = dLightSize;
    directionalLight.shadow.camera.bottom = -dLightSize;
    directionalLight.position.set(-5, 15, 10);
    scene.add(directionalLight);

    // Fog
    scene.fog = new THREE.Fog(0xffffff, 400, 600);

    // Arrow helpers for debugging
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 5;
    scene.add(
        new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0).normalize(), origin, length, 0xff0000),
        new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0).normalize(), origin, length, 0x00ff00),
        new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1).normalize(), origin, length, 0x0000ff)
    );

    // Plane
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500, 500, 500),
        new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true })
    );
    plane.rotateX(Math.PI / 2);
    scene.add(plane);

    // FirstPersonControls
    const controls = new FirstPersonControls(camera);
    controls.enabled = true;

    // Event Listeners
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    window.addEventListener('click', () => {
        if (!paused) {
            document.body.requestPointerLock();
        }
    });

    return { scene, camera, renderer, stats, controls };
}

const { scene, camera, renderer, stats, controls } = initialize();

/**
 * Constants
 */
const seed = 12345; // Fixed seed for deterministic generation
const chunkSize = 32
const blockTypes = 400
const atlasSize = 2
let renderDistance = 2

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

//Store blocks as chunks, update them as chunks. Group chunk data to create instanced meshes for each block type
//Request chunks from server
//Get an array of blocks per chunk from server
//Store the block array client side
//Take the block array and iterate over it, for each block check if there are adjacent blocks and for each side where there is not an adjacent block,
// place an instanced mesh of a blockface on that side with that configuration

//const indices = [0, 1, 2, 2, 3, 0];

/**
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
 * Known issues:
 * chunks generate their entire face on their borders unless there is air on that border
 * to be more specific, the chunk nextdoor generates an outward faces on its border, regardless of whether there is a block obstructing it in its neighbor
 */

const chunks = {}; // Store loaded chunks in an object in the form "x,y,z": ArrayBuffer { ... }
const loadedChunkSet = new Set(); // Track which chunks are currently loaded "x,y,z"

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
    },
    side: THREE.FrontSide // Ensures proper culling of back faces
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

// Helper function to get the opposite face of a given face
const getOppositeFace = (face) => {
    const oppositeFaces = {
        left: "right",
        right: "left",
        top: "bottom",
        bottom: "top",
        front: "back",
        back: "front",
    };
    return oppositeFaces[face];
};

// A simple, deterministic hash based on coordinates and a seed.
function simpleHash(x, y, z, seed) {
    let hash = seed;
    hash = (hash * 31 + x) | 0;
    hash = (hash * 31 + y) | 0;
    hash = (hash * 31 + z) | 0;
    return hash >>> 0; // ensure non-negative
}

// Use the hash to determine the block type.
// We’ll designate 0 as air, and nonzero values as different block types.
function getVoxelAtGlobal(x, y, z, seed) {
    const h = simpleHash(x, y, z, seed);
    // For example, we can say that 5% of voxels are air.
    if (h % 100 < 5) return 0;
    // Otherwise, assign a block type between 1 and (blockTypes - 1).
    return (h % (blockTypes - 1)) + 1;
}

const isVoxelAt = (x, y, z, currentChunkView, filledChunk) => {
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
    const neighborChunk = filledChunk[neighborChunkKey];

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

//Recieves global coordinates and returns whether or not there is a voxel at that location
function isVoxelAtGlobal(x, y, z) {
    const { chunkX, chunkY, chunkZ, localX, localY, localZ } = getChunkCoords(x, y, z);
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
    if (chunks[chunkKey]) {
        const chunkView = new DataView(chunks[chunkKey]);
        //console.log(chunkView, x, y, z)
        const index = (localZ * chunkSize * chunkSize) + (localY * chunkSize) + localX;
        return chunkView.getUint8(index) !== 0;
    }

    console.log(`Suspicious voxel at x=${x}, y=${y}, z=${z}`, chunkKey);
    return false;
}

// Generate a chunk of voxel data based on global coordinates.
// Recieves a filledChunk object containing: Object { "x,y,z": ArrayBuffer { ... } }
const generateChunkMesh = (filledChunk) => {
    for (const chunk in filledChunk) {
        // Remove any existing mesh for this chunk.
        const oldMesh = scene.getObjectByName(chunk);
        if (oldMesh) {
            scene.remove(oldMesh);
        }

        const chunkView = new DataView(filledChunk[chunk]);
        const chunkGeometry = new THREE.BufferGeometry();
        let vertices = [];
        let colors = [];
        let uvs = [];

        // Get current chunk coordinates from the chunk key string ("x,y,z")
        const [chunkX, chunkY, chunkZ] = chunk.split(',').map(Number);
        const chunkWorldX = chunkX * chunkSize;
        const chunkWorldY = chunkY * chunkSize;
        const chunkWorldZ = chunkZ * chunkSize;

        console.groupCollapsed("Suspicious Voxels Check", chunk);

        // Loop through every voxel in the chunk.
        // Terrible for performance, must be optimized.
        for (let z = 0; z < chunkSize; z++) {
            for (let y = 0; y < chunkSize; y++) {
                for (let x = 0; x < chunkSize; x++) {
                    const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
                    const voxel = chunkView.getUint8(index);

                    if (voxel === 0) continue;

                    // Generate random color (for debugging/visualization)
                    const r = Math.random();
                    const g = Math.random();
                    const b = Math.random();

                    // Calculate world coordinates for this voxel.
                    const worldX = chunkWorldX + x;
                    const worldY = chunkWorldY + y;
                    const worldZ = chunkWorldZ + z;

                    // Check neighbors using global coordinates.
                    // For each face, if there is no adjacent voxel, add the face's vertices.

                    // Right face (positive X)
                    if (!isVoxelAtGlobal(worldX + 1, worldY, worldZ)) {
                        vertices.push(
                            1 + x, y, z,
                            1 + x, 1 + y, z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, y, 1 + z,
                            1 + x, y, z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "right"));
                    }

                    // Left face (negative X)
                    if (!isVoxelAtGlobal(worldX - 1, worldY, worldZ)) {
                        vertices.push(
                            x, y, 1 + z,
                            x, 1 + y, 1 + z,
                            x, 1 + y, z,
                            x, 1 + y, z,
                            x, y, z,
                            x, y, 1 + z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "left"));
                    }

                    // Top face (positive Y)
                    if (!isVoxelAtGlobal(worldX, worldY + 1, worldZ)) {
                        vertices.push(
                            1 + x, 1 + y, z,
                            x, 1 + y, z,
                            x, 1 + y, 1 + z,
                            x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "top"));
                    }

                    // Bottom face (negative Y)
                    if (!isVoxelAtGlobal(worldX, worldY - 1, worldZ)) {
                        vertices.push(
                            x, y, z,
                            1 + x, y, z,
                            1 + x, y, 1 + z,
                            1 + x, y, 1 + z,
                            x, y, 1 + z,
                            x, y, z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "bottom"));
                    }

                    // Front face (negative Z)
                    if (!isVoxelAtGlobal(worldX, worldY, worldZ - 1)) {
                        vertices.push(
                            1 + x, y, z,
                            x, y, z,
                            x, 1 + y, z,
                            x, 1 + y, z,
                            1 + x, 1 + y, z,
                            1 + x, y, z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "front"));
                    }

                    // Back face (positive Z)
                    if (!isVoxelAtGlobal(worldX, worldY, worldZ + 1)) {
                        vertices.push(
                            x, y, 1 + z,
                            1 + x, y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            1 + x, 1 + y, 1 + z,
                            x, 1 + y, 1 + z,
                            x, y, 1 + z
                        );
                        //for (let i = 0; i < 6; i++) colors.push(r, g, b);
                        uvs.push(...getFaceUVs(blockTypes, atlasSize, voxel, "back"));
                    }
                }
            }
        }

        console.groupEnd();

        // Build the geometry
        const vertexArray = new Float32Array(vertices);
        const colorArray = new Float32Array(colors);
        const uvArray = new Float32Array(uvs);
        chunkGeometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
        chunkGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        chunkGeometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

        // Create the mesh
        const chunkMesh = new THREE.Mesh(chunkGeometry, chunkMaterial);
        chunkMesh.position.set(chunkWorldX, chunkWorldY, chunkWorldZ);
        // Set the mesh name to the chunk key for easy lookup later.
        chunkMesh.name = chunk;
        scene.add(chunkMesh);
    }
};

const generateChunkData = (chunkKey, seed) => {
    const newChunk = new ArrayBuffer(chunkSize * chunkSize * chunkSize);
    const view = new DataView(newChunk);

    // Get chunk coordinates from the key.
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    // Iterate over each local voxel in the chunk.
    for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkSize; y++) {
            for (let x = 0; x < chunkSize; x++) {
                // Compute global coordinates.
                const worldX = chunkX * chunkSize + x;
                const worldY = chunkY * chunkSize + y;
                const worldZ = chunkZ * chunkSize + z;
                const block = getVoxelAtGlobal(worldX, worldY, worldZ, seed);
                const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
                view.setUint8(index, block);
            }
        }
    }

    // Store the ArrayBuffer (not the DataView) for later neighbor checks.
    chunks[chunkKey] = newChunk;
    return newChunk;
};

function updateNeighboringChunks(chunkKey) {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    const neighbors = [
        [chunkX + 1, chunkY, chunkZ],
        [chunkX - 1, chunkY, chunkZ],
        [chunkX, chunkY + 1, chunkZ],
        [chunkX, chunkY - 1, chunkZ],
        [chunkX, chunkY, chunkZ + 1],
        [chunkX, chunkY, chunkZ - 1],
    ];

    neighbors.forEach(([nx, ny, nz]) => {
        const neighborKey = `${nx},${ny},${nz}`;
        if (chunks[neighborKey]) {
            generateChunkMesh({ [neighborKey]: chunks[neighborKey] }); // Regenerate neighbor mesh
        }
    });
}


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

const sendBlockUpdate = (blockUpdate) => {
    console.log('blockUpdate', blockUpdate)
    sock.emit('blockUpdate', (blockUpdate))
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
            sendBlockUpdate({ [chunkCoordsString]: { [innerChunkIndex]: { 'x': x, 'y': y, 'z': z, 'type': 0, 'config': undefined } } })

            //create cube
        } else if (event.button == 1) {
            console.log('added')
            console.log(intersect)
        }

    }
}

(() => {
    sock = io()
    //receives a message from the server
    sock.on('message', (text) => {
        log(text)
    })

    // Receives an object with one or more players sent from the server 
    // Object received: { 'playerID': { 'position': { 'x': 0, 'y': 0, 'z': 0 } } , . . . }
    sock.on('receivePlayerData', (playerUpdate) => {
        updatePlayers(playerUpdate, true)

        //console.log(`New player: ${JSON.stringify(playerUpdate)}`)
    })

    // Recieves an entire from the server
    // Object received: { 'chunkKey': ArrayBuffer { ... } }
    sock.on('receiveChunkChanges', (chunkChanges) => {
        //CURRENTLY DOES NOT WORK, ONLY AN EMPTY INITAL MESSAGE IS RECEIVED
        console.log(`World Update: ${JSON.stringify(chunkChanges)}`)
        //generateChunkMesh(chunkChanges)
    })

    // Recieves a block updates from the server
    // Object received: { 'chunkKey': { 'blockIndex': { 'x': 0, 'y': 0, 'z': 0, 'type': 0, 'config': undefined } } }
    sock.on('receiveBlockUpdate', (blockUpdate) => {
        //TO DO: Implement block updates
        //console.log(`Block Update: ${JSON.stringify(blockUpdate)}`)
    })

    sock.on('worldSeed', (worldSeed) => {
        //TO DO: Implement world generation via server seed
        //seed = worldSeed
    })

    //Recieves a player update as a string "playerID" from the server, only contains the playerID nothing else
    sock.on('removePlayer', (playerUpdate) => {
        console.log(playerUpdate)
        updatePlayers(playerUpdate, false)
        //console.log(`Player removed: ${JSON.stringify(playerUpdate)}`)
    })

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(sock))
    sendPlayerData(sock)
})()

const worker = new Worker('./src/chunkWorker.js');

worker.onmessage = (e) => {
    //console.log("Main thread received message from worker:", e.data);
    const { action, chunkKey, chunkData, error } = e.data;

    if (action === "chunkGenerated") {
        chunks[chunkKey] = chunkData;
        loadedChunkSet.add(chunkKey);
        generateChunkMesh({ [chunkKey]: chunkData });
        // Update neighbors (you may debounce this call to reduce lag)
        //scheduleNeighborUpdate(chunkKey);
        updateNeighborChunks(chunkKey);
    } else if (action === "error") {
        console.error(`Error in worker: ${error}`);
    }
};

let neighborUpdateTimeout = null;
function scheduleNeighborUpdate(chunkKey) {
    if (neighborUpdateTimeout) clearTimeout(neighborUpdateTimeout);
    neighborUpdateTimeout = setTimeout(() => {
        updateNeighborChunks(chunkKey);
        neighborUpdateTimeout = null;
    }, 50); // Adjust delay as needed
}


const updateNeighborChunks = (chunkKey) => {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
    const neighborKeys = [
        `${chunkX + 1},${chunkY},${chunkZ}`,
        `${chunkX - 1},${chunkY},${chunkZ}`,
        `${chunkX},${chunkY + 1},${chunkZ}`,
        `${chunkX},${chunkY - 1},${chunkZ}`,
        `${chunkX},${chunkY},${chunkZ + 1}`,
        `${chunkX},${chunkY},${chunkZ - 1}`
    ];

    neighborKeys.forEach(key => {
        if (chunks[key]) {
            generateChunkMesh({ [key]: chunks[key] });
        }
    });
};

const loadWorld = (chunkKey, seed) => {
    if (loadedChunkSet.has(chunkKey)) return;
    worker.postMessage({
        action: "generateChunk",
        payload: { chunkKey, seed, chunkSize, blockTypes },
    });
};

const updateNeighbors = (chunkKey) => {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    const neighbors = [
        { key: `${chunkX + 1},${chunkY},${chunkZ}`, face: 'left' }, // +X
        { key: `${chunkX - 1},${chunkY},${chunkZ}`, face: 'right' }, // -X
        { key: `${chunkX},${chunkY + 1},${chunkZ}`, face: 'bottom' }, // +Y
        { key: `${chunkX},${chunkY - 1},${chunkZ}`, face: 'top' }, // -Y
        { key: `${chunkX},${chunkY},${chunkZ + 1}`, face: 'front' }, // +Z
        { key: `${chunkX},${chunkY},${chunkZ - 1}`, face: 'back' }  // -Z
    ];

    neighbors.forEach((neighbor) => {
        const neighborKey = neighbor.key;
        if (chunks[neighborKey]) {
            // Update neighbor's border
            updateChunkBorder(neighborKey, neighbor.face);
            // Update current chunk's border
            updateChunkBorder(chunkKey, getOppositeFace(neighbor.face));
        }
    });
};

const updateChunkBorder = (chunkKey, face) => {
    const chunkData = chunks[chunkKey];
    if (!chunkData) return;

    const chunkView = new DataView(chunkData);

    // Iterate over the face's voxels and determine visibility
    // Only add/remove faces that need to be updated
    const updatedVertices = [];
    const updatedUVs = [];
    const updatedColors = [];

    // (Implement logic to handle the specific face using the existing generateChunkMesh logic)

    // Apply updates to the chunk's mesh
    const chunkMesh = scene.getObjectByName(chunkKey);
    if (chunkMesh) {
        const geometry = chunkMesh.geometry;
        // Update the geometry's attributes with the new data
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(updatedVertices), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(updatedUVs), 2));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(updatedColors), 3));
        geometry.attributes.position.needsUpdate = true;
    }
};

const unloadChunk = (chunkKey) => {
    const chunkMesh = scene.getObjectByName(chunkKey);
    if (chunkMesh) {
        scene.remove(chunkMesh);
        //console.log(`Unloaded chunk: ${chunkKey}`);
    }
    delete chunks[chunkKey];
    loadedChunkSet.delete(chunkKey);
};

let lastPlayerChunk = null;

const updateChunks = (playerPosition, seed) => {
    const playerChunk = {
        x: Math.floor(playerPosition.x / chunkSize),
        y: Math.floor(playerPosition.y / chunkSize),
        z: Math.floor(playerPosition.z / chunkSize),
    };

    // Only update if the player moved to a new chunk
    if (lastPlayerChunk &&
        lastPlayerChunk.x === playerChunk.x &&
        lastPlayerChunk.y === playerChunk.y &&
        lastPlayerChunk.z === playerChunk.z) {
        return;
    }
    lastPlayerChunk = playerChunk;

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

const dirtyChunks = new Set();

function markNeighborsDirty(chunkKey) {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
    const neighborKeys = [
        `${chunkX + 1},${chunkY},${chunkZ}`,
        `${chunkX - 1},${chunkY},${chunkZ}`,
        `${chunkX},${chunkY + 1},${chunkZ}`,
        `${chunkX},${chunkY - 1},${chunkZ}`,
        `${chunkX},${chunkY},${chunkZ + 1}`,
        `${chunkX},${chunkY},${chunkZ - 1}`
    ];
    neighborKeys.forEach(key => {
        if (chunks[key]) dirtyChunks.add(key);
    });
}

function processDirtyChunks() {
    dirtyChunks.forEach(key => {
        // Re‐generate the mesh for the dirty chunk.
        generateChunkMesh({ [key]: chunks[key] });
    });
    dirtyChunks.clear();
}

// For example, every 200ms:
setInterval(processDirtyChunks, 200);

/**
 * Animation Loop
 */
//Current Time
let time = Date.now()
const playerPosition = { x: 0, y: 0, z: 0 }; // Update this based on player movement
let lastUpdateTime = 0;
const updateInterval = 100; // Update every 100ms

let paused = false;
onkeydown = (e) => {
    if (e.key === "p") {
        paused = !paused;
        document.exitPointerLock();
    }
};

const updateChunksThrottled = (playerPosition, seed) => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < updateInterval) return;
    lastUpdateTime = currentTime;

    updateChunks(camera.position, seed);
};

const tick = () => {
    window.requestAnimationFrame(tick);

    if (paused) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - time;
    time = currentTime;

    // Update player position and load/unload chunks
    updateChunksThrottled(playerPosition, seed);

    controls.update(deltaTime);
    sendPlayerData(sock);
    renderer.render(scene, camera);
    stats.update();
};
tick();
