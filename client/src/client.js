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

let seed

const chunks = {}
const chunkEntities = {}
let blockCounts = []

//Store blocks as chunks, update them as chunks. Group chunk data to create instanced meshes for each block type
//Request chunks from server
//Get an array of blocks per chunk from server
//Store the block array client side
//Take the block array and iterate over it, for each block check if there are adjacent blocks and for each side where there is not an adjacent block,
// place an instanced mesh of a blockface on that side with that configuration

//const indices = [0, 1, 2, 2, 3, 0];

const addFace = (side, x, y, z) => {
}


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
    varying vec3 vColor;  // Define vColor as varying to pass to fragment shader

    void main() {
        vColor = color;   // Pass the color to fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment Shader
const fragmentShader = `
    varying vec3 vColor;  // Receive vColor from vertex shader

    void main() {
        gl_FragColor = vec4(vColor, 1.0);  // Use the color with full opacity
    }
`;

// Create the shader material
const chunkMaterial = new THREE.ShaderMaterial({
    wireframe: false,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    vertexColors: true  // Enable vertex colors
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
    
    // If we're within the current chunk bounds
    if (x >= 0 && x < chunkSize && y >= 0 && y < chunkSize && z >= 0 && z < chunkSize) {
        const index = (z * chunkSize * chunkSize) + (y * chunkSize) + x;
        return currentChunkView.getUint8(index) !== 0;
    }
    
    // If we're checking a neighboring chunk
    const neighborChunkKey = `${coords.chunkX},${coords.chunkY},${coords.chunkZ}`;
    const neighborChunk = worldUpdate[neighborChunkKey];
    
    // If the neighboring chunk exists in our update
    if (neighborChunk) {
        const neighborView = new DataView(neighborChunk);
        const index = (coords.localZ * chunkSize * chunkSize) + 
                     (coords.localY * chunkSize) + 
                     coords.localX;
        return neighborView.getUint8(index) !== 0;
    }
    
    // If the neighboring chunk doesn't exist, return false to create a face
    return false;
};

const generateChunkMesh = (worldUpdate) => {
    console.log(worldUpdate)
    for (const chunk in worldUpdate) {
        const chunkView = new DataView(worldUpdate[chunk]);
        const chunkGeometry = new THREE.BufferGeometry();
        let vertices = [];
        let colors = [];
        
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
                    }
                }
            }
        }

        const vertexArray = new Float32Array(vertices);
        const colorArray = new Float32Array(colors);
        chunkGeometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
        chunkGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        
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

const loadWorld = (chunk) => {
    const chunkPosition = chunk.split(',')
    const blockTypes = 256

    let newChunk = new ArrayBuffer(chunkSize * chunkSize * chunkSize)

    let chunkView = new DataView(newChunk)
    for (let i = 0; i < chunkView.byteLength; i++) {
        const block = Math.random() * blockTypes
        chunkView.setUint8(i, block)
    }
    Object.assign(chunks, { [chunk]: newChunk })
    generateChunkMesh({ [chunk]: newChunk })
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
        seed = worldSeed
    })

    sock.on('removePlayer', (playerUpdate) => {
        updatePlayers(playerUpdate, false)
        //console.log(`Player removed: ${JSON.stringify(playerUpdate)}`)
    })

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(sock))
    sendPlayerData(sock)
})()

let renderDistance = 4
const loadNewChunks = () => {
    let chunkArray = Object.keys(chunks)
    for (let x = 0, i = 0; x < renderDistance; x++) {
        for (let y = 0; y < renderDistance; y++) {
            for (let z = 0; z < renderDistance; z++) {

                if (!chunkArray[i]) {
                    let chunkString = `${x},${y},${z}`
                    loadWorld(chunkString)
                }

            }
        }
    }


}

/**
 * Animation Loop
 */
//Current Time
let time = Date.now()

//animation
const tick = () => {
    window.requestAnimationFrame(tick)

    const currentTime = Date.now()
    const deltaTime = currentTime - time
    time = currentTime
    //delta time is miliseconds per frame

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.02;

    controls.update(deltaTime)
    sendPlayerData(sock)
    loadNewChunks()
    renderer.render(scene, camera)
    stats.update()
}
tick()