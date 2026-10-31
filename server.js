
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Servir los archivos del juego desde la carpeta del proyecto.
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const players = new Map();

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
