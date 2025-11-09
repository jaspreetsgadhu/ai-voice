import React, { useState, useEffect, useRef } from 'react';
import type { Agent } from '../types';
import { UserIcon, BotIcon } from './IconComponents';

interface LiveConversationProps {
    agents: Agent[];
    isSessionActive: boolean;
    status: string;
    transcript: { userInput: string, agentResponse: string }[];
    currentTranscription: { userInput: string, agentResponse: string };
    onStart: (agentId: string) => void;
    onStop: () => void;
}

const LiveConversation: React.FC<LiveConversationProps> = ({
    agents,
    isSessionActive,
    status,
    transcript,
    currentTranscription,
    onStart,
    onStop,
}) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, currentTranscription]);

    const handleStart = () => {
        if (selectedAgentId) {
            onStart(selectedAgentId);
        } else {
            alert('Please select an agent.');
        }
    };
    
    const statusColor = () => {
        if (status === 'Connected') return 'text-green-400';
        if (status.startsWith('Error')) return 'text-red-400';
        if (status === 'Disconnected') return 'text-gray-400';
        return 'text-yellow-400';
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto h-full flex flex-col">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6 flex-shrink-0">Live Conversation</h2>
            
            {!isSessionActive ? (
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div>
                        <label htmlFor="agent-selector" className="block mb-2 text-sm font-medium text-gray-300">Select Agent for Conversation</label>
                        <select
                            id="agent-selector"
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            disabled={agents.length === 0}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
                        >
                            {agents.length === 0 ? (
                                <option>No agents available. Create one first.</option>
                            ) : (
                                agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={!selectedAgentId}
                        className="w-full text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Start Conversation
                    </button>
                </div>
            ) : (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col flex-grow h-0">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div className="flex items-center space-x-3">
                            <span className="relative flex h-3 w-3">
                                {status === 'Connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'Connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            </span>
                            <span className={`font-medium ${statusColor()}`}>{status}</span>
                        </div>
                        <button
                            onClick={onStop}
                            className="w-auto text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                        >
                            Stop Conversation
                        </button>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 flex-grow overflow-y-auto space-y-4">
                        {transcript.map((turn, index) => (
                            <React.Fragment key={index}>
                                {turn.userInput && <TranscriptBubble role="user" text={turn.userInput} />}
                                {turn.agentResponse && <TranscriptBubble role="agent" text={turn.agentResponse} />}
                            </React.Fragment>
                        ))}
                         {currentTranscription.userInput && <TranscriptBubble role="user" text={currentTranscription.userInput} isPartial />}
                         {currentTranscription.agentResponse && <TranscriptBubble role="agent" text={currentTranscription.agentResponse} isPartial />}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
};

const TranscriptBubble: React.FC<{role: 'user' | 'agent', text: string, isPartial?: boolean}> = ({ role, text, isPartial }) => {
    return (
        <div className={`flex items-start gap-3 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {role === 'agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>}
            <div className={`max-w-md p-3 rounded-lg ${role === 'agent' ? 'bg-gray-700 text-gray-200' : 'bg-blue-600 text-white'} ${isPartial ? 'opacity-70' : ''}`}>
              <p className="text-sm">{text}</p>
            </div>
            {role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><UserIcon className="w-5 h-5 text-white" /></div>}
        </div>
    );
};

export default LiveConversation;