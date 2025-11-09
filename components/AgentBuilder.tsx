import React, { useState, useEffect } from 'react';
import type { Agent } from '../types';
import { UploadIcon } from './IconComponents';

interface AgentBuilderProps {
  agents: Agent[];
  onSaveAgent: (agent: Agent) => void;
}

const defaultCallFlow = JSON.stringify({
  "pricing": "I can share our latest rate card. What specific service are you interested in?",
  "cancel": "I can help with that. To start the cancellation process, I'll need your account number."
}, null, 2);

const AgentBuilder: React.FC<AgentBuilderProps> = ({ agents, onSaveAgent }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('new');
  const [formState, setFormState] = useState<Omit<Agent, 'id'>>({
    name: '',
    persona: 'You are a friendly and helpful customer support representative.',
    knowledgeBase: 'Our company, Think Mirai, specializes in AI-driven solutions. We offer three tiers of service: Basic, Pro, and Enterprise.',
    greeting: 'Hello, thank you for calling Think Mirai. How can I help you today?',
    callFlow: defaultCallFlow,
    phoneNumber: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAgentId === 'new') {
      setFormState({
        name: '',
        persona: 'You are a friendly and helpful customer support representative.',
        knowledgeBase: 'Our company, Think Mirai, specializes in AI-driven solutions. We offer three tiers of service: Basic, Pro, and Enterprise.',
        greeting: 'Hello, thank you for calling Think Mirai. How can I help you today?',
        callFlow: defaultCallFlow,
        phoneNumber: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
      });
      setJsonError(null); // Clear error when creating new
    } else {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent) {
        setFormState(agent);
        // Also validate existing agent's callflow on load
        try {
          JSON.parse(agent.callFlow);
          setJsonError(null);
        } catch {
          setJsonError('Invalid JSON. Check for syntax errors like missing commas or quotes.');
        }
      }
    }
  }, [selectedAgentId, agents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'callFlow') {
      if (value.trim() === '') {
        setJsonError(null); // An empty flow is valid
      } else {
        try {
          JSON.parse(value);
          setJsonError(null);
        } catch (error) {
          setJsonError('Invalid JSON. Check for syntax errors like missing commas or quotes.');
        }
      }
    }
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setFormState(prev => ({
          ...prev,
          knowledgeBase: prev.knowledgeBase + `\n\n--- Content from ${file.name} ---\n` + fileContent
        }));
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      // Simulate PDF text extraction since client-side parsing is heavy.
      const simulatedContent = `\n\n[Content from PDF: ${file.name}]\nThis is placeholder text. In a real application, the extracted text from the PDF would appear here.\n`;
      setFormState(prev => ({
        ...prev,
        knowledgeBase: prev.knowledgeBase + simulatedContent
      }));
    } else {
      alert('Unsupported file type. Please upload a .txt or .pdf file.');
    }
    // Reset file input to allow uploading the same file again
    e.target.value = '';
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError || !formState.name) return;
    
    const agentToSave: Agent = {
        id: selectedAgentId === 'new' ? Date.now().toString() : selectedAgentId,
        ...formState,
    };
    onSaveAgent(agentToSave);
    if(selectedAgentId === 'new') {
        setSelectedAgentId(agentToSave.id);
    }
    alert('Agent saved successfully!');
  };

  const Label: React.FC<{ htmlFor: string; title: string; description: string }> = ({ htmlFor, title, description }) => (
    <label htmlFor={htmlFor} className="block mb-2 text-sm font-medium text-gray-300">
      {title}
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </label>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Agent Development Environment</h2>
      
      <div className="mb-6">
        <label htmlFor="agent-select" className="block mb-2 text-sm font-medium text-gray-300">Load Agent or Create New</label>
        <select
          id="agent-select"
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
        >
          <option value="new">-- Create New Agent --</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name" title="Agent Name" description="A unique name to identify this agent." />
          <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} required className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5" />
        </div>

        <div>
          <Label htmlFor="persona" title="Agent Persona / System Prompt" description="Defines the agent's core identity and instructions (used as Gemini System Instruction)." />
          <textarea id="persona" name="persona" rows={4} value={formState.persona} onChange={handleChange} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></textarea>
        </div>

        <div>
          <Label htmlFor="knowledgeBase" title="Knowledge Base (KB)" description="Provide large text passages (FAQs, product info) for the agent to reference." />
          <textarea id="knowledgeBase" name="knowledgeBase" rows={6} value={formState.knowledgeBase} onChange={handleChange} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"></textarea>
           <div className="mt-2">
              <label htmlFor="kb-file-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-md cursor-pointer">
                <UploadIcon className="w-4 h-4" />
                <span>Upload Document (.txt, .pdf)</span>
              </label>
              <input 
                id="kb-file-upload" 
                type="file" 
                className="hidden" 
                accept=".txt,.pdf"
                onChange={handleFileChange}
              />
          </div>
        </div>

        <div>
          <Label htmlFor="greeting" title="Initial Greeting" description="The first thing the agent says when a call begins." />
          <input type="text" id="greeting" name="greeting" value={formState.greeting} onChange={handleChange} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5" />
        </div>

        <div>
          <Label htmlFor="callFlow" title="Automated Call Flow / Keyword Logic" description="Define keyword-based logic in JSON format. If a keyword is detected, the agent gives the specified response immediately." />
          <textarea 
            id="callFlow" 
            name="callFlow" 
            rows={8} 
            value={formState.callFlow} 
            onChange={handleChange} 
            className={`font-mono bg-gray-800 border text-white text-sm rounded-lg block w-full p-2.5 transition-colors ${
              jsonError 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-600 focus:ring-cyan-500 focus:border-cyan-500'
            }`}
          />
          {jsonError && <p className="mt-2 text-sm text-red-500">{jsonError}</p>}
        </div>

        <div>
            <button type="submit" disabled={!!jsonError || !formState.name} className="w-full text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-gray-600 disabled:cursor-not-allowed">
                {selectedAgentId === 'new' ? 'Create Agent' : 'Update Agent'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AgentBuilder;