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

        this.canJump = false

        this.inputVelocity = new THREE.Vector3()
        this.euler = new THREE.Euler()

        this.lockEvent = { type: 'lock' }
        this.unlockEvent = { type: 'unlock' }

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
                if (this.canJump) {
                    this.velocity.y = this.jumpVelocity
                }
                this.canJump = false
                break
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
        }
    }

    getObject() {
        return this.camera
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

        // Convert velocity to world coordinates
        this.quaternion.setFromEuler(this.cameraEuler)
        this.inputVelocity.applyQuaternion(this.quaternion)

        // Add to the object
        //this.velocity.x += this.inputVelocity.x
        //this.velocity.z += this.inputVelocity.z

        //this.camera.position.copy(this.playerBody.position)
    }
}

export { FirstPersonControls }