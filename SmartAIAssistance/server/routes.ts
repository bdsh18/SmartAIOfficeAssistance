import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateAIResponse, processNaturalLanguageQuery } from "./openai";
import { z } from "zod";
import { insertTaskSchema, insertMeetingSchema, insertChatMessageSchema, insertAnnouncementSchema } from "@shared/schema";
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ storage: multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Specify the directory where files will be uploaded
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname) // Generate unique filenames
  }
})}); // Multer setup


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const tasks = await storage.getTasks(userId);
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      const taskData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const taskId = parseInt(req.params.id);
      const statusSchema = z.object({ status: z.string() });
      const { status } = statusSchema.parse(req.body);

      const updatedTask = await storage.updateTaskStatus(taskId, status);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  // Meetings API
  app.get("/api/meetings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const meetings = await storage.getMeetings(userId);
    res.json(meetings);
  });

  app.post("/api/meetings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      const meetingData = insertMeetingSchema.parse({ ...req.body, userId });
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data" });
    }
  });

  // Announcements API
  app.get("/api/announcements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  });

  app.post("/api/announcements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const user = req.user!;
      console.log("User object:", JSON.stringify(user, null, 2));
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        author: user.username || 'Anonymous',
        authorRole: user.role || 'Employee',
        authorAvatar: user.avatar || '',
        timestamp: new Date().toISOString()
      });

      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(400).json({ message: "Invalid announcement data" });
    }
  });

  // Documents API
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const documents = await storage.getDocuments(userId);
    res.json(documents);
  });

  app.post("/api/documents", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const documentData = {
        userId,
        title: req.body.title,
        type: req.body.type,
        sharedBy: req.body.sharedBy,
        filePath: req.file.path,
        lastUpdated: new Date().toISOString()
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data" });
    }
  });

  // Chat Messages API
  app.get("/api/chat-messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const messages = await storage.getChatMessages(userId);
    res.json(messages);
  });

  app.post("/api/chat-messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      const messageData = insertChatMessageSchema.parse({ ...req.body, userId });

      const userMessage = await storage.createChatMessage(messageData);

      const aiResponse = await generateAIResponse(messageData.content);

      const aiMessageData = {
        userId,
        content: aiResponse,
        isUser: false
      };
      const aiMessage = await storage.createChatMessage(aiMessageData);

      res.status(201).json({ 
        userMessage, 
        aiMessage 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Natural Language Search API
  app.post("/api/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const searchSchema = z.object({ query: z.string() });
      const { query } = searchSchema.parse(req.body);

      const userId = req.user!.id;
      const searchResults = await processNaturalLanguageQuery(query, userId);

      res.json(searchResults);
    } catch (error) {
      res.status(400).json({ message: "Invalid search query" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}