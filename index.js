const app = require('./src/app');
const { createServer } = require('http');
const { setupSocketServer } = require('./src/socket/socketServer');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Setup Socket.IO
const io = setupSocketServer(server);

// Make io available globally for use in other modules
global.io = io;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 Socket.IO server ready`);
});
