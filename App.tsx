import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveSession, LiveServerMessage } from "@google/genai";
import Dashboard from './components/Dashboard';
import AgentBuilder from './components/AgentBuilder';
import CallManager from './components/CallManager';
import CallSimulation from './components/CallSimulation';
import CallLogs from './components/CallLogs';
import LiveConversation from './components/LiveConversation';
import { DashboardIcon, AgentBuilderIcon, PhoneIcon, HistoryIcon, BotIcon, MicrophoneIcon } from './components/IconComponents';
import type { Agent, CallLog, TranscriptEntry } from './types';

type Tab = 'dashboard' | 'builder' | 'manager' | 'simulation' | 'logs' | 'live';

// The Blob type expected by the Gemini API
interface GenAIBlob {
    data: string;
    mimeType: string;
}


// Audio utility functions from the Gemini documentation
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createBlob(data: Float32Array): GenAIBlob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [currentCall, setCurrentCall] = useState<CallLog | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // Refs for call recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // State for Live Conversation
    const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
    const [liveStatus, setLiveStatus] = useState('Disconnected');
    const [liveTranscript, setLiveTranscript] = useState<{userInput: string, agentResponse: string}[]>([]);
    const [currentLiveTranscription, setCurrentLiveTranscription] = useState<{ userInput: string, agentResponse: string}>({ userInput: '', agentResponse: '' });

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // Simulate Firestore persistence with localStorage
    useEffect(() => {
        try {
            const storedAgents = localStorage.getItem('thinkmirai_agents');
            if (storedAgents) setAgents(JSON.parse(storedAgents));
            const storedLogs = localStorage.getItem('thinkmirai_calllogs');
            if (storedLogs) setCallLogs(JSON.parse(storedLogs));
        } catch (error) {
            console.error("Failed to load from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('thinkmirai_agents', JSON.stringify(agents));
        } catch (error) {
            console.error("Failed to save agents to localStorage", error);
        }
    }, [agents]);

    useEffect(() => {
        try {
            localStorage.setItem('thinkmirai_calllogs', JSON.stringify(callLogs));
        } catch (error) {
            console.error("Failed to save call logs to localStorage", error);
        }
    }, [callLogs]);


    const handleSaveAgent = (agentToSave: Agent) => {
        setAgents(prev => {
            const index = prev.findIndex(a => a.id === agentToSave.id);
            if (index > -1) {
                const newAgents = [...prev];
                newAgents[index] = agentToSave;
                return newAgents;
            }
            return [...prev, agentToSave];
        });
    };
    
    const handleStartCall = async (agentId: string, customerNumber: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        setIsRecording(false);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required for call recording. The call will proceed without recording.");
        }


        const newCall: CallLog = {
            id: Date.now().toString(),
            agentId,
            agentName: agent.name,
            customerNumber,
            startTime: Date.now(),
            endTime: null,
            transcript: [{ role: 'agent', text: agent.greeting, timestamp: Date.now() }],
        };
        setCurrentCall(newCall);
        setActiveTab('simulation');
    };

    const handleUpdateTranscript = (newTranscript: TranscriptEntry[]) => {
        setCurrentCall(prev => prev ? { ...prev, transcript: newTranscript } : null);
    };

    const handleHangUp = () => {
        if (currentCall) {
            const endCall = (audioUrl?: string) => {
                const finishedCall = { 
                    ...currentCall, 
                    endTime: Date.now(),
                    audioRecordingUrl: audioUrl,
                };
                setCallLogs(prev => [...prev, finishedCall]);
                setCurrentCall(null);
                setActiveTab('logs');

                // Cleanup refs and state
                mediaStreamRef.current?.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                mediaStreamRef.current = null;
                audioChunksRef.current = [];
                setIsRecording(false);
            };

            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.onstop = () => {
                    if (audioChunksRef.current.length === 0) {
                        endCall();
                        return;
                    }
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Url = reader.result as string;
                        endCall(base64Url);
                    };
                    reader.readAsDataURL(audioBlob);
                };
                mediaRecorderRef.current.stop();
            } else {
                // Call had no active recording
                endCall();
            }
        }
    };


    // Live Session Handlers
    const handleStartLiveSession = async (agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent || !process.env.API_KEY) {
            alert("Agent not found or API key is missing.");
            return;
        }

        setIsLiveSessionActive(true);
        setLiveStatus('Connecting...');
        setLiveTranscript([]);
        setCurrentLiveTranscription({ userInput: '', agentResponse: '' });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Fix: Cast window to 'any' to support webkitAudioContext for older browsers.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
        audioSourcesRef.current.clear();

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    setLiveStatus('Connected');
                    // Fix: Cast window to 'any' to support webkitAudioContext for older browsers.
                    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                    const source = inputAudioContextRef.current.createMediaStreamSource(microphoneStreamRef.current);
                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        setCurrentLiveTranscription(prev => ({ ...prev, agentResponse: prev.agentResponse + text }));
                    } else if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        setCurrentLiveTranscription(prev => ({ ...prev, userInput: prev.userInput + text }));
                    }

                    if (message.serverContent?.turnComplete) {
                        setLiveTranscript(prev => [...prev, currentLiveTranscription]);
                        setCurrentLiveTranscription({ userInput: '', agentResponse: '' });
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => {
                            audioSourcesRef.current.delete(source);
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    setLiveStatus(`Error: ${e.message}`);
                    handleStopLiveSession();
                },
                onclose: (e: CloseEvent) => {
                    setLiveStatus('Disconnected');
                    handleStopLiveSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: `${agent.persona}\n\nKNOWLEDGE BASE:\n${agent.knowledgeBase}`,
            },
        });
    };

    const handleStopLiveSession = () => {
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        setIsLiveSessionActive(false);
        setLiveStatus('Disconnected');
    };

    const renderContent = () => {
        if (activeTab === 'simulation' && currentCall) {
            const agent = agents.find(a => a.id === currentCall.agentId);
            if (!agent) {
                setActiveTab('manager');
                return <p>Error: Agent not found for current call.</p>;
            }
            return <CallSimulation agent={agent} callLog={currentCall} onUpdateTranscript={handleUpdateTranscript} onHangUp={handleHangUp} isRecording={isRecording} />;
        }
        
        switch (activeTab) {
            case 'dashboard': return <Dashboard agents={agents} logs={callLogs} />;
            case 'builder': return <AgentBuilder agents={agents} onSaveAgent={handleSaveAgent} />;
            case 'manager': return <CallManager agents={agents} onStartCall={handleStartCall} />;
            case 'logs': return <CallLogs logs={callLogs} />;
            case 'live': return <LiveConversation
                agents={agents}
                isSessionActive={isLiveSessionActive}
                status={liveStatus}
                transcript={liveTranscript}
                currentTranscription={currentLiveTranscription}
                onStart={handleStartLiveSession}
                onStop={handleStopLiveSession}
                />;
            default: return null;
        }
    };

    const NavButton: React.FC<{ tabName: Tab; icon: React.ReactNode; label: string }> = ({ tabName, icon, label }) => {
        const isActive = activeTab === tabName;
        let isDisabled = (tabName === 'simulation' && !currentCall);
        if(tabName === 'live') isDisabled = currentCall !== null; // Disable live if in a simulated call
        if(tabName !== 'live' && tabName !== 'simulation' && isLiveSessionActive) isDisabled = true; // Disable others during live call
        if(tabName === 'simulation' && isLiveSessionActive) isDisabled = true; // Disable simulation during live call


        return (
            <button
                onClick={() => setActiveTab(tabName)}
                disabled={isDisabled}
                className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start sm:space-x-3 p-2 sm:p-3 rounded-lg transition-colors text-sm font-medium w-full ${
                    isActive ? 'bg-cyan-500 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {icon}
                <span className="mt-1 sm:mt-0">{label}</span>
            </button>
        );
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-100">
            <nav className="w-full md:w-64 bg-gray-800 p-4 flex flex-row md:flex-col justify-around md:justify-start md:space-y-4 shadow-lg flex-shrink-0">
                <div className="hidden md:flex items-center space-x-2 mb-6 p-2">
                    <BotIcon className="w-8 h-8 text-cyan-400" />
                    <h1 className="text-xl font-bold text-white">Think Mirai</h1>
                </div>
                <NavButton tabName="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                <NavButton tabName="builder" icon={<AgentBuilderIcon />} label="Agent Builder" />
                <NavButton tabName="manager" icon={<PhoneIcon />} label="Call Manager" />
                <NavButton tabName="live" icon={<MicrophoneIcon />} label="Live Conversation" />
                <NavButton tabName="logs" icon={<HistoryIcon />} label="Call Logs" />
                 {currentCall && <NavButton tabName="simulation" icon={<div className="relative flex h-5 w-5 items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><PhoneIcon className="text-red-500"/></div>} label="Live Call" />}
            </nav>
            <main className="flex-grow overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;