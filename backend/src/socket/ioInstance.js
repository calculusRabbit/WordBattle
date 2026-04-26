let io = null;

function setIO(ioServer) {
    io = ioServer;
}

function getIO() {
    return io;
}

module.exports = { setIO, getIO };
