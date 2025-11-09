import React, { useState } from 'react';
import type { CallLog, TranscriptEntry } from '../types';
import { UserIcon, BotIcon } from './IconComponents';

const TranscriptModal: React.FC<{ log: CallLog; onClose: () => void }> = ({ log, onClose }) => {
    const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-cyan-400">Transcript for call with {log.customerNumber}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-4 flex-grow overflow-y-auto space-y-4">
          {log.transcript.map((entry: TranscriptEntry, index: number) => (
             <div key={index} className={`flex items-start gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {entry.role === 'agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><BotIcon className="w-5 h-5 text-white" /></div>}
                <div className={`max-w-md p-3 rounded-lg ${entry.role === 'agent' ? 'bg-gray-700 text-gray-200' : 'bg-blue-600 text-white'}`}>
                  <p className="text-sm">{entry.text}</p>
                   <p className={`text-xs mt-1 ${entry.role === 'agent' ? 'text-gray-400' : 'text-blue-200'} text-right`}>{formatTime(entry.timestamp)}</p>
                </div>
                 {entry.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><UserIcon className="w-5 h-5 text-white" /></div>}
              </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700 text-right">
            <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">Close</button>
        </div>
      </div>
    </div>
  );
};

interface CallLogsProps {
  logs: CallLog[];
}

const CallLogs: React.FC<CallLogsProps> = ({ logs }) => {
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  const calculateDuration = (startTime: number, endTime: number | null) => {
    if (!endTime) return 'In Progress';
    const totalSeconds = Math.round((endTime - startTime) / 1000);

    if (totalSeconds < 1) {
      return '0s';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (seconds > 0 || totalSeconds < 60) {
      parts.push(`${seconds}s`);
    }
    
    return parts.join(' ') || '0s';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Recordings & Transcriptions</h2>
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">Timestamp</th>
                <th scope="col" className="px-6 py-3">Agent Used</th>
                <th scope="col" className="px-6 py-3">Customer Number</th>
                <th scope="col" className="px-6 py-3">Duration</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.slice().reverse().map(log => (
                  <tr key={log.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                    <td className="px-6 py-4">{new Date(log.startTime).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-white">{log.agentName}</td>
                    <td className="px-6 py-4">{log.customerNumber}</td>
                    <td className="px-6 py-4">{calculateDuration(log.startTime, log.endTime)}</td>
                    <td className="px-6 py-4 space-x-2">
                      <button onClick={() => setSelectedLog(log)} className="font-medium text-cyan-400 hover:underline">View Transcript</button>
                      <button disabled className="font-medium text-gray-500 cursor-not-allowed">Play (Mock)</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">No call logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedLog && <TranscriptModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};

export default CallLogs;