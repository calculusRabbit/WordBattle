import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';

function GameRoom() {
    const { id: lobbyId } = useParams();
    const { state } = useLocation();
    const username = state?.username || 'Anonymous';

    const [phase, setPhase] = useState('waiting');
    const [players, setPlayers] = useState([]);
    const [readyCount, setReadyCount] = useState(0);
    const [word, setWord] = useState('');
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [results, setResults] = useState([]);
    const [round, setRound] = useState(0);
    const [totalRounds, setTotalRounds] = useState(5);
    const [gameOverCountdown, setGameOverCountdown] = useState(10);

    const countdownRef = useRef(null);

    // join lobby on mount then immediately sync full state
    useEffect(() => {
        socket.emit('joinLobby', { lobbyId: parseInt(lobbyId), username });
        socket.emit('getLobbyState', { lobbyId: parseInt(lobbyId) });
    }, []);

    // socket events
    useEffect(() => {
        socket.on('gameState', (data) => {
            setPlayers(data.players);
            setReadyCount(data.readyCount);
            setRound(data.round);
            if (data.currentWord) setWord(data.currentWord);
            if (data.status === 'playing') setPhase('playing');
        });

        socket.on('playerJoined', (data) => {
            setPlayers(data.players);
        });

        socket.on('playerLeft', (data) => {
            setPlayers(data.players);
        });

        socket.on('playerReady', (data) => {
            setReadyCount(data.readyCount);
        });

        socket.on('gameStart', (data) => {
            setWord(data.word);
            setRound(data.round);
            setTotalRounds(data.totalRounds);
            setAnswer('');
            setSubmitted(false);
            setTimeLeft(30);
            setPhase('playing');
        });

        socket.on('roundResult', (data) => {
            setResults(data.results);
            setRound(data.round);
            setPhase('result');
        });

        socket.on('nextRound', (data) => {
            setWord(data.word);
            setRound(data.round);
            setAnswer('');
            setSubmitted(false);
            setTimeLeft(30);
            setPhase('playing');
        });

        socket.on('gameEnd', (data) => {
            setResults(data.results);
            setGameOverCountdown(10);
            setPhase('gameOver');
        });

        return () => {
            socket.off('gameState');
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('playerReady');
            socket.off('gameStart');
            socket.off('roundResult');
            socket.off('nextRound');
            socket.off('gameEnd');
        };
    }, []);

    // 30s countdown during playing phase
    useEffect(() => {
        if (phase !== 'playing') return;

        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownRef.current);
    }, [phase, word]);

    // 10s gameOver countdown then reset to waiting
    useEffect(() => {
        if (phase !== 'gameOver') return;

        const interval = setInterval(() => {
            setGameOverCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setReadyCount(0);
                    setResults([]);
                    setPhase('waiting');
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [phase]);

    function handleReady() {
        socket.emit('ready', { lobbyId: parseInt(lobbyId) });
    }

    function handleSubmit() {
        socket.emit('submitAnswer', { lobbyId: parseInt(lobbyId), answer });
        setSubmitted(true);
    }

    const timerColor = timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400';

    // ── Waiting phase ──────────────────────────────────────────────
    if (phase === 'waiting') {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-sm flex flex-col gap-6">

                    <div>
                        <h2 className="text-xl font-bold text-white">Lobby #{lobbyId}</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {readyCount}/{players.length} players ready
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {players.map(p => (
                            <div key={p.socketId} className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                <span className="text-slate-300">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-lg transition"
                        onClick={handleReady}
                    >
                        Ready
                    </button>

                    <p className="text-slate-500 text-xs text-center">
                        Game starts when all players are ready (min 2)
                    </p>
                </div>
            </div>
        );
    }

    // ── Playing phase ──────────────────────────────────────────────
    if (phase === 'playing') {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-sm flex flex-col gap-6">

                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Round {round}/{totalRounds}</span>
                        <span className={`text-2xl font-bold tabular-nums ${timerColor}`}>
                            {timeLeft}s
                        </span>
                    </div>

                    <div className="text-center py-4">
                        <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">word</p>
                        <h2 className="text-4xl font-bold text-white tracking-tight">{word}</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                        <input
                            className="w-full bg-slate-900 text-white placeholder-slate-600 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition disabled:opacity-40"
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
                            placeholder="What comes to mind?"
                            disabled={submitted}
                            autoFocus
                        />
                        <button
                            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                            onClick={handleSubmit}
                            disabled={submitted}
                        >
                            {submitted ? 'Waiting for others...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Result phase ───────────────────────────────────────────────
    if (phase === 'result') {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-sm flex flex-col gap-6">

                    <div>
                        <p className="text-slate-400 text-sm">Round {round} Results</p>
                        <h2 className="text-2xl font-bold text-white mt-1">
                            "{word}"
                        </h2>
                    </div>

                    <div className="flex flex-col gap-2">
                        {results
                            .sort((a, b) => b.points - a.points)
                            .map((r, i) => (
                                <div key={r.username} className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 text-xs w-4">#{i + 1}</span>
                                        <div>
                                            <p className="text-white text-sm font-medium">{r.username}</p>
                                            <p className="text-slate-500 text-xs">{r.answer || '(no answer)'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-violet-400 font-bold text-sm">+{r.points}</p>
                                        <p className="text-slate-500 text-xs">{r.totalScore} total</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <p className="text-slate-500 text-xs text-center">Next round starting soon...</p>
                </div>
            </div>
        );
    }

    // ── Game over phase ────────────────────────────────────────────
    if (phase === 'gameOver') {
        const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-sm flex flex-col gap-6">

                    <div className="text-center">
                        <p className="text-slate-400 text-sm uppercase tracking-widest">Game Over</p>
                        <h2 className="text-2xl font-bold text-white mt-1">{sorted[0]?.username} wins!</h2>
                    </div>

                    <div className="flex flex-col gap-2">
                        {sorted.map((r, i) => (
                            <div
                                key={r.username}
                                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                                    i === 0 ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-bold ${i === 0 ? 'text-violet-400' : 'text-slate-500'}`}>
                                        #{i + 1}
                                    </span>
                                    <span className="text-white text-sm font-medium">{r.username}</span>
                                </div>
                                <span className={`font-bold text-sm ${i === 0 ? 'text-violet-400' : 'text-slate-400'}`}>
                                    {r.totalScore} pts
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="text-slate-500 text-xs text-center">
                        Back to lobby in {gameOverCountdown}s
                    </p>
                </div>
            </div>
        );
    }
}

export default GameRoom;
