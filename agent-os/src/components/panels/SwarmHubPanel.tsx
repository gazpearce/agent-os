import { Users } from "lucide-react";

export default function SwarmHubPanel() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070713]/40">
      <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#070713]/55">
        <div>
          <h3 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            SWARM HUB
          </h3>
        </div>
      </div>
    </div>
  );
}
