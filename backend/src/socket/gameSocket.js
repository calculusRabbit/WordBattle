const lobbyService = require("../services/lobbyService.js");
const glove = require("../model/glove.js");
const activeGames = require("./gameState.js");

module.exports = function(io) {

    async function endRound(lobbyId) {
        const game = activeGames.get(lobbyId);
        if (!game) return;

        // 1. cancel timer if still running
        if (game.timerId) {
            clearTimeout(game.timerId);
            game.timerId = null;
        }

        // 2. calculate score
        const roundResults = []
        for (let i = 0; i < game.players.length; i++) {
            const thisPlayer = game.players[i];

            const playerAnswer = game.answers[thisPlayer.socketId] || '';
            const similarity = glove.getSimilarity(playerAnswer, game.currentWord);
            const points = similarity ? Math.round(similarity * 100) : 0;

            thisPlayer.score += points;

            roundResults.push({
                username: thisPlayer.username,
                answer: playerAnswer,
                points,
                totalScore: thisPlayer.score
            });
        }

        io.to(`lobby_${lobbyId}`).emit('roundResult', {
            word: game.currentWord,
            results: roundResults,
            round: game.round
        })

        game.timerId = setTimeout(async () => {
            if (game.round >= 5) {
                await endGame(lobbyId, roundResults)
            } else {
                startNextRound(lobbyId)
            }
        }, 8000)

    }

    async function endGame(lobbyId, roundResults) {
        const game = activeGames.get(lobbyId);
        if (!game) return;
        game.status = 'waiting';
        await lobbyService.updateLobbyStatus(lobbyId, 'waiting');
        game.readyPlayers.clear();

        if (game.timerId) {
            clearTimeout(game.timerId);
            game.timerId = null;
        }

        io.to(`lobby_${lobbyId}`).emit('gameEnd', {
            results: roundResults,
            players: game.players
        })

        io.emit('lobbiesUpdated');

        game.players.forEach(p => p.score = 0);
    }

    function startNextRound(lobbyId) {
        const game = activeGames.get(lobbyId);
        if (!game) return;
        game.round += 1;
        game.currentWord = glove.getRandomWord();
        game.answers = {};

        io.to(`lobby_${lobbyId}`).emit('nextRound', {
            word: game.currentWord,
            round: game.round,
            totalRounds: 5
        })

        startRoundTimer(lobbyId);
    }

    function startRoundTimer(lobbyId) {
        const game = activeGames.get(lobbyId);
        if (!game) return;

        game.timerId = setTimeout(async () => {
            const game = activeGames.get(lobbyId);
            if (!game || game.status !== 'playing') return;

            // force empty answer
            game.players.forEach(p => {
                if (game.answers[p.socketId] === undefined) {
                    game.answers[p.socketId] = '';
                }
            })

            await endRound(lobbyId);
        }, 30000)

    }


    io.on('connection', (socket) => {
        console.log(`Player connected: ${socket.id}`);

        socket.on('joinLobby', async (data) => {
            const { lobbyId, username } = data;

            try {
                // 1.check lobby exists
                const lobby = await lobbyService.getLobbyById(lobbyId);
                if (!lobby) {
                    socket.emit('error', {message: 'Lobby not found'});
                    return;
                }

                // 2. check lobby is waiting
                if (lobby.status !== 'waiting') {
                    socket.emit('error', {message: 'Lobby is not available for joining'});
                    return;
                }

                // 3. get or create game state in memory
                if (!activeGames.has(lobbyId)) {
                    activeGames.set(lobbyId, {
                        lobbyId,
                        status: 'waiting',
                        players: [],
                        readyPlayers: new Set(),
                        currentWord: null,
                        round: 0,
                        answers: {},
                        timerId: null
                    });
                }

                const game = activeGames.get(lobbyId);

                // 4. check if lobby is full
                if (game.players.length >= lobby.max_players) {
                    socket.emit('error', {message: 'Lobby is full'});
                    return;
                }

                // duplicate check
                const alreadyJoined = game.players.some(p => p.socketId === socket.id);
                if (alreadyJoined) {
                    return;
                }


                // 5. add player to game state
                game.players.push({
                    username,
                    socketId: socket.id,
                    score: 0
                })

                // 6. join socket.io room
                socket.join(`lobby_${lobbyId}`);

                // 7. tell everyone in lobby someone joined
                io.to(`lobby_${lobbyId}`).emit('playerJoined', {
                    username,
                    players: game.players
                });

                console.log(`${username} joined lobby ${lobbyId}`);
            }
            catch (error) {
                console.error('joinLobby error:', error.message);
                socket.emit('error', {message: 'Failed to join lobby'});
            }
        })

        socket.on('ready', async (data) => {
            const { lobbyId } = data;

            try {
                const game = activeGames.get(lobbyId);
                if (!game) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }

                // 1. add player to readyPlayers Set
                game.readyPlayers.add(socket.id)

                // 2. tell everyone this player is ready
                io.to(`lobby_${lobbyId}`).emit('playerReady', {
                    socketId: socket.id,
                    readyCount: game.readyPlayers.size,
                    totalPlayers: game.players.length
                });

                // 3. check if all players ready and at least 2 players
                const allReady = game.readyPlayers.size === game.players.length;
                const enoughPlayers = (game.players.length >= 2);

                if (allReady && enoughPlayers) {
                    // 4. update DB status to playing
                    await lobbyService.updateLobbyStatus(lobbyId, 'playing');
                    io.emit('lobbiesUpdated');

                    // 5. start first round
                    game.status = 'playing';
                    game.round = 1;
                    game.currentWord = glove.getRandomWord();
                    game.answers = {};
                    game.readyPlayers.clear();

                    // 6. emit gameStart to everyone
                    io.to(`lobby_${lobbyId}`).emit('gameStart', {
                        word: game.currentWord,
                        round: game.round,
                        totalRounds: 5
                    })

                    startRoundTimer(lobbyId);

                    console.log(`Game started in lobby ${lobbyId} - word: ${game.currentWord}`);
                }
            }
            catch (err) {
                console.error('ready error:', err.message);
                socket.emit('error', { message: 'Failed to ready up' });
            }
        })

        socket.on('submitAnswer', async (data) => {
            const { lobbyId, answer } = data;

            try {
                // 1. get game
                const game = activeGames.get(lobbyId);
                if (!game) {
                    socket.emit('error', {message: "Game not found"});
                    return;
                }

                // 2. check game is playing
                if (game.status !== 'playing') {
                    socket.emit('error', {message: 'game is not in progress'});
                    return;
                }

                // 3. check player hasnt already answered
                if (game.answers[socket.id] !== undefined) {
                    socket.emit('error', { message: 'Already answered this round' });
                    return;
                }

                // 4. store answer
                game.answers[socket.id] = answer;

                // 5. check if all player answered
                const allAnswered = game.players.every(p => 
                    game.answers[p.socketId] !== undefined
                )

                if (allAnswered) {
                    await endRound(lobbyId);
                }

            }
            catch (err) {
                console.error('submitAnswer error:', err.message);
                socket.emit('error', { message: 'Failed to submit answer'});
            }

        })

        socket.on('disconnect', () => {
            console.log(`Player disconnected: ${socket.id}`);

            // find which lobby this player was in
            for (const [lobbyId, game] of activeGames) {
                const playerIndex = game.players.findIndex(p => p.socketId === socket.id);

                if (playerIndex === -1) {
                    continue; // player not in this lobby
                }

                const disconnectedPlayer = game.players[playerIndex];

                // remove player from game state
                game.players.splice(playerIndex, 1);
                game.readyPlayers.delete(socket.id);
                console.log(`${disconnectedPlayer.username} left lobby ${lobbyId}`);

                // tell everyoone in lobby palyer left
                io.to(`lobby_${lobbyId}`).emit('playerLeft', {
                    username: disconnectedPlayer.username,
                    players: game.players
                });

                // if no player left then delete lobby
                if (game.players.length === 0) {
                    if (game.timerId) clearTimeout(game.timerId);
                    activeGames.delete(lobbyId);
                    lobbyService.deleteLobby(lobbyId);
                    console.log(`Lobby ${lobbyId} deleted - no players left`);
                    io.emit('lobbiesUpdated');
                }

                break;
            }
        })

        socket.on('getLobbyState', (data) => {
            const { lobbyId } = data;
            const game = activeGames.get(lobbyId);

            if (!game) {
                socket.emit('error', { message: 'game not found' });
                return;
            }

            socket.emit('gameState', {
                players: game.players,
                status: game.status,
                readyCount: game.readyPlayers.size,
                round: game.round,
                currentWord: game.currentWord
            })
        })
    });

}


// lobby = {
//     id: 1,
//     status: 'playing',
//     max_players: 2,
//     created_at: '2026-04-11T03:00:00.000Z'
// }


// game = {
//     lobbyId: 1,
//     status: 'playing',
//     players: [
//         { username: 'Vu',   socketId: 'abc123', score: 0 },
//         { username: 'John', socketId: 'xyz789', score: 74 }
//     ],
//     readyPlayers: Set { 'abc123', 'xyz789' },
//     currentWord: 'coffee',
//     round: 2,
//     answers: {
//         'abc123': 'espresso',   // Vu answered
//         'xyz789': null          // John hasn't answered yet
//     }
// }