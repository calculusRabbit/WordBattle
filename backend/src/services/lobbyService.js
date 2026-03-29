const db = require("../config/db.js");


async function getAllLobbies() {
    const result = await db.query(
        "SELECT * FROM lobbies ORDER BY id DESC"
    );
    return result.rows;
}


async function createLobby(maxPlayers = 2) {
    const result = await db.query(
        "INSERT INTO lobbies (max_players) VALUES ($1) RETURNING *",
        [maxPlayers]
    );
    return result.rows[0];
}


async function getLobbyById(lobbyId) {
    const result = await db.query(
        "SELECT * FROM lobbies WHERE id = $1", [lobbyId]
    );
    return result.rows[0];
}


async function updateLobbyStatus(lobbyId, status) {
    const result = await db.query(
        "UPDATE lobbies SET status = $1 WHERE id = $2 RETURNING *",
        [status, lobbyId]
    );
    return result.rows[0];
}


async function deleteLobby(lobbyId) {
    await db.query(
        "DELETE FROM lobbies WHERE id = $1",
        [lobbyId]
    )
}

module.exports = {
    getAllLobbies,
    createLobby,
    getLobbyById,
    updateLobbyStatus,
    deleteLobby
}