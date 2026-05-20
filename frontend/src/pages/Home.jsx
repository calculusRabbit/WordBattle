import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../socket'

function Home() {
    const [username, setUsername] = useState('')
    const [input, setInput] = useState('')
    const [lobbies, setLobbies] = useState([])
    const navigate = useNavigate()

    async function fetchLobbies() {
        const res = await fetch('http://localhost:3000/api/lobbies')
        const data = await res.json()
        setLobbies(data)
    }

    useEffect(() => {
        if (!username) return
        fetchLobbies()
        socket.on('lobbiesUpdated', fetchLobbies)
        return () => socket.off('lobbiesUpdated', fetchLobbies)
    }, [username])

    async function createLobby() {
        const res = await fetch('http://localhost:3000/api/lobbies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxPlayers: 2 })
        })
        const lobby = await res.json()
        navigate(`/room/${lobby.id}`, { state: { username } })
    }

    function joinLobby(lobbyId) {
        navigate(`/room/${lobbyId}`, { state: { username } })
    }

    if (!username) {
        return (
            <div>
                <h1>WordDuel</h1>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && input.trim() && setUsername(input.trim())}
                    placeholder="Enter username"
                />
                <button onClick={() => setUsername(input.trim())} disabled={!input.trim()}>
                    Play
                </button>
            </div>
        )
    }

    return (
        <div>
            <h2>Welcome, {username}</h2>
            <button onClick={createLobby}>Create Lobby</button>

            <div>
                {lobbies.length === 0 && <p>No lobbies yet. Create one!</p>}
                {lobbies.map(lobby => (
                    <div key={lobby.id}>
                        <span>Lobby #{lobby.id}</span>
                        <span>{lobby.status}</span>
                        <span>{lobby.currentPlayers}/{lobby.max_players} players</span>
                        <button
                            onClick={() => joinLobby(lobby.id)}
                            disabled={lobby.status !== 'waiting' || lobby.currentPlayers >= lobby.max_players}
                        >
                            Join
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Home
