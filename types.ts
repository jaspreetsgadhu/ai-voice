
export interface Agent {
  id: string;
  name: string;
  persona: string;
  knowledgeBase: string;
  greeting: string;
  callFlow: string; // JSON string
  phoneNumber: string;
}

export interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export interface CallLog {
  id: string;
  agentId: string;
  agentName: string;
  customerNumber: string;
  startTime: number;
  endTime: number | null;
  transcript: TranscriptEntry[];
  audioRecordingUrl?: string;
}
