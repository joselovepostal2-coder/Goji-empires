
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const players = new Map();

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Goji Empires Online</title>
    </head>
    <body style="background:#10131b;color:white;font-family:Arial;text-align:center;padding:30px">
      <h1>🐲 GOJI EMPIRES ONLINE</h1>
      <p>Prototipo de servidor multijugador</p>
      <p id="status">Conectando...</p>
      <p id="count">Jugadores conectados: 0</p>
      <div id="players"></div>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const status = document.getElementById("status");
        const count = document.getElementById("count");
        const list = document.getElementById("players");

        socket.on("connect", () => {
          status.textContent = "Conectado al servidor";
        });

        socket.on("disconnect", () => {
          status.textContent = "Desconectado. Reconectando...";
        });

        socket.on("players", (players) => {
          count.textContent = "Jugadores conectados: " + players.length;
          list.replaceChildren();

          players.forEach((player, index) => {
            const item = document.createElement("p");
            item.textContent = "Jugador " + (index + 1) +
              " — " + player.id.slice(0, 6);
            list.appendChild(item);
          });
        });
      </script>
    </body>
    </html>
  `);
});

io.on("connection", (socket) => {
  players.set(socket.id, { id: socket.id });

  console.log("Jugador conectado:", socket.id);
  io.emit("players", Array.from(players.values()));

  socket.on("disconnect", () => {
    players.delete(socket.id);
    console.log("Jugador desconectado:", socket.id);
    io.emit("players", Array.from(players.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Goji Empires Online iniciado en el puerto " + PORT);
});
