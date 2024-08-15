import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { FirstPersonControls } from './firstpersoncontrols.js'

//Canvas

const canvas = document.querySelector('canvas')

//Scene
const scene = new THREE.Scene()

//Camera
let camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000)

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

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

const fps = new FirstPersonControls(camera, canvas )

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

    fps.update(deltaTime)
    renderer.render(scene, camera)
    stats.update()
  }
  tick()

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

(() => {
    const sock = io()
    //recives from server
    sock.on('message', (text) => {
        log(text)
    })

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(sock))
})()


