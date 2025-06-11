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

let users = []; // In-memory user store

let activities = [
  {
    id: "1",
    type: "Carpool",
    location: "Petah Tikva",
    createdAt: "3 hours ago",
    participants: ["ED"],
    maxParticipants: 4,
    creator: { id: "mock_id_ed", fullName: "ED" },
  },
  {
    id: "2",
    type: "Beer",
    location: "Local Pub",
    createdAt: "1 hour ago",
    participants: ["NewUser"],
    maxParticipants: 5,
    creator: { id: "mock_id_newuser", fullName: "NewUser" },
  },
  {
    id: "3",
    type: "Icecream",
    location: "Ice Cream Shop",
    createdAt: "30 minutes ago",
    participants: ["NewUser", "AnotherUser"],
    maxParticipants: 3,
    creator: { id: "mock_id_newuser", fullName: "NewUser" },
  },
];

io.on("connection", (socket) => {
  console.log("User connected");
  socket.emit("activities", activities);

  socket.on("signup", ({ fullName, email }) => {
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      socket.emit("signupFailure", "User with this email already exists.");
    } else {
      const newUser = { id: Date.now().toString(), fullName, email };
      users.push(newUser);
      socket.emit("signupSuccess", newUser);
    }
  });

  socket.on("login", ({ fullName, email }) => {
    const user = users.find(
      (user) => user.fullName === fullName && user.email === email
    );
    if (user) {
      socket.emit("loginSuccess", user);
    } else {
      socket.emit("loginFailure", "Invalid full name or email.");
    }
  });

  socket.on("joinActivity", ({ activityId, userId, fullName }) => {
    const activity = activities.find((a) => a.id === activityId);
    if (
      activity &&
      activity.participants.length < activity.maxParticipants &&
      !activity.participants.includes(fullName)
    ) {
      activity.participants.push(fullName);
      io.emit("activities", activities);
    }
  });

  socket.on("leaveActivity", ({ activityId, userId, fullName }) => {
    const activity = activities.find((a) => a.id === activityId);
    if (activity) {
      activity.participants = activity.participants.filter(
        (p) => p !== fullName
      );
      io.emit("activities", activities);
    }
  });

  socket.on("deleteActivity", (activityId) => {
    activities = activities.filter((a) => a.id !== activityId);
    io.emit("activities", activities);
  });

  socket.on("updateActivity", (updatedActivity) => {
    activities = activities.map((activity) =>
      activity.id === updatedActivity.id
        ? { ...updatedActivity, createdAt: updatedActivity.createdAt }
        : activity
    );
    io.emit("activities", activities);
  });

  socket.on("createActivity", (activityData) => {
    const newActivity = {
      id: Date.now().toString(),
      type: activityData.type,
      location: activityData.location,
      createdAt: activityData.when,
      participants: [activityData.fullName], // Participant is the creator
      maxParticipants: activityData.maxParticipants,
      creator: { id: activityData.userId, fullName: activityData.fullName },
    };
    // If the activity type is 'Custom', use activityName for display
    if (activityData.type === "Custom") {
      newActivity.type = activityData.activityName || "Custom Activity";
    }
    activities.push(newActivity);
    io.emit("activities", activities);
  });

  socket.on("fetchActivities", () => {
    socket.emit("activities", activities);
  });
});

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);
