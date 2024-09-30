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

const updateWorld = (worldUpdate) => {

    for (const chunk in worldUpdate) {
        const chunkView = new DataView(worldUpdate[chunk])
        let block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
        let instancedMesh = new THREE.InstancedMesh(block.geometry, block.material, chunkView.byteLength)

        for (let x = 0, i = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                for (let z = 0; z < 16; z++) {
                    //if (chunkView.getUint8(i)) continue

                    block.position.set(x, y, z);

                    block.updateMatrix();

                    instancedMesh.setMatrixAt(i, block.matrix);

                    instancedMesh.setColorAt(i, new THREE.Color(`hsl(${Math.random() * 360}, 50%, 66%)`));

                    i++
                }
            }
        }

        scene.add(instancedMesh)
        const chunkPosition = chunk.split(',')
        instancedMesh.position.set(parseInt(chunkPosition[0]) * 16, parseInt(chunkPosition[1]) * 16, parseInt(chunkPosition[2]) * 16)
        Object.assign(chunkEntities, { [chunk]: instancedMesh })
    }
}

const loadWorld = (chunk) => {
    const chunkPosition = chunk.split(',')

    let newChunk = new ArrayBuffer(4096)

    let chunkView = new DataView(newChunk)
    for (let i = 0; i < chunkView.byteLength; i++) {
        const block = Math.random() * 4
        chunkView.setUint8(i, block)
    }
    Object.assign(chunks, { [chunk]: newChunk })
    updateWorld({ [chunk]: newChunk })
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
                for (x = intersect.object.position.x; x > 16; x -= 16) {
                    chunkCoordX++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.x < 0) {
                for (x = intersect.object.position.x; x < 0; x += 16) {
                    chunkCoordX--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }

            if (intersect.object.position.y >= 0) {
                for (y = intersect.object.position.y; y > 16; y -= 16) {
                    chunkCoordY++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.y < 0) {
                for (y = intersect.object.position.y; y < 0; y += 16) {
                    chunkCoordY--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }

            if (intersect.object.position.z >= 0) {
                for (z = intersect.object.position.z; z > 16; z -= 16) {
                    chunkCoordZ++
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            } else if (intersect.object.position.z < 0) {
                for (z = intersect.object.position.z; z < 0; z += 16) {
                    chunkCoordZ--
                    console.log(chunkCoordX, chunkCoordY, chunkCoordZ, x, y, z)
                }
            }
            const innerChunkIndex = x + 16 * z + y * 16 * 16
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
    //recives from server
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
        updateWorld(worldUpdate)

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

let renderDistance = 8
const loadNewChunks = () => {
    let chunkArray = Object.keys(chunks)
    for (let x = 0, i = 0; x < renderDistance; x++) {
        for (let y = 0; y < renderDistance; y++) {
            for (let z = 0; z < renderDistance; z++) {

                if (!chunkArray[i]) {
                    let chunkString = `${(x/2)-x},${(y/2)-y},${(z/2)-z}`
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