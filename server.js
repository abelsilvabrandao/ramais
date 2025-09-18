// server.js
// Backend básico para status em tempo real usando socket.io

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Exemplo de armazenamento em memória (substitua por banco de dados em produção)
let statusMap = {};

// API REST para atualizar status (caso queira usar fetch/AJAX)
app.post('/api/status', (req, res) => {
  const { userId, status } = req.body;
  statusMap[userId] = status;
  io.emit('statusUpdate', { userId, status }); // Notifica todos os clientes
  res.json({ ok: true });
});

// WebSocket para broadcast
io.on('connection', (socket) => {
  socket.on('updateStatus', ({ userId, status }) => {
    statusMap[userId] = status;
    io.emit('statusUpdate', { userId, status });
  });
  // Envia todos os status atuais ao conectar
  socket.emit('bulkStatus', statusMap);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Socket.io server rodando na porta', PORT);
});
