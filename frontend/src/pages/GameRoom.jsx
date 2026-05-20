import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import socket from '../socket'

function GameRoom() {
    const { id: lobbyId } = useParams()
    const { state } = useLocation()
    const username = state?.username || 'Anonymous'

    const [phase, setPhase] = useState('waiting')
    const [players, setPlayers] = useState([])
    const [readyCount, setReadyCount] = useState(0)
    const [word, setWord] = useState('')
    const [answer, setAnswer] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [timeLeft, setTimeLeft] = useState(30)
    const [results, setResults] = useState([])
    const [round, setRound] = useState(0)
    const [totalRounds, setTotalRounds] = useState(5)
    const [gameOverCountdown, setGameOverCountdown] = useState(10)

    const countdownRef = useRef(null)

    // join lobby on mount then immediately sync full state
    useEffect(() => {
        socket.emit('joinLobby', { lobbyId: parseInt(lobbyId), username })
        socket.emit('getLobbyState', { lobbyId: parseInt(lobbyId) })
    }, [])

    // socket events
    useEffect(() => {
        socket.on('gameState', (data) => {
            setPlayers(data.players)
            setReadyCount(data.readyCount)
            setRound(data.round)
            if (data.currentWord) setWord(data.currentWord)
            if (data.status === 'playing') setPhase('playing')
        })

        socket.on('playerJoined', (data) => {
            setPlayers(data.players)
        })

        socket.on('playerLeft', (data) => {
            setPlayers(data.players)
        })

        socket.on('playerReady', (data) => {
            setReadyCount(data.readyCount)
        })

        socket.on('gameStart', (data) => {
            setWord(data.word)
            setRound(data.round)
            setTotalRounds(data.totalRounds)
            setAnswer('')
            setSubmitted(false)
            setTimeLeft(30)
            setPhase('playing')
        })

        socket.on('roundResult', (data) => {
            setResults(data.results)
            setRound(data.round)
            setPhase('result')
        })

        socket.on('nextRound', (data) => {
            setWord(data.word)
            setRound(data.round)
            setAnswer('')
            setSubmitted(false)
            setTimeLeft(30)
            setPhase('playing')
        })

        socket.on('gameEnd', (data) => {
            setResults(data.results)
            setGameOverCountdown(10)
            setPhase('gameOver')
        })

        return () => {
            socket.off('gameState')
            socket.off('playerJoined')
            socket.off('playerLeft')
            socket.off('playerReady')
            socket.off('gameStart')
            socket.off('roundResult')
            socket.off('nextRound')
            socket.off('gameEnd')
        }
    }, [])

    // 30s countdown during playing phase
    useEffect(() => {
        if (phase !== 'playing') return

        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(countdownRef.current)
    }, [phase, word])

    // 10s gameOver countdown then reset to waiting
    useEffect(() => {
        if (phase !== 'gameOver') return

        const interval = setInterval(() => {
            setGameOverCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    setReadyCount(0)
                    setResults([])
                    setPhase('waiting')
                    return 10
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [phase])

    function handleReady() {
        socket.emit('ready', { lobbyId: parseInt(lobbyId) })
    }

    function handleSubmit() {
        socket.emit('submitAnswer', { lobbyId: parseInt(lobbyId), answer })
        setSubmitted(true)
    }

    if (phase === 'waiting') {
        return (
            <div>
                <h2>Lobby #{lobbyId}</h2>
                <p>Players ready: {readyCount}/{players.length}</p>
                <ul>
                    {players.map(p => <li key={p.socketId}>{p.username}</li>)}
                </ul>
                <button onClick={handleReady}>Ready</button>
            </div>
        )
    }

    if (phase === 'playing') {
        return (
            <div>
                <p>Round {round}/{totalRounds}</p>
                <p>Time: {timeLeft}s</p>
                <h2>{word}</h2>
                <input
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
                    placeholder="Your answer"
                    disabled={submitted}
                />
                <button onClick={handleSubmit} disabled={submitted}>
                    {submitted ? 'Submitted' : 'Submit'}
                </button>
            </div>
        )
    }

    if (phase === 'result') {
        return (
            <div>
                <h2>Round {round} Results</h2>
                <p>Word: <strong>{word}</strong></p>
                {results.map(r => (
                    <div key={r.username}>
                        <span>{r.username}</span>
                        <span>{r.answer || '(no answer)'}</span>
                        <span>+{r.points} pts</span>
                        <span>Total: {r.totalScore}</span>
                    </div>
                ))}
            </div>
        )
    }

    if (phase === 'gameOver') {
        const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore)
        return (
            <div>
                <h2>Game Over</h2>
                <p>Winner: {sorted[0]?.username}</p>
                {sorted.map((r, i) => (
                    <div key={r.username}>
                        <span>#{i + 1} {r.username}</span>
                        <span>{r.totalScore} pts</span>
                    </div>
                ))}
                <p>Back to lobby in {gameOverCountdown}s</p>
            </div>
        )
    }
}

export default GameRoom
