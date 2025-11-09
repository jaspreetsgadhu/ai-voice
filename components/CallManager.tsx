
import React, { useState, useEffect } from 'react';
import type { Agent } from '../types';

interface CallManagerProps {
  agents: Agent[];
  onStartCall: (agentId: string, customerNumber: string) => void;
}

const CallManager: React.FC<CallManagerProps> = ({ agents, onStartCall }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [customerNumber, setCustomerNumber] = useState('');

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleStartCall = () => {
    if (selectedAgentId && customerNumber) {
      onStartCall(selectedAgentId, customerNumber);
    } else {
      alert('Please select an agent and enter a customer number.');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Call Manager</h2>
      
      <div className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-lg">
        <div>
          <label htmlFor="agent-selector" className="block mb-2 text-sm font-medium text-gray-300">Select Agent</label>
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

        <div>
          <h3 className="text-sm font-medium text-gray-300">Agent Phone Number</h3>
          <p className="text-lg font-semibold text-gray-100 p-2.5 bg-gray-700 rounded-md mt-2">
            {selectedAgent ? selectedAgent.phoneNumber : 'N/A'}
          </p>
        </div>

        <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Outbound Call Simulator</h3>
            <div>
              <label htmlFor="customer-number" className="block mb-2 text-sm font-medium text-gray-300">Customer Number to Dial</label>
              <input
                type="text"
                id="customer-number"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="+1 (555) 987-6543"
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
              />
            </div>
            <button
              onClick={handleStartCall}
              disabled={!selectedAgentId || !customerNumber}
              className="mt-4 w-full text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Initiate Call
            </button>
        </div>

        <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Inbound Call Status</h3>
            <div className="flex items-center space-x-3">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <p className="text-green-400">Ready for Inbound Calls</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CallManager;
