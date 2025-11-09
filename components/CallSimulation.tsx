
import React, { useState, useEffect, useRef } from 'react';
import type { Agent, CallLog, TranscriptEntry } from '../types';
import { simulateAgentResponse } from '../services/geminiService';
import { UserIcon, BotIcon, SendIcon } from './IconComponents';

interface CallSimulationProps {
  agent: Agent;
  callLog: CallLog;
  onUpdateTranscript: (newTranscript: TranscriptEntry[]) => void;
  onHangUp: () => void;
  isRecording: boolean;
}

const CallSimulation: React.FC<CallSimulationProps> = ({ agent, callLog, onUpdateTranscript, onHangUp, isRecording }) => {
  const [userInput, setUserInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callLog.transcript, isAgentTyping]);

  // Effect to speak agent's messages using TTS
  useEffect(() => {
    const lastEntry = callLog.transcript[callLog.transcript.length - 1];
    if (lastEntry && lastEntry.role === 'agent') {
        window.speechSynthesis.cancel(); // Cancel any previous utterance
        const utterance = new SpeechSynthesisUtterance(lastEntry.text);
        window.speechSynthesis.speak(utterance);
    }
  }, [callLog.transcript]);

  // Cleanup TTS on component unmount
  useEffect(() => {
    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAgentTyping) return;

    const userEntry: TranscriptEntry = { role: 'user', text: userInput.trim(), timestamp: Date.now() };
    const updatedTranscript = [...callLog.transcript, userEntry];
    onUpdateTranscript(updatedTranscript);
    setUserInput('');
    setIsAgentTyping(true);

    const agentResponseText = await simulateAgentResponse(agent, updatedTranscript, userInput.trim());
    
    const agentEntry: TranscriptEntry = { role: 'agent', text: agentResponseText, timestamp: Date.now() };
    onUpdateTranscript([...updatedTranscript, agentEntry]);
    setIsAgentTyping(false);
  };
  
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto p-4">
      <div className="flex-shrink-0 bg-gray-800 p-4 rounded-t-lg shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-cyan-400">Live Call with {agent.name}</h2>
          <p className="text-sm text-gray-400">Connected to {callLog.customerNumber}</p>
        </div>
        <div className="flex items-center space-x-4">
            {isRecording && (
                <div className="flex items-center space-x-2 text-red-400">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-sm font-medium hidden sm:block">Recording</span>
                </div>
            )}
            <button
              onClick={onHangUp}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Hang Up
            </button>
        </div>
      </div>

      <div className="flex-grow bg-gray-900 overflow-y-auto p-4 space-y-4">
        {callLog.transcript.map((entry, index) => (
          <div key={index} className={`flex items-start gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {entry.role === 'agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>}
            <div className={`max-w-md p-3 rounded-lg ${entry.role === 'agent' ? 'bg-gray-700 text-gray-200' : 'bg-blue-600 text-white'}`}>
              <p className="text-sm">{entry.text}</p>
              <p className={`text-xs mt-1 ${entry.role === 'agent' ? 'text-gray-400' : 'text-blue-200'} text-right`}>{formatTime(entry.timestamp)}</p>
            </div>
             {entry.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><UserIcon className="w-5 h-5 text-white" /></div>}
          </div>
        ))}
        {isAgentTyping && (
          <div className="flex items-start gap-3 justify-start">
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>
            <div className="max-w-md p-3 rounded-lg bg-gray-700 text-gray-200">
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={dialogueEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 bg-gray-800 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Simulate your voice input..."
            disabled={isAgentTyping}
            className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
            autoFocus
          />
          <button
            type="submit"
            disabled={isAgentTyping || !userInput.trim()}
            className="p-2.5 text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CallSimulation;
