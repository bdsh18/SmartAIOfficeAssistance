import { users, tasks, meetings, announcements, documents, chatMessages } from "@shared/schema";
import type { User, InsertUser, Task, InsertTask, Meeting, InsertMeeting, Announcement, InsertAnnouncement, Document, InsertDocument, ChatMessage, InsertChatMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task Methods
  getTasks(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, status: string): Promise<Task | undefined>;
  
  // Meeting Methods
  getMeetings(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  
  // Announcement Methods
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Document Methods
  getDocuments(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Chat Message Methods
  getChatMessages(userId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Session Store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private meetings: Map<number, Meeting>;
  private announcements: Map<number, Announcement>;
  private documents: Map<number, Document>;
  private chatMessages: Map<number, ChatMessage>;
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentTaskId: number;
  currentMeetingId: number;
  currentAnnouncementId: number;
  currentDocumentId: number;
  currentChatMessageId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.meetings = new Map();
    this.announcements = new Map();
    this.documents = new Map();
    this.chatMessages = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.currentMeetingId = 1;
    this.currentAnnouncementId = 1;
    this.currentDocumentId = 1;
    this.currentChatMessageId = 1;

    // Initialize with sample data
    this.initSampleData();
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task Methods
  async getTasks(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { ...insertTask, id };
    this.tasks.set(id, task);
    return task;
  }

  async updateTaskStatus(id: number, status: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task) {
      const updatedTask = { ...task, status };
      this.tasks.set(id, updatedTask);
      return updatedTask;
    }
    return undefined;
  }

  // Meeting Methods
  async getMeetings(userId: number): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(
      (meeting) => meeting.userId === userId,
    );
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = this.currentMeetingId++;
    const meeting: Meeting = { ...insertMeeting, id };
    this.meetings.set(id, meeting);
    return meeting;
  }

  // Announcement Methods
  async getAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values());
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const id = this.currentAnnouncementId++;
    const announcement: Announcement = { ...insertAnnouncement, id };
    this.announcements.set(id, announcement);
    return announcement;
  }

  // Document Methods
  async getDocuments(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.userId === userId,
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { ...insertDocument, id };
    this.documents.set(id, document);
    return document;
  }

  // Chat Message Methods
  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(
      (message) => message.userId === userId,
    );
  }

  async createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { ...insertChatMessage, id, timestamp: new Date() };
    this.chatMessages.set(id, message);
    return message;
  }

  // Initialize with sample data
  private initSampleData() {
    // Initialize sample data if needed
  }
}

export const storage = new MemStorage();
