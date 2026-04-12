const express = require('express');
const lobbyService = require("../services/lobbyService.js");

const router = express.Router();

router.get('/', async (req, res) => {
     try {
        const lobbies = await lobbyService.getAllLobbies();
        res.json(lobbies);
     } 
     catch (err) {
        res.status(500).json({ error: 'Failed to retrieve lobbies' });
     }
})


router.post('/', async (req, res) => {

    if (!req.body.maxPlayers || !req.body.maxRounds) {  // check first
        return res.status(400).json({ error: 'maxPlayers and maxRounds are required' });
    }

    const maxPlayers = req.body.maxPlayers;
    const maxRounds = req.body.maxRounds;

    if (maxPlayers < 2 || maxPlayers > 5 || maxRounds > 10 || maxRounds <= 0) {
        return res.status(400).json({ error: 'Invalid maxPlayers or maxRounds value' });
    }


    try {
        const lobby = await lobbyService.createLobby(maxPlayers, maxRounds);
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