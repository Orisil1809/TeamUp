const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = []; // In-memory user store

let activities = [];

let invitations = []; // New in-memory invitations store

app.post("/api/invite", (req, res) => {
  const { activityId, invitedUserName, invitedByUserId } = req.body;

  const invitedUser = users.find((user) => user.fullName === invitedUserName);

  if (invitedUser) {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found." });
    }

    // Check if invitation already exists to prevent duplicates
    const existingInvitation = invitations.find(
      (inv) =>
        inv.activityId === activityId &&
        inv.invitedUserName === invitedUserName &&
        inv.invitedByUserId === invitedByUserId
    );

    if (existingInvitation) {
      return res.status(409).json({
        message: `${invitedUserName} has already been invited to ${activity.type}.`,
      });
    }

    const newInvitation = {
      activityId,
      invitedUserName,
      invitedByUserId,
      status: "pending",
    };
    invitations.push(newInvitation);

    // Optionally, notify the invited user via socket.io if they are connected
    // For now, just a console log
    console.log(
      `Invitation created: ${invitedUserName} to ${activity.type} by ${invitedByUserId}`
    );

    return res.status(200).json({
      message: `${invitedUserName} has been invited to ${activity.type}.`,
    });
  } else {
    return res
      .status(404)
      .json({ message: `No user named ${invitedUserName} found.` });
  }
});

app.get("/api/invitations", (req, res) => {
  const { userName } = req.query;
  if (!userName) {
    return res
      .status(400)
      .json({ message: "userName query parameter is required." });
  }

  const userInvitations = invitations
    .filter(
      (inv) => inv.invitedUserName === userName && inv.status === "pending"
    )
    .map((inv) => {
      const inviter = users.find((u) => u.id === inv.invitedByUserId);
      const activity = activities.find((a) => a.id === inv.activityId); // Get activity details
      return {
        ...inv,
        invitedByFullName: inviter ? inviter.fullName : "Unknown User",
        activityLocation: activity ? activity.location : "N/A", // Add activity location
        activityWhen: activity ? activity.createdAt : "N/A", // Add activity when/createdAt
      };
    });
  console.log(
    `Found ${userInvitations.length} pending invitations for ${userName}:`,
    userInvitations
  );
  return res.status(200).json(userInvitations);
});

app.post("/api/invitations/accept", (req, res) => {
  const { activityId, invitedUserName } = req.body;
  const invitation = invitations.find(
    (inv) =>
      inv.activityId === activityId && inv.invitedUserName === invitedUserName
  );

  if (invitation) {
    invitation.status = "accepted";
    // Optionally, automatically join the user to the activity upon acceptance
    const activity = activities.find((a) => a.id === activityId);
    if (activity && !activity.participants.includes(invitedUserName)) {
      activity.participants.push(invitedUserName);
      io.emit("activities", activities); // Notify all clients of activity update
    }
    return res.status(200).json({ message: "Invitation accepted." });
  } else {
    return res.status(404).json({ message: "Invitation not found." });
  }
});

app.post("/api/invitations/decline", (req, res) => {
  const { activityId, invitedUserName } = req.body;
  const invitation = invitations.find(
    (inv) =>
      inv.activityId === activityId && inv.invitedUserName === invitedUserName
  );

  if (invitation) {
    invitation.status = "declined";
    return res.status(200).json({ message: "Invitation declined." });
  } else {
    return res.status(404).json({ message: "Invitation not found." });
  }
});

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
