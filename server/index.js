const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let activities = [
  {
    id: "1",
    type: "Carpool",
    location: "Petah Tikva",
    createdAt: "3 hours ago",
    participants: ["ED"],
    maxParticipants: 4,
  },
];

io.on("connection", (socket) => {
  console.log("User connected");
  socket.emit("activities", activities);

  socket.on("joinActivity", (id) => {
    const activity = activities.find((a) => a.id === id);
    if (activity && activity.participants.length < activity.maxParticipants) {
      activity.participants.push("NewUser"); // mocked user
      io.emit("activities", activities);
    }
  });

  socket.on("createActivity", (activityData) => {
    const newActivity = {
      id: Date.now().toString(),
      type: activityData.type,
      location: activityData.location,
      createdAt: "Just now",
      participants: ["NewUser"], // mocked user
      maxParticipants: activityData.maxParticipants,
    };
    activities.push(newActivity);
    io.emit("activities", activities);
  });
});

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);
