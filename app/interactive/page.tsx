/**
 * Interaktive Sessions Seite
 * Tmux-basierte Live Sessions mit Chat!
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface Session {
  name: string;
  type: string;
  status: string;
  project: string;
  prompt: string;
}

export default function InteractivePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [tmuxOutput, setTmuxOutput] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPrompt, setNewSessionPrompt] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Sessions laden
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(console.error);
  }, []);

  // Tmux Output poller für ausgewählte Session
  useEffect(() => {
    if (!selectedSession) return;
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/tmux-output`);
        const data = await res.json();
        if (data.output) {
          setTmuxOutput(data.output);
        }
      } catch {}
    };
    
    poll();
    const interval = setInterval(poll, 3000); // Alle 3 Sekunden
    return () => clearInterval(interval);
  }, [selectedSession]);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tmuxOutput]);

  // Neue Session starten
  const startSession = async () => {
    if (!newSessionName || !newSessionPrompt) return;
    setIsStarting(true);
    
    try {
      await fetch('/api/sessions/start-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newSessionName, 
          prompt: newSessionPrompt 
        })
      });
      
      // Sessions neu laden
      const r = await fetch('/api/sessions');
      setSessions(await r.json());
      setNewSessionName('');
      setNewSessionPrompt('');
    } catch (e) {
      console.error(e);
    }
    setIsStarting(false);
  };

  // Chat senden
  const sendChat = async () => {
    if (!chatInput || !selectedSession) return;
    
    await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: chatInput })
    });
    
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🤖 Interaktive Sessions</h1>
        
        {/* Neue Session starten */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Neue Session starten</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Session Name"
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex-1"
            />
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Prompt / Auftrag"
              value={newSessionPrompt}
              onChange={e => setNewSessionPrompt(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex-1"
            />
            <button
              onClick={startSession}
              disabled={isStarting || !newSessionName || !newSessionPrompt}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 px-4 py-2 rounded"
            >
              {isStarting ? 'Starte...' : '▶️ Start'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Session Liste */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Aktive Sessions</h2>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-gray-500">Keine Sessions</p>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedSession(s.name)}
                    className={`w-full text-left p-3 rounded ${
                      selectedSession === s.name 
                        ? 'bg-blue-900 border border-blue-500' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-400">
                      {s.type} • {s.project}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {s.prompt?.substring(0, 50)}...
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Live Output */}
          <div className="lg:col-span-2 bg-gray-900 rounded-lg p-4">
            {selectedSession ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">📺 {selectedSession}</h2>
                  <span className="text-xs text-gray-500">Live (3s refresh)</span>
                </div>
                
                {/* Terminal Output */}
                <div 
                  ref={outputRef}
                  className="bg-black border border-gray-700 rounded p-3 h-80 overflow-auto font-mono text-xs whitespace-pre-wrap"
                >
                  {tmuxOutput || 'Warte auf Output...'}
                </div>

                {/* Chat Eingabe */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Nachricht an Agent..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  />
                  <button
                    onClick={sendChat}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  >
                    ➤ Senden
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Wähle eine Session aus</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
