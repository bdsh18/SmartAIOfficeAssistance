import OpenAI from "openai";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-development' 
});

export async function generateAIResponse(userMessage: string): Promise<string> {
  try {
    // Check if the API key is available and valid
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy-key-for-development') {
      console.log("Using fallback response - no valid API key");
      return generateFallbackResponse(userMessage);
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI workplace assistant named Office Assistant. You help employees with workplace tasks, answer questions, and provide helpful information. Keep responses concise, professional, and helpful."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return generateFallbackResponse(userMessage);
  }
}

// Generate a fallback response without using OpenAI
function generateFallbackResponse(query: string): string {
  const lowercaseQuery = query.toLowerCase();
  
  // Check for common workplace queries and provide canned responses
  if (lowercaseQuery.includes("meeting") || lowercaseQuery.includes("schedule")) {
    return "I can help you manage your meetings. You can view your upcoming meetings on the Calendar page, or create new meetings using the calendar interface.";
  } 
  else if (lowercaseQuery.includes("task") || lowercaseQuery.includes("todo")) {
    return "Your tasks can be managed on the Tasks page. You can create new tasks, mark them as complete, and organize them by priority.";
  }
  else if (lowercaseQuery.includes("document") || lowercaseQuery.includes("file")) {
    return "You can access and manage your documents through the Documents section. Recent files will also appear on your dashboard.";
  }
  else if (lowercaseQuery.includes("team") || lowercaseQuery.includes("colleague")) {
    return "You can find information about your team members on the Team page, including contact details and department information.";
  }
  else if (lowercaseQuery.includes("help") || lowercaseQuery.includes("how to")) {
    return "I'm here to help you navigate your workplace assistant. You can use the sidebar to access different features like Tasks, Calendar, Team, and Documents.";
  }
  else {
    return "I'm currently experiencing connection issues with my knowledge base. In the meantime, you can use the sidebar to navigate to Tasks, Calendar, Documents, or Team pages to find what you need.";
  }
}

// Simple keyword-based search analyzer
function analyzeFallbackSearch(query: string): { category: string; keywords: string[] } {
  const lowercaseQuery = query.toLowerCase();
  const words = lowercaseQuery.split(/\s+/).filter(word => word.length > 2);
  
  // Extract potential keywords (words longer than 2 characters)
  const uniqueWords = new Set(words);
  const keywords = Array.from(uniqueWords);
  
  // Determine category based on keywords
  let category = "general";
  
  if (lowercaseQuery.includes("task") || lowercaseQuery.includes("todo") || 
      lowercaseQuery.includes("work") || lowercaseQuery.includes("project") ||
      lowercaseQuery.includes("deadline") || lowercaseQuery.includes("done")) {
    category = "task";
  } 
  else if (lowercaseQuery.includes("meeting") || lowercaseQuery.includes("schedule") || 
           lowercaseQuery.includes("calendar") || lowercaseQuery.includes("appointment") ||
           lowercaseQuery.includes("event") || lowercaseQuery.includes("conference") ||
           lowercaseQuery.includes("call")) {
    category = "meeting";
  }
  else if (lowercaseQuery.includes("document") || lowercaseQuery.includes("file") || 
           lowercaseQuery.includes("pdf") || lowercaseQuery.includes("doc") ||
           lowercaseQuery.includes("spreadsheet") || lowercaseQuery.includes("presentation") ||
           lowercaseQuery.includes("report")) {
    category = "document";
  }
  else if (lowercaseQuery.includes("person") || lowercaseQuery.includes("team") || 
           lowercaseQuery.includes("colleague") || lowercaseQuery.includes("manager") ||
           lowercaseQuery.includes("employee") || lowercaseQuery.includes("contact")) {
    category = "person";
  }
  
  return { 
    category, 
    keywords 
  };
}

export async function processNaturalLanguageQuery(query: string, userId: number): Promise<any> {
  try {
    // Convert query to lowercase for easier handling
    const lowercaseQuery = query.toLowerCase();
    
    // Check if the API key is available and valid
    let analysisResult;
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy-key-for-development') {
      console.log("Using fallback search analysis - no valid API key");
      analysisResult = analyzeFallbackSearch(query);
    } else {
      // First, use OpenAI to understand the query intent
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an AI workplace assistant that helps categorize search queries. 
              Analyze the search query and determine the most likely intent from these categories:
              - "task" (looking for tasks)
              - "meeting" (looking for meetings/calendar events)
              - "document" (looking for documents or files)
              - "person" (looking for team members or contacts)
              - "general" (general information)
              
              Return JSON with format: { "category": "category_name", "keywords": ["keyword1", "keyword2"] }`
            },
            {
              role: "user",
              content: query
            }
          ],
          response_format: { type: "json_object" }
        });

        analysisResult = JSON.parse(response.choices[0].message.content || '{"category": "general", "keywords": []}');
      } catch (error) {
        console.error("Error calling OpenAI:", error);
        analysisResult = analyzeFallbackSearch(query);
      }
    }
    
    // Based on the category, fetch the appropriate data
    let results: any[] = [];
    
    switch (analysisResult.category) {
      case "task":
        const tasks = await storage.getTasks(userId);
        results = tasks.filter(task => 
          analysisResult.keywords.some((keyword: string) => 
            task.title.toLowerCase().includes(keyword.toLowerCase()) || 
            (task.description && task.description.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
        break;
        
      case "meeting":
        const meetings = await storage.getMeetings(userId);
        // If it's a "show all meetings" or "this week" type of query, don't filter by keywords
        if (lowercaseQuery.includes("all meetings") || 
            lowercaseQuery.includes("show meetings") || 
            lowercaseQuery.includes("my meetings") ||
            lowercaseQuery.includes("this week")) {
          results = meetings;
        } else {
          results = meetings.filter(meeting => 
            analysisResult.keywords.some((keyword: string) => 
              meeting.title.toLowerCase().includes(keyword.toLowerCase()) || 
              (meeting.location && meeting.location.toLowerCase().includes(keyword.toLowerCase()))
            )
          );
        }
        break;
        
      case "document":
        const documents = await storage.getDocuments(userId);
        results = documents.filter(doc => 
          analysisResult.keywords.some((keyword: string) => 
            doc.title.toLowerCase().includes(keyword.toLowerCase()) || 
            (doc.type && doc.type.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
        break;
        
      default:
        // For general queries, include a mix of results
        const allTasks = await storage.getTasks(userId);
        const allMeetings = await storage.getMeetings(userId);
        const allDocuments = await storage.getDocuments(userId);
        
        results = [
          ...allTasks.slice(0, 3).map(item => ({ ...item, type: 'task' })),
          ...allMeetings.slice(0, 3).map(item => ({ ...item, type: 'meeting' })),
          ...allDocuments.slice(0, 3).map(item => ({ ...item, type: 'document' }))
        ];
    }
    
    return {
      query,
      intent: analysisResult.category,
      results
    };
  } catch (error) {
    console.error("Error processing natural language query:", error);
    return {
      query,
      error: "Failed to process query",
      results: []
    };
  }
}
