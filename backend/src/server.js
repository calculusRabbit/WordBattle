const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const lobbyRoutes = require("./routes/lobbyRoutes.js");
const glove = require("./model/glove.js");
const gameSocket = require("./socket/gameSocket.js");
const { setIO } = require("./socket/ioInstance.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});



app.use(cors());
app.use(express.json());
app.use('/api/lobbies', lobbyRoutes);

app.get('/', (req, res) => {
    res.json({message: "WordDuel server is running!"})
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        console.log('Loading GloVe embeddings...');
        await glove.loadGlove();

        console.log('Loading filtered words...');
        await glove.loadFilteredWords();

        setIO(io);
        gameSocket(io);
        console.log('GloVe embeddings loaded successfully.');

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    } catch (error) {
        console.error('fail to start server:', error);
        process.exit(1);
    }
}

startServer();