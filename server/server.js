const http = require('http')
const express = require('express')
const socketio = require("socket.io")

const app = express();

app.use(express.static(`${__dirname}/../client`))

const server = http.createServer(app)
const io = socketio(server)

io.on('connection', (sock) => {
    sock.emit('message', 'you are connected')
    sock.emit('receivePlayerData', players)

    sock.on('message', (text) => io.emit('message', (text)))

    //Updates player info when it is received and sends it to all players, adds new player's data to the list
    sock.on('playerData', (playerUpdate) => {
               
        updatePlayers(playerUpdate)
        for(const player in playerUpdate){
            Object.assign(activePlayers, {[player]:sock.id})
        }
        io.emit('receivePlayerData', playerUpdate)
    })

    //Handles player disconnects
    sock.on('disconnect', () => {
        //Searches active players for the socket id of the disconnect and removes them from active players
        for(const player in activePlayers) {

            if(activePlayers[player] == sock.id){
                console.log(`${player} left the game`)
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