import { useState, useEffect } from "react";
import { RefreshCw, Database, Play, AlertTriangle, Search } from "lucide-react";
import Markdown from "../Markdown";

export default function VaultPanel() {
  const [vaultMode, setVaultMode] = useState<"notes" | "db">("notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // DB States
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [dbError, setDbError] = useState<string>("");
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/vault');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch vault notes:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectNote = async (filename: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/vault?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setSelectedNote(data);
    } catch (e) {
      console.error("Failed to load note content:", e);
    }
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/db/tables');
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        if (data.tables.length > 0 && !selectedTable) {
          const firstTable = data.tables[0].name;
          setSelectedTable(firstTable);
          const initialQuery = `SELECT * FROM ${firstTable} LIMIT 50;`;
          setSqlQuery(initialQuery);
          runQuery(initialQuery, firstTable);
        }
      }
    } catch (e) {
      console.error("Failed to fetch tables:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    const initialQuery = `SELECT * FROM ${tableName} LIMIT 50;`;
    setSqlQuery(initialQuery);
    runQuery(initialQuery, tableName);
  };

  const runQuery = async (queryToRun: string, overrideTable?: string) => {
    setDbLoading(true);
    setDbError("");
    try {
      const res = await fetch('http://localhost:3000/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToRun })
      });
      const data = await res.json();
      if (res.ok && data.rows) {
        setDbRows(data.rows);
        if (data.rows.length > 0) {
          setDbColumns(Object.keys(data.rows[0]));
        } else {
          const currentT = overrideTable || selectedTable;
          const matchingTable = tables.find(t => t.name === currentT);
          if (matchingTable) {
            setDbColumns(matchingTable.columns.map((c: any) => c.name));
          } else {
            setDbColumns([]);
          }
        }
      } else {
        setDbError(data.error || "Failed to execute query");
        setDbRows([]);
        setDbColumns([]);
      }
    } catch (e: any) {
      setDbError(e.message || "Network error executing query");
      setDbRows([]);
      setDbColumns([]);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (vaultMode === "notes") {
      fetchNotes();
    } else {
      fetchTables();
    }
  }, [vaultMode]);

  const filteredNotes = notes.filter(n => 
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#04040c]/15">
      {/* Left panel: List notes or tables */}
      <div className="w-80 border-r border-white/[0.05] flex flex-col shrink-0 bg-[#060610]/45">
        {/* Toggle Mode */}
        <div className="p-3 border-b border-white/[0.05] flex flex-col gap-3">
          <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-1">
            <button
              onClick={() => setVaultMode("notes")}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                vaultMode === "notes"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              📝 File Notes
            </button>
            <button
              onClick={() => setVaultMode("db")}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                vaultMode === "db"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              🗄️ SQLite DB
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
              <input
                type="text"
                placeholder={vaultMode === "notes" ? "Search memory..." : "Search tables..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-indigo-500/30 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-white focus:outline-none placeholder-gray-600 font-mono"
              />
            </div>
            <button
              onClick={vaultMode === "notes" ? fetchNotes : fetchTables}
              className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {vaultMode === "notes" ? (
            filteredNotes.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-8 select-none">No memories matching search.</div>
            ) : (
              filteredNotes.map(n => {
                const isLearned = n.name.includes('experience') || n.name.includes('from-orchestrator') || n.name.includes('error') || n.name.includes('knowledge');
                return (
                  <button
                    key={n.name}
                    onClick={() => selectNote(n.name)}
                    className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer block ${
                      selectedNote?.name === n.name
                        ? "bg-indigo-600/15 border-indigo-500/30 text-white shadow-md"
                        : "bg-white/[0.01] border-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      {isLearned ? "💡" : "📝"} {n.name}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-1.5 flex justify-between select-none">
                      <span>{Math.round(n.sizeBytes / 102) / 10} KB</span>
                      <span>{new Date(n.mtime).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            filteredTables.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-8 select-none">No tables matching search.</div>
            ) : (
              filteredTables.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleSelectTable(t.name)}
                  className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer block ${
                    selectedTable === t.name
                      ? "bg-indigo-600/15 border-indigo-500/30 text-white shadow-md"
                      : "bg-white/[0.01] border-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    📊 {t.name}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 flex justify-between select-none">
                    <span>{t.columns.length} columns</span>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Right panel: Content or DB results */}
      <div className="flex-grow flex flex-col bg-[#04040c]/25 overflow-hidden">
        {vaultMode === "notes" ? (
          selectedNote ? (
            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono">{selectedNote.name}</h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">Shared Vault Memory</span>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-6 select-text max-w-4xl mx-auto w-full">
                <Markdown text={selectedNote.content} />
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8 select-none text-center">
              <Database size={32} className="text-gray-700 mb-3 animate-pulse" />
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Swarm Shared Memory Vault</div>
              <div className="text-[10px] text-gray-600 mt-1 max-w-xs">Select a note from the left sidebar to view its accumulated rules, learned guides, and team documents.</div>
            </div>
          )
        ) : (
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Database Control Center Header */}
            <div className="p-4 border-b border-white/[0.05] bg-[#070713]/55 flex flex-col gap-3 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-mono">
                    SQLite DB Inspector: <span className="text-indigo-400">{selectedTable || "aionui-backend.db"}</span>
                  </h3>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold block mt-1">
                    Direct Schema & Execution Environment
                  </span>
                </div>
                {/* Table Schema mini-info badge */}
                {selectedTable && (
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.05] text-[10px] text-gray-400 font-mono animate-fade-in">
                      Columns: {tables.find(t => t.name === selectedTable)?.columns.length || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* SQL Console */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <textarea
                    value={sqlQuery}
                    onChange={e => setSqlQuery(e.target.value)}
                    className="w-full h-16 bg-[#04040c] border border-white/[0.07] focus:border-indigo-500/45 rounded-xl p-3 text-[11px] font-mono text-indigo-100 focus:outline-none placeholder-gray-700 resize-none shadow-inner transition-all"
                    placeholder="Enter custom SELECT query here..."
                  />
                  <button
                    onClick={() => runQuery(sqlQuery)}
                    disabled={dbLoading}
                    className="absolute right-2.5 bottom-2.5 p-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {dbLoading ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                    Execute
                  </button>
                </div>
              </div>
            </div>

            {/* Query Results / Output view */}
            <div className="flex-grow overflow-auto p-4 bg-[#030308]/40">
              {dbError && (
                <div className="p-3.5 rounded-xl border border-red-500/25 bg-red-950/15 text-red-400 text-[10px] font-mono flex items-start gap-2.5 mb-4 max-w-4xl mx-auto shadow-sm">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">SQL Execution Failure:</span>
                    <p className="mt-1 opacity-90">{dbError}</p>
                  </div>
                </div>
              )}

              {dbLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500 select-none">
                  <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400/70 animate-pulse">Running SQL Statement...</span>
                </div>
              ) : dbRows.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-600 select-none border border-dashed border-white/[0.03] rounded-2xl">
                  <Database size={24} className="text-gray-800 mb-2" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Empty Recordset</span>
                  <span className="text-[9px] text-gray-600 mt-1 font-mono">No data matched the query constraint or table is empty.</span>
                </div>
              ) : (
                <div className="border border-white/[0.05] rounded-xl overflow-hidden bg-[#050510]/55 shadow-lg max-w-full">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full border-collapse text-left text-[10px] font-mono">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/[0.06] text-gray-400 uppercase tracking-wider select-none">
                          {dbColumns.map(col => (
                            <th key={col} className="p-2.5 px-3 font-semibold border-r border-white/[0.04]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {dbRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.015] transition-all text-gray-300">
                            {dbColumns.map(col => {
                              const val = row[col];
                              let displayVal = "";
                              if (val === null || val === undefined) displayVal = "NULL";
                              else if (typeof val === 'object') displayVal = JSON.stringify(val);
                              else displayVal = String(val);

                              const isNull = val === null || val === undefined;
                              return (
                                <td key={col} className="p-2.5 px-3 border-r border-white/[0.04] max-w-xs truncate" title={displayVal}>
                                  <span className={isNull ? "text-gray-600 italic font-semibold" : "font-mono"}>
                                    {displayVal}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Results count status bar */}
                  <div className="p-2 px-3 border-t border-white/[0.05] bg-white/[0.01] text-[9px] text-gray-500 font-mono flex justify-between items-center select-none">
                    <span>Fetched {dbRows.length} rows</span>
                    <span className="text-indigo-500/70 font-semibold uppercase">Execution Status: SUCCESS</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
