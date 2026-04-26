import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GameRoom from './pages/GameRoom.jsx'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:id" element={<GameRoom />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App