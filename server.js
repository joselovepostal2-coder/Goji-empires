
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Estadísticas agregadas de logros. El servidor guarda solo IDs aleatorios de navegador
// y los conjuntos de logros desbloqueados; no recibe nombres, correos ni IP desde el cliente.
app.use(express.json({ limit: "8kb" }));
const achievementPlayers = new Set();
const achievementUnlocks = new Map();
const MAX_ACHIEVEMENT_ID = 300; // 301 logros: índices 0–300
function validAchievementClientId(value) {
  return typeof value === "string" && /^[a-z0-9-]{16,80}$/i.test(value);
}
app.post("/api/achievements/visit", (req, res) => {
  const clientId = req.body && req.body.clientId;
  if (!validAchievementClientId(clientId)) {
    return res.status(400).json({ ok: false, error: "Identificador anónimo inválido." });
  }
  achievementPlayers.add(clientId);
  res.set("Cache-Control", "no-store").json({ ok: true, totalPlayers: achievementPlayers.size });
});
app.post("/api/achievements/unlock", (req, res) => {
  const clientId = req.body && req.body.clientId;
  const achievementId = Number(req.body && req.body.achievementId);
  if (!validAchievementClientId(clientId) ||
      !Number.isInteger(achievementId) ||
      achievementId < 0 || achievementId > MAX_ACHIEVEMENT_ID) {
    return res.status(400).json({ ok: false, error: "Desbloqueo inválido." });
  }
  achievementPlayers.add(clientId);
  if (!achievementUnlocks.has(achievementId)) achievementUnlocks.set(achievementId, new Set());
  achievementUnlocks.get(achievementId).add(clientId);
  res.set("Cache-Control", "no-store").json({ ok: true });
});
app.get("/api/achievements/stats", (_req, res) => {
  const totalPlayers = achievementPlayers.size;
  const achievements = {};
  for (let id = 0; id <= MAX_ACHIEVEMENT_ID; id++) {
    const count = achievementUnlocks.get(id)?.size || 0;
    achievements[id] = {
      count,
      percent: totalPlayers ? Math.round((count / totalPlayers) * 1000) / 10 : 0
    };
  }
  res.set("Cache-Control", "no-store").json({
    totalPlayers,
    achievements,
    scope: "since_server_start",
    persistent: false
  });
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const rooms = new Map();
const playerRooms = new Map();
const ONLINE_MAPS = new Set(["TOKYO RUINS","OSAKA HARBOR","MONTE FUJI","ISLA MONSTRUO","FOSA DEL PACÍFICO","VOLCÁN MIHARA","ÁRTICO DERRETIDO","DESIERTO DE NEVADA","CAVERNAS DE LA TIERRA HUECA","BASE LUNAR","ESTACIÓN ORBITAL","BOSQUE DE AOKIGAHARA","PUERTO DE NUEVA YORK","LAS VEGAS EN RUINAS","GOLDEN GATE","TEMPLO DE MOTHRA","LABORATORIO OXÍGENO","BASE G-FORCE","SKULL ISLAND","CRÁTER DE RODAN","TORMENTA ELÉCTRICA","CIUDAD SUBMARINA","CEMENTERIO DE TITANES","PANTANO TÓXICO","RUINAS DE ATLANTIS","DIMENSIÓN FINAL","METRO TITÁN","PUENTE QUEBRADO","CIUDAD PARTIDA","TORRE DE ACERO","CAÑÓN DE CRISTAL","DISTRITO NEÓN","TEMPLO SUMERGIDO","PLATAFORMA POLAR","NÚCLEO RADIACTIVO","VÍA DEL TREN","FÁBRICA COLOSAL","ISLA DE CENIZA","LABERINTO G-FORCE","BOSQUE GIGANTE","ESTACIÓN EN RUINAS","CRÁTER DE HIELO","CIUDAD DE COBRE","ANILLO DE LAVA","CÚPULA BIOLUMINISCENTE","ASTILLERO MECÁNICO","CATEDRAL DE TITANES","COSTA DEL TSUNAMI","CIUDAD EN GRAVEDAD CERO","PANTANO DE ESPORAS","COLAPSO DIMENSIONAL","SANTA CRUZ, ARGENTINA","PERÚ","TOKYO 1954: ZONA DE EVACUACIÓN","ISLA ROGUE: CRÁTER DE COMBATE","MONTE FUJI: TORMENTA DORADA","INFIERNO VOLCÁNICO: NIDO DE LARVAS","OKINAWA: FORTALEZA MECÁNICA","LABORATORIO BIOARMA: INVERNADERO","FUKUOKA: TORRES DE CRISTAL","TOKYO: ZONA DE ENERGÍA ROJA","TOKYO BAY: MUELLE DE KIRYU","XILIEN: PLATAFORMA DE INVASIÓN","TIERRA HUECA: PUENTE DE BASALTO","NEXO TITÁNICO: ARENA DIMENSIONAL","OSAKA: DISTRITO INDUSTRIAL","MONTE FUJI: VALLE DE LA TORMENTA","SHIZUOKA: COSTA DE LOS HUEVOS","PLANETA X: PLATAFORMA ALIENÍGENA","ISLA LETRA: BASE COSTERA","ISLA SOLGELL: SELVA TROPICAL","LUNA DE MONSTRUOS: BATALLA FINAL","ISLA DE LOS SUEÑOS","TOKYO: ZONA DE CONTAMINACIÓN","PARQUE MONSTRUOSO: TRAMPA ALIENÍGENA","SEATOPIA: CIUDAD SUBTERRÁNEA","OKINAWA: COSTA DEL DRAGÓN","TOKYO: CENTRAL ELÉCTRICA","TOKYO: RUINAS TEMPORALES","YOKOHAMA: SANTUARIO ANTIGUO","KYOTO: HANGAR ANTIMONSTRUOS","FUKUOKA: FORTALEZA CRISTALINA","NEMURO: CRÁTER DEL METEORITO","TOKYO: EXPERIMENTO DIMENSIONAL","TOKYO: SANTUARIO DE LOS GUARDIANES","TOKYO BAY: DEFENSA COSTERA","ANTÁRTIDA: BASE XILIEN","TOKYO: CORREDOR DE EVACUACIÓN","GINZA: CIUDAD EN RECONSTRUCCIÓN","TIERRA FUTURA: RUINAS VEGETALES","MECHAGODZILLA CITY: NÚCLEO","ÓRBITA TERRESTRE: PORTAL DORADO","SAN FRANCISCO: DISTRITO EN RUINAS","BOSTON: TORMENTA TITÁNICA","HONG KONG: RASCACIELOS NEÓN","TIERRA HUECA: TRONO ESCARLATA","TOKYO: ZONA DEL POLVO ROJO","NEXO DE ERAS: ARENA IMPERIAL","ISLA DE DORATS: VUELO DE LOS DORATS","ISLA DE LOS MONSTRUOS: PANTANO DE GABARA","FOSA OCEÁNICA: RUINAS DE GEZORA","COSTA DE CRUSTÁCEOS: ARENA DE GANIMES","TIERRA HUECA: CAVERNA SKULLCRAWLER","CIUDAD CALABAZA","AVENIDA DE LAS SOMBRAS","MANSIÓN DESTRUIDA","BOSQUE DE CUERVOS","PANTANO FANTASMA","CATEDRAL ABANDONADA","METRO EMBRUJADO","PUENTE DE LA NIEBLA","FÁBRICA DE DULCES MALDITOS","PARQUE DE CALABAZAS","PUEBLO SIN LUZ","HOSPITAL ABANDONADO","TORRE DEL RELOJ","MUELLE DE LOS ESPECTROS","LABORATORIO NOCTURNO","CALLEJÓN NEÓN OSCURO","BARRIO EN LLAMAS","CASTILLO DE DESTOROYAH","CRIPTA SUBTERRÁNEA","FERIA MALDITA","BOSQUE DE ESPANTAPÁJAROS","AZOTEA DE LUNA ROJA","CIUDAD EN EVACUACIÓN","CARRETERA QUEBRADA","PLAZA DE LAS TUMBAS","CEMENTERIO DE MECHAS","DISTRITO DE NIEBLA","ÚLTIMA AVENIDA","CIUDAD: NOCHE DE HALLOWEEN","001 · TOKYO — LLUVIA DE METEORITOS","002 · LUNA — PLATAFORMAS FLOTANTES","003 · AOKIGAHARA — RUINAS EN CAPAS","004 · OSAKA — NÚCLEO DE ENERGÍA","005 · ATLANTIS — TEMPORAL ELÉCTRICO","006 · MEGALÓPOLIS — CRÁTERES LUMINOSOS","007 · ISLA — FALLA SÍSMICA","008 · G-FORCE — TEMPORAL ELÉCTRICO","009 · PACÍFICO — CRÁTERES LUMINOSOS","010 · ABISMO — FALLA SÍSMICA","011 · TIERRA HUECA — PUENTE FRACTURABLE","012 · DIMENSIÓN X — CIELO DE CENIZA","013 · VOLCÁN — TORMENTA DE NIEVE","014 · NUEVA YORK — LLUVIA DE METEORITOS","015 · COSTA — CIELO DE CENIZA","016 · ARCTICO — TORMENTA DE NIEVE","017 · SKULL ISLAND — LLUVIA DE METEORITOS","018 · DESIERTO — PLATAFORMAS FLOTANTES","019 · NEVADA — RUINAS EN CAPAS","020 · ORBITAL — NÚCLEO DE ENERGÍA","021 · OSAKA — TEMPORAL ELÉCTRICO","022 · ATLANTIS — RUINAS EN CAPAS","023 · MEGALÓPOLIS — NÚCLEO DE ENERGÍA","024 · ISLA — TEMPORAL ELÉCTRICO","025 · G-FORCE — CRÁTERES LUMINOSOS","026 · PACÍFICO — FALLA SÍSMICA","027 · ABISMO — PUENTE FRACTURABLE","028 · TIERRA HUECA — CIELO DE CENIZA","029 · DIMENSIÓN X — FALLA SÍSMICA","030 · VOLCÁN — PUENTE FRACTURABLE","031 · NUEVA YORK — CIELO DE CENIZA","032 · COSTA — TORMENTA DE NIEVE","033 · ARCTICO — LLUVIA DE METEORITOS","034 · SKULL ISLAND — PLATAFORMAS FLOTANTES","035 · DESIERTO — RUINAS EN CAPAS","036 · NEVADA — LLUVIA DE METEORITOS","037 · ORBITAL — PLATAFORMAS FLOTANTES","038 · TOKYO — RUINAS EN CAPAS","039 · LUNA — NÚCLEO DE ENERGÍA","040 · AOKIGAHARA — TEMPORAL ELÉCTRICO","041 · ISLA — CRÁTERES LUMINOSOS","042 · G-FORCE — FALLA SÍSMICA","043 · PACÍFICO — TEMPORAL ELÉCTRICO","044 · ABISMO — CRÁTERES LUMINOSOS","045 · TIERRA HUECA — FALLA SÍSMICA","046 · DIMENSIÓN X — PUENTE FRACTURABLE","047 · VOLCÁN — CIELO DE CENIZA","048 · NUEVA YORK — TORMENTA DE NIEVE","049 · COSTA — LLUVIA DE METEORITOS","050 · ARCTICO — CIELO DE CENIZA","051 · SKULL ISLAND — TORMENTA DE NIEVE","052 · DESIERTO — LLUVIA DE METEORITOS","053 · NEVADA — PLATAFORMAS FLOTANTES","054 · ORBITAL — RUINAS EN CAPAS","055 · TOKYO — NÚCLEO DE ENERGÍA","056 · LUNA — TEMPORAL ELÉCTRICO","057 · AOKIGAHARA — RUINAS EN CAPAS","058 · OSAKA — NÚCLEO DE ENERGÍA","059 · ATLANTIS — TEMPORAL ELÉCTRICO","060 · MEGALÓPOLIS — CRÁTERES LUMINOSOS","061 · ABISMO — FALLA SÍSMICA","062 · TIERRA HUECA — PUENTE FRACTURABLE","063 · DIMENSIÓN X — CIELO DE CENIZA","064 · VOLCÁN — FALLA SÍSMICA","065 · NUEVA YORK — PUENTE FRACTURABLE","066 · COSTA — CIELO DE CENIZA","067 · ARCTICO — TORMENTA DE NIEVE","068 · SKULL ISLAND — LLUVIA DE METEORITOS","069 · DESIERTO — PLATAFORMAS FLOTANTES","070 · NEVADA — RUINAS EN CAPAS","071 · ORBITAL — LLUVIA DE METEORITOS","072 · TOKYO — PLATAFORMAS FLOTANTES","073 · LUNA — RUINAS EN CAPAS","074 · AOKIGAHARA — NÚCLEO DE ENERGÍA","075 · OSAKA — TEMPORAL ELÉCTRICO","076 · ATLANTIS — CRÁTERES LUMINOSOS","077 · MEGALÓPOLIS — FALLA SÍSMICA","078 · ISLA — TEMPORAL ELÉCTRICO","079 · G-FORCE — CRÁTERES LUMINOSOS","080 · PACÍFICO — FALLA SÍSMICA","081 · VOLCÁN — PUENTE FRACTURABLE","082 · NUEVA YORK — CIELO DE CENIZA","083 · COSTA — TORMENTA DE NIEVE","084 · ARCTICO — LLUVIA DE METEORITOS","085 · SKULL ISLAND — CIELO DE CENIZA","086 · DESIERTO — TORMENTA DE NIEVE","087 · NEVADA — LLUVIA DE METEORITOS","088 · ORBITAL — PLATAFORMAS FLOTANTES","089 · TOKYO — RUINAS EN CAPAS","090 · LUNA — NÚCLEO DE ENERGÍA","091 · AOKIGAHARA — TEMPORAL ELÉCTRICO","092 · OSAKA — RUINAS EN CAPAS","093 · ATLANTIS — NÚCLEO DE ENERGÍA","094 · MEGALÓPOLIS — TEMPORAL ELÉCTRICO","095 · ISLA — CRÁTERES LUMINOSOS","096 · G-FORCE — FALLA SÍSMICA","097 · PACÍFICO — PUENTE FRACTURABLE","098 · ABISMO — CIELO DE CENIZA","099 · TIERRA HUECA — FALLA SÍSMICA","100 · DIMENSIÓN X — PUENTE FRACTURABLE","101 · ARCTICO — CIELO DE CENIZA","102 · SKULL ISLAND — TORMENTA DE NIEVE","103 · DESIERTO — LLUVIA DE METEORITOS","104 · NEVADA — PLATAFORMAS FLOTANTES","105 · ORBITAL — RUINAS EN CAPAS","106 · TOKYO — LLUVIA DE METEORITOS","107 · LUNA — PLATAFORMAS FLOTANTES","108 · AOKIGAHARA — RUINAS EN CAPAS","109 · OSAKA — NÚCLEO DE ENERGÍA","110 · ATLANTIS — TEMPORAL ELÉCTRICO","111 · MEGALÓPOLIS — CRÁTERES LUMINOSOS","112 · ISLA — FALLA SÍSMICA","113 · G-FORCE — TEMPORAL ELÉCTRICO","114 · PACÍFICO — CRÁTERES LUMINOSOS","115 · ABISMO — FALLA SÍSMICA","116 · TIERRA HUECA — PUENTE FRACTURABLE","117 · DIMENSIÓN X — CIELO DE CENIZA","118 · VOLCÁN — TORMENTA DE NIEVE","119 · NUEVA YORK — LLUVIA DE METEORITOS","120 · COSTA — CIELO DE CENIZA","121 · NEVADA — TORMENTA DE NIEVE","122 · ORBITAL — LLUVIA DE METEORITOS","123 · TOKYO — PLATAFORMAS FLOTANTES","124 · LUNA — RUINAS EN CAPAS","125 · AOKIGAHARA — NÚCLEO DE ENERGÍA","126 · OSAKA — TEMPORAL ELÉCTRICO","127 · ATLANTIS — RUINAS EN CAPAS","128 · MEGALÓPOLIS — NÚCLEO DE ENERGÍA","129 · ISLA — TEMPORAL ELÉCTRICO","130 · G-FORCE — CRÁTERES LUMINOSOS","131 · PACÍFICO — FALLA SÍSMICA","132 · ABISMO — PUENTE FRACTURABLE","133 · TIERRA HUECA — CIELO DE CENIZA","134 · DIMENSIÓN X — FALLA SÍSMICA","135 · VOLCÁN — PUENTE FRACTURABLE","136 · NUEVA YORK — CIELO DE CENIZA","137 · COSTA — TORMENTA DE NIEVE","138 · ARCTICO — LLUVIA DE METEORITOS","139 · SKULL ISLAND — PLATAFORMAS FLOTANTES","140 · DESIERTO — RUINAS EN CAPAS","141 · LUNA — LLUVIA DE METEORITOS","142 · AOKIGAHARA — PLATAFORMAS FLOTANTES","143 · OSAKA — RUINAS EN CAPAS","144 · ATLANTIS — NÚCLEO DE ENERGÍA","145 · MEGALÓPOLIS — TEMPORAL ELÉCTRICO","146 · ISLA — CRÁTERES LUMINOSOS","147 · G-FORCE — FALLA SÍSMICA","148 · PACÍFICO — TEMPORAL ELÉCTRICO","149 · ABISMO — CRÁTERES LUMINOSOS","150 · TIERRA HUECA — FALLA SÍSMICA","151 · DIMENSIÓN X — PUENTE FRACTURABLE","152 · VOLCÁN — CIELO DE CENIZA","153 · NUEVA YORK — TORMENTA DE NIEVE","154 · COSTA — LLUVIA DE METEORITOS","155 · ARCTICO — CIELO DE CENIZA","156 · SKULL ISLAND — TORMENTA DE NIEVE","157 · DESIERTO — LLUVIA DE METEORITOS","158 · NEVADA — PLATAFORMAS FLOTANTES","159 · ORBITAL — RUINAS EN CAPAS","160 · TOKYO — NÚCLEO DE ENERGÍA","161 · ATLANTIS — TEMPORAL ELÉCTRICO","162 · MEGALÓPOLIS — RUINAS EN CAPAS","163 · ISLA — NÚCLEO DE ENERGÍA","164 · G-FORCE — TEMPORAL ELÉCTRICO","165 · PACÍFICO — CRÁTERES LUMINOSOS","166 · ABISMO — FALLA SÍSMICA","167 · TIERRA HUECA — PUENTE FRACTURABLE","168 · DIMENSIÓN X — CIELO DE CENIZA","169 · VOLCÁN — FALLA SÍSMICA","170 · NUEVA YORK — PUENTE FRACTURABLE","171 · COSTA — CIELO DE CENIZA","172 · ARCTICO — TORMENTA DE NIEVE","173 · SKULL ISLAND — LLUVIA DE METEORITOS","174 · DESIERTO — PLATAFORMAS FLOTANTES","175 · NEVADA — RUINAS EN CAPAS","176 · ORBITAL — LLUVIA DE METEORITOS","177 · TOKYO — PLATAFORMAS FLOTANTES","178 · LUNA — RUINAS EN CAPAS","179 · AOKIGAHARA — NÚCLEO DE ENERGÍA","180 · OSAKA — TEMPORAL ELÉCTRICO","181 · G-FORCE — CRÁTERES LUMINOSOS","182 · PACÍFICO — FALLA SÍSMICA","183 · ABISMO — TEMPORAL ELÉCTRICO","184 · TIERRA HUECA — CRÁTERES LUMINOSOS","185 · DIMENSIÓN X — FALLA SÍSMICA","186 · VOLCÁN — PUENTE FRACTURABLE","187 · NUEVA YORK — CIELO DE CENIZA","188 · COSTA — TORMENTA DE NIEVE","189 · ARCTICO — LLUVIA DE METEORITOS","190 · SKULL ISLAND — CIELO DE CENIZA","191 · DESIERTO — TORMENTA DE NIEVE","192 · NEVADA — LLUVIA DE METEORITOS","193 · ORBITAL — PLATAFORMAS FLOTANTES","194 · TOKYO — RUINAS EN CAPAS","195 · LUNA — NÚCLEO DE ENERGÍA","196 · AOKIGAHARA — TEMPORAL ELÉCTRICO","197 · OSAKA — RUINAS EN CAPAS","198 · ATLANTIS — NÚCLEO DE ENERGÍA","199 · MEGALÓPOLIS — TEMPORAL ELÉCTRICO","200 · ISLA — CRÁTERES LUMINOSOS"]);

function getRoomInfo(code) {
  const room = rooms.get(code);
  if (!room) return null;

  return {
    code,
    map: room.map,
    mode: room.mode || "normal",
    storyChapterIndex: Number.isInteger(room.storyChapterIndex) ? room.storyChapterIndex : 0,
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
    if (room.hostId === socket.id) {
      room.hostId = room.players.keys().next().value;
      room.map = null;
    }
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
      map: null,
      mode: "normal",
      storyChapterIndex: 0,
      postVotes: new Map()
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

    updateRoom(code);
  });

  socket.on("set-room-map", selectedMap => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) {
      socket.emit("room-action-error", "Solo el anfitrión puede elegir el mapa.");
      return;
    }
    if (typeof selectedMap !== "string" || !ONLINE_MAPS.has(selectedMap)) {
      socket.emit("room-action-error", "Selecciona un mapa integrado válido.");
      return;
    }
    if (room.map !== selectedMap) {
      room.map = selectedMap;
      room.started = false;
      for (const player of room.players.values()) player.ready = false;
    }
    updateRoom(code);
  });

  socket.on("set-room-mode", settings => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) {
      socket.emit("room-action-error", "Solo el anfitrión puede cambiar el modo.");
      return;
    }
    const mode = settings && settings.mode;
    const chapterIndex = Number(settings && settings.storyChapterIndex);
    if (!["normal", "tournament", "story", "waves", "tower", "hardcore", "raid", "survival"].includes(mode)) {
      socket.emit("room-action-error", "Selecciona un modo de juego válido.");
      return;
    }
    if (mode === "story" && (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= 1000)) {
      socket.emit("room-action-error", "Selecciona un capítulo de Historia válido.");
      return;
    }
    const nextChapter = mode === "story" ? chapterIndex : room.storyChapterIndex;
    if (room.mode !== mode || room.storyChapterIndex !== nextChapter) {
      room.mode = mode;
      room.storyChapterIndex = nextChapter;
      room.started = false;
      room.postVotes.clear();
      for (const player of room.players.values()) player.ready = false;
    }
    updateRoom(code);
  });

  socket.on("player-ready", ready => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!player) return;
    if (ready === true && !room.map) {
      socket.emit("room-action-error", "El anfitrión debe elegir un mapa antes de iniciar.");
      return;
    }
    if (ready === true && room.mode === "story" &&
        (!Number.isInteger(room.storyChapterIndex) || room.storyChapterIndex < 0 || room.storyChapterIndex >= 1000)) {
      socket.emit("room-action-error", "El anfitrión debe elegir un capítulo de Historia.");
      return;
    }

    player.ready = ready === true;
    updateRoom(code);

    if (room.players.size === 2 && room.map &&
        (room.mode !== "story" || Number.isInteger(room.storyChapterIndex)) &&
        [...room.players.values()].every(p => p.ready && p.kaiju)) {
      room.started = true;
      room.postVotes.clear();
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

  socket.on("combat-state", state => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room?.started || !state || typeof state !== "object") return;
    const clean = {};
    for (const key of ["x","y","vx","vy","pct","stocks","stun","dead","meter","face"]) {
      const value = Number(state[key]);
      if (Number.isFinite(value)) clean[key] = Math.max(-100000, Math.min(100000, value));
    }
    socket.to(code).emit("remote-combat-state", { playerId: socket.id, state: clean });
  });

  socket.on("online-post-action", action => {
    const code = playerRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room || !room.started || !["rematch", "lobby"].includes(action)) return;

    room.postVotes.set(socket.id, action);
    if (room.postVotes.size < 2) {
      socket.emit("post-action-waiting", action);
      return;
    }

    const votes = [...room.postVotes.values()];
    room.postVotes.clear();
    if (votes[0] !== votes[1]) {
      io.to(code).emit("post-action-conflict");
      return;
    }

    if (action === "rematch") {
      io.to(code).emit("match-rematch", getRoomInfo(code));
      return;
    }

    room.started = false;
    room.map = null;
    for (const player of room.players.values()) {
      player.ready = false;
      player.kaiju = null;
    }
    io.to(code).emit("return-to-lobby", getRoomInfo(code));
    updateRoom(code);
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
