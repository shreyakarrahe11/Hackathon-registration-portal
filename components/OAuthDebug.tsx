import React, { useEffect, useState, useRef } from 'react';

const OAuthDebug: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [logs, setLogs] = useState<string[]>([]);

    // Trap Console Logs
    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addLog = (type: string, args: any[]) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            const timestamp = new Date().toLocaleTimeString().split(' ')[0];
            setLogs(prev => [`[${timestamp}] ${type}: ${msg}`, ...prev].slice(0, 20)); // Keep last 20
        };

        console.log = (...args) => {
            addLog('LOG', args);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            addLog('ERR', args);
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            addLog('WRN', args);
            originalWarn.apply(console, args);
        };

        // Init Config
        const getUrl = () => window.location.href;
        const getOrigin = () => window.location.origin;
        setConfig({
            windowOrigin: getOrigin(),
            windowHref: getUrl(),
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            redirectParam: `${getOrigin()}/student/login?google_auth=true`
        });

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied!');
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/95 p-4 rounded-lg border border-red-500 text-[10px] font-mono text-white w-[400px] h-[300px] z-[9999] shadow-2xl flex flex-col">
            <h3 className="font-bold text-red-400 mb-2 border-b border-red-500/50 pb-1 flex justify-between">
                <span>OAuth Live Debugger</span>
                <span className="text-gray-500">{logs.length} logs</span>
            </h3>

            <div className="flex-grow overflow-y-auto space-y-1 mb-2 bg-gray-900/50 p-2 rounded border border-gray-800">
                {logs.length === 0 && <p className="text-gray-500 italic">Waiting for logs...</p>}
                {logs.map((log, i) => (
                    <div key={i} className={`break-words ${log.includes('ERR') ? 'text-red-300' : log.includes('WRN') ? 'text-yellow-300' : 'text-green-300'}`}>
                        {log}
                    </div>
                ))}
            </div>

            <div className="shrink-0 space-y-1">
                <p className="text-gray-400">Current URL: <span className="text-blue-300 break-all">{config.windowHref}</span></p>
            </div>
        </div>
    );
};

export default OAuthDebug;
