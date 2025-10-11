const { Server } = require('socket.io');

// Store active doctors with heartbeat tracking
const activeDoctors = new Map(); // doctorId -> { socketId, lastHeartbeat, isOnline }
const doctorHeartbeats = new Map(); // doctorId -> timeoutId
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds timeout (longer than 30s heartbeat interval)

// Helper functions for heartbeat management
const setDoctorOnline = (doctorId, socketId) => {
    const now = Date.now();
    activeDoctors.set(doctorId, {
        socketId,
        lastHeartbeat: now,
        isOnline: true
    });
    
    // Clear existing timeout
    if (doctorHeartbeats.has(doctorId)) {
        clearTimeout(doctorHeartbeats.get(doctorId));
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
        setDoctorOffline(doctorId);
    }, HEARTBEAT_TIMEOUT);
    
    doctorHeartbeats.set(doctorId, timeoutId);
};

const setDoctorOffline = (doctorId) => {
    if (activeDoctors.has(doctorId)) {
        activeDoctors.delete(doctorId);
        
        // Clear timeout
        if (doctorHeartbeats.has(doctorId)) {
            clearTimeout(doctorHeartbeats.get(doctorId));
            doctorHeartbeats.delete(doctorId);
        }
        
        // Notify admin panel
        if (global.io) {
            global.io.to('admin-room').emit('doctor-offline', { doctorId });
        }
    }
};

const updateDoctorHeartbeat = (doctorId) => {
    if (activeDoctors.has(doctorId)) {
        const doctorData = activeDoctors.get(doctorId);
        doctorData.lastHeartbeat = Date.now();
        doctorData.isOnline = true;
        activeDoctors.set(doctorId, doctorData);
        
        // Reset timeout
        if (doctorHeartbeats.has(doctorId)) {
            clearTimeout(doctorHeartbeats.get(doctorId));
        }
        
        const timeoutId = setTimeout(() => {
            setDoctorOffline(doctorId);
        }, HEARTBEAT_TIMEOUT);
        
        doctorHeartbeats.set(doctorId, timeoutId);
    }
};

// Socket.IO server setup
const setupSocketServer = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://103.174.51.135:3000',
                'https://doctordekhan.com',
                'https://www.doctordekhan.com'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
    });

    // Basic connection handling
    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.id}`);

        // Handle doctor activity (heartbeat)
        socket.on('doctor-heartbeat', (data) => {
            const { doctorId } = data;
            if (doctorId) {
                if (activeDoctors.has(doctorId)) {
                    // Update existing doctor heartbeat
                    updateDoctorHeartbeat(doctorId);
                } else {
                    // New doctor coming online
                    setDoctorOnline(doctorId, socket.id);
                    socket.join(`doctor-${doctorId}`);
                    
                    // Notify admin panel
                    io.to('admin-room').emit('doctor-online', { doctorId });
                }
            }
        });

        // Handle admin room join (for receiving doctor status updates)
        socket.on('join-admin-room', () => {
            socket.join('admin-room');
            
            // Send current active doctors list to admin
            const onlineDoctors = Array.from(activeDoctors.keys());
            socket.emit('active-doctors-list', { doctors: onlineDoctors });
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
            // Note: We don't immediately set doctors offline on disconnect
            // They will be marked offline after 30 seconds of no heartbeat
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`🔌 Socket error for ${socket.id}:`, error);
        });
    });

    // Make functions available globally
    global.getActiveDoctors = () => Array.from(activeDoctors.keys());
    global.isDoctorOnline = (doctorId) => activeDoctors.has(doctorId);
    global.getActiveDoctorsCount = () => activeDoctors.size;
    global.updateDoctorHeartbeat = updateDoctorHeartbeat;
    global.setDoctorOnline = setDoctorOnline;
    global.setDoctorOffline = setDoctorOffline;

    return io;
};

module.exports = { setupSocketServer };
