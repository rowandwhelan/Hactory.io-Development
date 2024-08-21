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
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
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
            if (!playerInGame){
            const newPlayerGeo = new THREE.BoxGeometry(0.5, Math.random(), 0.5);
            const newPlayerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const newPlayer = new THREE.Mesh(newPlayerGeo, newPlayerMat);
            newPlayer.name = player
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

    sock.on('removePlayer', (playerUpdate) => {
        updatePlayers(playerUpdate, false)
        //console.log(`Player removed: ${JSON.stringify(playerUpdate)}`)
    })

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(sock))
    sendPlayerData(sock)
})()


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
    renderer.render(scene, camera)
    stats.update()
}
tick()