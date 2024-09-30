const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const fs = require('fs')
var { readUInt4, writeUint4 } = require('uint4');

$env:NODE_OPTIONS="--max-old-space-size=8192" 

const app = express();

app.use(express.static(`${__dirname}/../client`))

const server = http.createServer(app)
const io = socketio(server)

//fs.writeFileSync("world.txt", "", "utf-8")

let chunkChanges = {}
let worldSeed = Math.random()*(2**16)

io.on('connection', (sock) => {
    sock.emit('message', 'you are connected')
    sock.emit('worldSeed', worldSeed)
    sock.emit('receiveWorldData', chunkChanges)
    sock.emit('receivePlayerData', players)

    sock.on('message', (text) => io.emit('message', (text)))

    //Updates player info when it is received and sends it to all players, adds new player's data to the list
    sock.on('playerData', (playerUpdate) => {

        updatePlayers(playerUpdate)
        for (const player in playerUpdate) {

            Object.assign(activePlayers, { [player]: sock.id })
        }
        io.emit('receivePlayerData', playerUpdate)
    })


    //Updates world data when it is received and sends it to all players
    sock.on('worldData', (worldUpdate) => {

        updateWorld(worldUpdate)
        io.emit('receiveWorldData', worldUpdate)
        console.log(chunkChanges)
    })

    //Handles player disconnects
    sock.on('disconnect', () => {
        //Searches active players for the socket id of the disconnect and removes them from active players
        for (const player in activePlayers) {

            if (activePlayers[player] == sock.id) {
                //Uses player's username (stored in active players) to find the corresponding player in the players list and removes all their data
                delete players[player]
                io.emit('removePlayer', player)
                delete activePlayers[player]
            }
        }
        sock.emit('receivePlayerData', players)
    });
})

server.on('error', (err) => {
    console.error(err)
})

server.listen(8080, () => {
    console.log("server running at http://localhost:8080")
})

let players = {}
let activePlayers = {}

const updatePlayers = (playerUpdate) => {
    Object.assign(players, playerUpdate)
}

const updateWorld = (worldUpdate) => {
    console.log(worldUpdate)
}