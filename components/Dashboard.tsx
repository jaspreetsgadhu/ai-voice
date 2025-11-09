import React from 'react';
import type { Agent, CallLog } from '../types';
import { AgentBuilderIcon, PhoneIcon, HistoryIcon } from './IconComponents';

interface DashboardProps {
  agents: Agent[];
  logs: CallLog[];
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4">
        <div className={`rounded-full p-3 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ agents, logs }) => {
    const totalAgents = agents.length;
    const totalCalls = logs.length;

    const totalDurationSeconds = logs.reduce((acc, log) => {
        if (log.endTime) {
            return acc + (log.endTime - log.startTime) / 1000;
        }
        return acc;
    }, 0);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${s}s`;
    };
    
    const recentLogs = logs.slice().reverse().slice(0, 5);

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-8">Dashboard</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <StatCard 
                    icon={<AgentBuilderIcon className="w-6 h-6 text-white"/>} 
                    label="Total Agents" 
                    value={totalAgents} 
                    color="bg-blue-500"
                />
                <StatCard 
                    icon={<PhoneIcon className="w-6 h-6 text-white"/>} 
                    label="Total Calls Made" 
                    value={totalCalls} 
                    color="bg-green-500"
                />
                <StatCard 
                    icon={<HistoryIcon className="w-6 h-6 text-white"/>} 
                    label="Total Call Duration" 
                    value={formatDuration(totalDurationSeconds)} 
                    color="bg-purple-500"
                />
            </div>

            {/* Recent Calls */}
            <div>
                 <h3 className="text-2xl font-bold text-cyan-400 mb-6">Recent Calls</h3>
                 <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                          <tr>
                            <th scope="col" className="px-6 py-3">Timestamp</th>
                            <th scope="col" className="px-6 py-3">Agent Used</th>
                            <th scope="col" className="px-6 py-3">Customer Number</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentLogs.length > 0 ? (
                            recentLogs.map(log => (
                              <tr key={log.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                <td className="px-6 py-4">{new Date(log.startTime).toLocaleString()}</td>
                                <td className="px-6 py-4 font-medium text-white">{log.agentName}</td>
                                <td className="px-6 py-4">{log.customerNumber}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center py-8 text-gray-500">No calls have been made yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;