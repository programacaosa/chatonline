const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Inicializando o servidor Express
const app = express();
const server = http.createServer(app);

// Criando o servidor WebSocket
const wss = new WebSocket.Server({ server });

// Armazenar usuários conectados
let users = {}; // Contém os usuários conectados e o WebSocket
let userStatus = {}; // Contém o status de cada usuário (online/offline)

// Servir arquivos estáticos da raiz
app.use(express.static(__dirname));

// Rota para servir o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));  // Serve o arquivo na raiz
});

// Quando um novo WebSocket se conectar
wss.on('connection', (ws) => {
  let currentUser = null;

  // Ao receber uma mensagem do cliente
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'register': 
        // Cadastro de usuário
        currentUser = data.username;
        users[currentUser] = ws;
        userStatus[currentUser] = 'online';  // Definir o status como online
        broadcastUserList();
        ws.send(JSON.stringify({ type: 'info', message: `Usuário ${currentUser} registrado com sucesso!` }));
        break;
      
      case 'private_message':
        // Enviar mensagem privada
        const targetUser = data.target;
        if (users[targetUser]) {
          users[targetUser].send(JSON.stringify({
            type: 'private_message',
            from: currentUser,
            message: data.message
          }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: `Usuário ${targetUser} não encontrado!` }));
        }
        break;

      case 'list_users':
        // Listar usuários conectados
        ws.send(JSON.stringify({
          type: 'user_list',
          users: Object.keys(userStatus).map(user => ({
            username: user,
            status: userStatus[user]
          }))
        }));
        break;

      default:
        break;
    }
  });

  // Quando o WebSocket é fechado
  ws.on('close', () => {
    if (currentUser) {
      delete users[currentUser];
      delete userStatus[currentUser];
      broadcastUserList();
    }
  });
});

// Função para enviar a lista de usuários conectados a todos os clientes
function broadcastUserList() {
  const userList = Object.keys(userStatus).map(user => ({
    username: user,
    status: userStatus[user]
  }));
  
  // Enviar a lista para todos os clientes conectados
  for (const user in users) {
    users[user].send(JSON.stringify({
      type: 'user_list',
      users: userList
    }));
  }
}

// Iniciar o servidor na porta 3000
server.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
