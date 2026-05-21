import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Home() {
    const [username, setUsername] = useState('');
    const [input, setInput] = useState('');
    const [lobbies, setLobbies] = useState([]);
    const navigate = useNavigate();

    async function fetchLobbies() {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/lobbies`);
        const data = await res.json();
        setLobbies(data);
    }

    useEffect(() => {
        if (!username) return;
        fetchLobbies();
        socket.on('lobbiesUpdated', fetchLobbies);
        return () => socket.off('lobbiesUpdated', fetchLobbies);
    }, [username]);

    async function createLobby() {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/lobbies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxPlayers: 2 })
        });
        const lobby = await res.json();
        navigate(`/room/${lobby.id}`, { state: { username } });
    }

    function joinLobby(lobbyId) {
        navigate(`/room/${lobbyId}`, { state: { username } });
    }

    // Screen 1 — enter username
    if (!username) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-white tracking-tight">
                            Word<span className="text-violet-400">Duel</span>
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">guess what others are thinking</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <input
                            className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && input.trim() && setUsername(input.trim())}
                            placeholder="Enter your username"
                            maxLength={20}
                        />
                        <button
                            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                            onClick={() => setUsername(input.trim())}
                            disabled={!input.trim()}
                        >
                            Play
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Screen 2 — lobby dashboard
    return (
        <div className="min-h-screen bg-slate-900 text-white">

            {/* Header */}
            <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">
                    Word<span className="text-violet-400">Duel</span>
                </h1>
                <span className="text-slate-400 text-sm">
                    Playing as <span className="text-white font-medium">{username}</span>
                </span>
            </div>

            <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-6">

                {/* Create lobby */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Lobbies</h2>
                    <button
                        className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                        onClick={createLobby}
                    >
                        + Create Lobby
                    </button>
                </div>

                {/* Lobby list */}
                <div className="flex flex-col gap-3">
                    {lobbies.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-8">
                            No lobbies yet — create one to get started.
                        </p>
                    )}

                    {lobbies.map(lobby => {
                        const isFull = lobby.currentPlayers >= lobby.max_players;
                        const isPlaying = lobby.status === 'playing';
                        const canJoin = !isFull && !isPlaying;

                        return (
                            <div
                                key={lobby.id}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-white font-medium">Lobby #{lobby.id}</span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        isPlaying
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-green-500/20 text-green-400'
                                    }`}>
                                        {lobby.status}
                                    </span>
                                    <span className="text-slate-400 text-sm">
                                        {lobby.currentPlayers}/{lobby.max_players} players
                                    </span>
                                </div>

                                <button
                                    className="text-sm font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700"
                                    onClick={() => joinLobby(lobby.id)}
                                    disabled={!canJoin}
                                >
                                    {isFull ? 'Full' : isPlaying ? 'In Progress' : 'Join'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default Home;
