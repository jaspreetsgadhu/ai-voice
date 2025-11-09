
import { GoogleGenAI } from "@google/genai";
import type { Agent, TranscriptEntry } from "../types";

// This function simulates checking local call flow logic before calling the LLM
const checkCallFlow = (userInput: string, callFlow: string): string | null => {
  try {
    const flow = JSON.parse(callFlow);
    const lowerUserInput = userInput.toLowerCase();
    for (const key in flow) {
      if (lowerUserInput.includes(key.toLowerCase())) {
        return flow[key];
      }
    }
  } catch (error) {
    console.error("Error parsing call flow JSON:", error);
  }
  return null;
};


export const simulateAgentResponse = async (
  agent: Agent,
  conversationHistory: TranscriptEntry[],
  userInput: string
): Promise<string> => {
  // 1. Simulate Flow Logic: Check for keyword match first
  const keywordResponse = checkCallFlow(userInput, agent.callFlow);
  if (keywordResponse) {
    return Promise.resolve(keywordResponse);
  }

  // 2. If no keyword match, proceed with Gemini API call
  if (!process.env.API_KEY) {
    return "Error: API key is not configured. Please set the API_KEY environment variable.";
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 3. Construct System Prompt and User Query
  const systemInstruction = `${agent.persona}\n\nKNOWLEDGE BASE:\n${agent.knowledgeBase}`;
  
  // Format history for Gemini API. The API expects a flat array of alternating user/model roles.
  const contents = conversationHistory.map(entry => ({
    role: entry.role === 'agent' ? 'model' : 'user',
    parts: [{ text: entry.text }]
  }));
  // Add the latest user input
  contents.push({ role: 'user', parts: [{ text: userInput }] });


  try {
    // 4. Execute API Call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm sorry, I encountered a technical issue and can't respond right now.";
  }
};
