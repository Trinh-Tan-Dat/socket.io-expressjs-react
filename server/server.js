const express = require("express");
const app = express();
const cors = require("cors");
const http = require('http').Server(app);
const socketIO = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});

const PORT = process.env.PORT || 4000;

app.use(cors());

// Dùng một đối tượng để lưu trữ thông tin của các phòng chat
const rooms = {};

socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    // Tham gia phòng chat
    socket.on('joinRoom', ({ username, roomId }) => {
        // Tạo phòng mới nếu nó chưa tồn tại
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        // Thêm người dùng vào phòng
        rooms[roomId].push({ id: socket.id, username });
        socket.join(roomId);
        // Gửi tin nhắn chào mừng cho tất cả thành viên trong phòng
        socketIO.to(roomId).emit('message', { username: 'Admin', message: `${username} has joined the room.` });
        // Gửi danh sách người dùng trong phòng cho tất cả thành viên trong phòng
        socketIO.to(roomId).emit('userList', rooms[roomId]);
    });

    // Gửi tin nhắn trong phòng
    socket.on('sendMessage', ({ roomId, username, message }) => {
        socketIO.to(roomId).emit('message', { username, message });
        console.log('🚀: ', { username, message });
    });


    // Thoát phòng chat
    socket.on('leaveRoom', ({ roomId, username }) => {
        if (rooms[roomId]) {
            // Xóa người dùng khỏi danh sách
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
            // Thông báo cho phòng rằng người dùng đã rời khỏi phòng
            socketIO.to(roomId).emit('message', { username: 'Admin', message: `${username} has left the room.` });
            // Gửi danh sách người dùng cập nhật cho tất cả thành viên trong phòng
            socketIO.to(roomId).emit('userList', rooms[roomId]);
            socket.leave(roomId);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        // Kiểm tra và xóa người dùng khỏi danh sách của phòng nếu có
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
            // Gửi danh sách người dùng cập nhật cho tất cả thành viên trong phòng
            socketIO.to(roomId).emit('userList', rooms[roomId]);
        }
    });
});

app.get("/api", (req, res) => {
    res.json({ message: "Hello" });
});

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
