const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({message: "WordDuel server is running!"})
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});