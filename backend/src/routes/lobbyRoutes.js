const express = require('express');
const lobbyService = require("../services/lobbyService.js");
const activeGames = require("../socket/gameState.js");
const { getIO } = require("../socket/ioInstance.js");

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const lobbies = await lobbyService.getAllLobbies();
        const enriched = lobbies.map(lobby => {
            const game = activeGames.get(lobby.id);
            let currentPlayers;

            if (game && game.players) {
                currentPlayers = game.players.length;
            } else {
                currentPlayers = 0;
            }

            return {
                id: lobby.id,
                status: lobby.status,
                max_players: lobby.max_players,
                created_at: lobby.created_at,
                currentPlayers
            };
        });
        res.json(enriched);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve lobbies' });
    }
})


router.post('/', async (req, res) => {

    if (!req.body.maxPlayers) {
        return res.status(400).json({ error: 'maxPlayers is required' });
    }

    const maxPlayers = req.body.maxPlayers;

    if (maxPlayers < 2 || maxPlayers > 16) {
        return res.status(400).json({ error: 'maxPlayers must be between 2 and 5' });
    }


    try {
        const lobby = await lobbyService.createLobby(maxPlayers);
        const io = getIO();
        if (io) {
            io.emit('lobbiesUpdated');
        }
        res.status(201).json(lobby)
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create lobby' });
    }
})


router.get('/:id', async (req, res) => { 
    const lobbyID = req.params.id;

    try {
        const lobby = await lobbyService.getLobbyById(lobbyID);
        if (!lobby) {
            return res.status(404).json({ error: 'Lobby not found' });
        }
        return res.json(lobby);
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve lobby' });
    }
})


module.exports = router;