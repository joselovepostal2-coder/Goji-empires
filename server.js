
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const rooms = new Map();
const playerRooms = new Map();

function getRoomInfo(code) {
  const room = rooms.get(code);
  if (!room) return null;

  return {
    code,
    map: room.map || "TOKYO",
    players: [...room.players.values()].map(p => ({
      id: p.id,
      kaiju: p.kaiju,
      ready: p.ready
    }))
  };
}

function updateRoom(code) {
  const info = getRoomInfo(code);
  if (info) io.to(code).emit("room-updated", info);
}

function leaveRoom(socket) {
  const code = playerRooms.get(socket.id);
  if (!code) return;

  playerRooms.delete(socket.id);
  socket.leave(code);

  const room = rooms.get(code);
  if (!room) return;

  room.players.delete(socket.id);

  if (!room.players.size) {
    rooms.delete(code);
  } else {
    room.started = false;
    for (const player of room.players.values()) player.ready = false;
    updateRoom(code);
  }
}

io.on("connection", socket => {
  console.log("Cliente conectado:", socket.id);

  socket.on("create-room", callback => {
    if (playerRooms.has(socket.id)) leaveRoom(socket);

    let code;
    do {
      code = crypto.randomBytes(3).toString("hex").toUpperCase();
    } while (rooms.has(code));

    const room = {
      players: new Map(),
      started: false,
      hostId: socket.id,
      map: "TOKYO"
    };

    room.players.set(socket.id, {
      id: socket.id,
      kaiju: null,
      ready: false
    });

    rooms.set(code, room);
    playerRooms.set(socket.id, code);
    socket.join(code);

    if (typeof callback === "function") {
      callback({ ok: true, code, room: getRoomInfo(code) });
    }
    updateRoom(code);
  });

  socket.on("join-room", (rawCode, callback) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (typeof callback === "function")
        callback({ ok: false, error: "Sala inexistente." });
      return;
    }

    if (room.players.size >= 2) {
      if (typeof callback === "function")
        callback({ ok: false, error: "Sala llena." });
      return;
    }

    if (playerRooms.has(socket.id)) leaveRoom(socket);

    room.players.set(socket.id, {
      id: socket.id,
      kaiju: null,
      ready: false
    });

    playerRooms.set(socket.id, code);
    socket.join(code);

    if (typeof callback === "function") {
      callback({ ok: true, code, room: getRoomInfo(code) });
    }
    updateRoom(code);
  });

  socket.on("select-kaiju", selection => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    const payload = typeof selection === "string"
      ? { kaiju: selection }
      : (selection && typeof selection === "object" ? selection : {});
    if (!player || typeof payload.kaiju !== "string") return;

    player.kaiju = payload.kaiju.slice(0, 60);
    player.ready = false;

    // El mapa de la sala lo decide el anfitrión.
    if (socket.id === room.hostId &&
        new Set(["TOKYO RUINS","OSAKA HARBOR","MONTE FUJI","ISLA MONSTRUO","FOSA DEL PACÍFICO","VOLCÁN MIHARA","ÁRTICO DERRETIDO","DESIERTO DE NEVADA","CAVERNAS DE LA TIERRA HUECA","BASE LUNAR","ESTACIÓN ORBITAL","BOSQUE DE AOKIGAHARA","PUERTO DE NUEVA YORK","LAS VEGAS EN RUINAS","GOLDEN GATE","TEMPLO DE MOTHRA","LABORATORIO OXÍGENO","BASE G-FORCE","SKULL ISLAND","CRÁTER DE RODAN","TORMENTA ELÉCTRICA","CIUDAD SUBMARINA","CEMENTERIO DE TITANES","PANTANO TÓXICO","RUINAS DE ATLANTIS","DIMENSIÓN FINAL","METRO TITÁN","PUENTE QUEBRADO","CIUDAD PARTIDA","TORRE DE ACERO","CAÑÓN DE CRISTAL","DISTRITO NEÓN","TEMPLO SUMERGIDO","PLATAFORMA POLAR","NÚCLEO RADIACTIVO","VÍA DEL TREN","FÁBRICA COLOSAL","ISLA DE CENIZA","LABERINTO G-FORCE","BOSQUE GIGANTE","ESTACIÓN EN RUINAS","CRÁTER DE HIELO","CIUDAD DE COBRE","ANILLO DE LAVA","CÚPULA BIOLUMINISCENTE","ASTILLERO MECÁNICO","CATEDRAL DE TITANES","COSTA DEL TSUNAMI","CIUDAD EN GRAVEDAD CERO","PANTANO DE ESPORAS","COLAPSO DIMENSIONAL"]).has(payload.map)) {
      room.map = payload.map;
    }

    updateRoom(code);
  });

  socket.on("player-ready", ready => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!player) return;

    player.ready = ready === true;
    updateRoom(code);

    if (room.players.size === 2 &&
        [...room.players.values()].every(p => p.ready && p.kaiju)) {
      room.started = true;
      io.to(code).emit("match-start", getRoomInfo(code));
    }
  });

  socket.on("game-state", state => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room?.started || !state || typeof state !== "object") return;

    socket.to(code).emit("remote-game-state", {
      playerId: socket.id,
      state
    });
  });

  socket.on("leave-room", () => leaveRoom(socket));

  socket.on("disconnect", () => {
    leaveRoom(socket);
    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Goji Empires Online activo en puerto " + PORT);
});
