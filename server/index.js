const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const OpenAI = require("openai");
require("dotenv").config();

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let users = []; // In-memory user store

let activities = [];

let invitations = []; // New in-memory invitations store

app.post("/api/search-activities", async (req, res) => {
  const { query, activities: activitiesData } = req.body;

  if (!query || !activitiesData) {
    return res
      .status(400)
      .json({ message: "Query and activities data are required." });
  }

  const formattedActivities = activitiesData.map((activity) => {
    return {
      id: activity.id,
      title: activity.title || activity.type,
      location: activity.location || "N/A",
      time: activity.createdAt || "N/A",
      creator_name: activity.creator?.fullName || "Unknown Creator",
      max_participants: activity.maxParticipants || 0,
      activity_type: activity.type || "Unknown",
      privacy: activity.isPrivate ? "private" : "public",
    };
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that identifies the most relevant activity IDs from the list. Consider the following activity attributes for relevance: 'id', 'title', 'location', 'time', 'creator_name', 'max_participants', 'activity_type', and 'privacy'. Return only a comma-separated list of matching activity IDs, or 'none' if there are no matches. Do not include any explanations or extra text.",
        },
        {
          role: "user",
          content: `Given the user query: "${query}", and the following activities: ${JSON.stringify(
            formattedActivities
          )}. Based on the user's query, identify the most relevant activity IDs from the provided list.`,
        },
      ],
      max_tokens: 100,
    });

    const gptResponse = completion.choices[0].message.content.trim();
    console.log("GPT Response:", gptResponse);

    if (gptResponse.toLowerCase() === "none" || gptResponse.trim() === "") {
      return res.json({ relevantActivityIds: [] });
    }

    const relevantIds = gptResponse.split(",").map((id) => id.trim());
    return res.json({ relevantActivityIds: relevantIds });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return res.status(500).json({ message: "Error processing search query." });
  }
});

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
        ? {
            ...updatedActivity,
            createdAt: updatedActivity.createdAt,
            isPrivate: updatedActivity.isPrivate,
          }
        : activity
    );
    io.emit("activities", activities);
  });

  socket.on("createActivity", (activityData) => {
    const newActivity = {
      id: Date.now().toString(),
      type: activityData.type,
      activityName: activityData.activityName,
      location: activityData.location || "N/A",
      createdAt: activityData.when,
      maxParticipants: activityData.maxParticipants,
      creator: { id: activityData.userId, fullName: activityData.fullName },
      participants: [activityData.fullName],
      isPrivate: activityData.isPrivate || false,
      title: activityData.activityName || activityData.type,
      description: `${activityData.location || "N/A"} ${activityData.when} ${
        activityData.fullName
      } ${activityData.maxParticipants} ${activityData.type} ${
        activityData.isPrivate ? "private" : "public"
      }`,
    };
    activities.push(newActivity);
    io.emit("activities", activities);
  });

  socket.on("fetchActivities", () => {
    socket.emit("activities", activities);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);
