import * as THREE from 'three'
/*
  
  import {
    MathUtils,
    Spherical,
    Vector3
} from 'three';

*/


class FirstPersonControls extends THREE.EventDispatcher {
    constructor(camera) {
        super()

        this.enabled = false

        this.camera = camera
        this.cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ')

        this.quaternion = new THREE.Quaternion()

        this.moveForward = false
        this.moveBackward = false
        this.moveLeft = false
        this.moveRight = false
        this.moveUp = false
        this.moveDown = false

        this.canJump = false

        this.inputVelocity = new THREE.Vector3()
        this.velocity = new THREE.Vector3(0,0,0)
        this.velocityFactor = 0.0005
        this.euler = new THREE.Euler()

        this.velocityCutoff = 0.00001

        this.lockEvent = { type: 'lock' }
        this.unlockEvent = { type: 'unlock' }

        this.spectator = true

        this.connect()
    }

    connect() {
        document.addEventListener('mousemove', this.onMouseMove)
        document.addEventListener('pointerlockchange', this.onPointerlockChange)
        document.addEventListener('pointerlockerror', this.onPointerlockError)
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
    }

    disconnect() {
        document.removeEventListener('mousemove', this.onMouseMove)
        document.removeEventListener('pointerlockchange', this.onPointerlockChange)
        document.removeEventListener('pointerlockerror', this.onPointerlockError)
        document.removeEventListener('keydown', this.onKeyDown)
        document.removeEventListener('keyup', this.onKeyUp)
    }

    lock() {
        document.body.requestPointerLock()
    }

    unlock() {
        document.exitPointerLock()
    }

    onPointerlockChange = () => {
        if (document.pointerLockElement) {
            this.dispatchEvent(this.lockEvent)

            this.isLocked = true
            document.addEventListener('mousemove', this.onMouseMove)
            document.addEventListener('keydown', this.onKeyDown)
            document.addEventListener('keyup', this.onKeyUp)
        } else {
            this.dispatchEvent(this.unlockEvent)

            this.isLocked = false
            document.removeEventListener('mousemove', this.onMouseMove)
            document.removeEventListener('keydown', this.onKeyDown)
            document.removeEventListener('keyup', this.onKeyUp)
        }
    }

    onPointerlockError = () => {
        console.error('FirstPersonControls: Unable to use Pointer Lock API')
    }

    onMouseMove = (event) => {
        if (!this.enabled) {
            return
        }

        const { movementX, movementY } = event
        this.cameraEuler.x -= movementY * 0.00225
        this.cameraEuler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraEuler.x))
        this.cameraEuler.y -= movementX * 0.00225
        this.camera.setRotationFromEuler(this.cameraEuler)
    }

    onKeyDown = (event) => {
        event.preventDefault()
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true
                break

            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true
                break

            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true
                break

            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true
                break

            case 'Space':
                if (this.spectator){
                    this.moveUp = true
                }
                else if (this.canJump) {
                    this.velocity.y = this.jumpVelocity
                }
                this.canJump = false
                break
            case 'ShiftLeft':
                if (this.spectator){
                    this.moveDown = true
                }
        }
    }

    onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false
                break

            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false
                break

            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false
                break

            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false
                break
            case 'Space':
                if (this.spectator){
                    this.moveUp = false
                }
                break
            case 'ShiftLeft':
                if (this.spectator){
                    this.moveDown = false
                }
        }
    }

    getObject() {
        return this.camera
    }

    isMoving() {
        if (this.velocity != (0,0,0)){
            return true
        } else if (this.velocity == (0,0,0)) {
            return false
        } else {
            console.error("Error in player position")
        }
    }

    getDirection() {
        const vector = new THREE.Vector3(0, 0, -1)
        vector.applyQuaternion(this.quaternion)
        return vector
    }

    update(delta) {
        if (this.enabled === false) {
            return
        }

        this.inputVelocity.set(0, 0, 0)

        if (this.moveForward) {
            this.inputVelocity.z = -this.velocityFactor * delta
        }
        if (this.moveBackward) {
            this.inputVelocity.z = this.velocityFactor * delta
        }

        if (this.moveLeft) {
            this.inputVelocity.x = -this.velocityFactor * delta
        }
        if (this.moveRight) {
            this.inputVelocity.x = this.velocityFactor * delta
        }

        if (this.moveUp) {
            this.inputVelocity.y = this.velocityFactor * delta
        }
        if (this.moveDown) {
            this.inputVelocity.y = -this.velocityFactor * delta
        }

        // Convert velocity to world coordinates
        let camEuler = new THREE.Euler().copy(this.cameraEuler)
        //console.log(this.cameraEuler)
        camEuler.x = 0
        this.quaternion.setFromEuler(camEuler)
        //console.log(this.cameraEuler)
        //console.log(this.quaternion)
        this.inputVelocity.applyQuaternion(this.quaternion)
        //console.log(this.inputVelocity)
        // Add to the object
        this.velocity.x += this.inputVelocity.x
        this.velocity.z += this.inputVelocity.z
        this.velocity.y += this.inputVelocity.y
        //console.log(this.camera.position)

        if ((this.velocity.x < this.velocityCutoff) && (this.velocity.x > -this.velocityCutoff)) {
            this.velocity.x = 0
        }
        if ((this.velocity.z < this.velocityCutoff) && (this.velocity.z > -this.velocityCutoff)) {
            this.velocity.z = 0
        }
        if ((this.velocity.y < this.velocityCutoff) && (this.velocity.y > -this.velocityCutoff)) {
            this.velocity.y = 0
        }

        this.camera.position.x += this.velocity.x
        this.camera.position.z += this.velocity.z
        this.camera.position.y += this.velocity.y

        this.velocity.multiplyScalar(0.96)

        //console.log(this.camera.position)
    }
}

export { FirstPersonControls }