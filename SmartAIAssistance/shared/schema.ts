import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  assignee: text("assignee"),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  duration: integer("duration").notNull(),
  location: text("location"),
  color: text("color").default("primary"),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  authorRole: text("author_role"),
  authorAvatar: text("author_avatar"),
  timestamp: text("timestamp").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  lastUpdated: text("last_updated"),
  sharedBy: text("shared_by"),
  icon: text("icon").default("description"),
  iconBg: text("icon_bg").default("primary-50"),
  iconColor: text("icon_color").default("primary-500"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  avatar: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  userId: true,
  title: true,
  description: true,
  dueDate: true,
  status: true,
  priority: true,
  assignee: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  userId: true,
  title: true,
  startTime: true,
  duration: true,
  location: true,
  color: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  title: true,
  content: true,
  author: true,
  authorRole: true,
  authorAvatar: true,
  timestamp: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  title: true,
  type: true,
  lastUpdated: true,
  sharedBy: true,
  icon: true,
  iconBg: true,
  iconColor: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  isUser: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
