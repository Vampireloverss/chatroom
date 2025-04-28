const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Secret codes
const validCodes = ['vampire', 'seventhson'];

// Load saved messages
let messages = [];
const messagesFile = path.join(__dirname, 'messages.json');
if (fs.existsSync(messagesFile)) {
  messages = JSON.parse(fs.readFileSync(messagesFile, 'utf-8'));
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/chat', (req, res) => {
  const code = req.query.code;
  if (!validCodes.includes(code)) {
    return res.status(403).send('Invalid secret code.');
  }
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Color generator
const userColors = {};

function getRandomColor() {
  const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Chat
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.emit('allMessages', messages);

  socket.on('newMessage', (msg) => {
    const nickname = msg.nickname || 'Anonymous';
    if (!userColors[nickname]) {
      userColors[nickname] = getRandomColor();
    }

    const formattedMsg = {
      nickname: nickname,
      message: msg.message || '',
      time: msg.time || new Date().toLocaleTimeString(),
      color: userColors[nickname]
    };

    messages.push(formattedMsg);
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

    io.emit('message', formattedMsg);
  });

  socket.on('typing', (nickname) => {
    socket.broadcast.emit('typing', nickname);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
