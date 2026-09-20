import React, { useState, useEffect } from "react";
import {
  History,
  Ambulance,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "../UI/Button";
import { officerTripsApi } from "../../services/api";
import type { Trip } from "../../types";

export const TripHistoryView: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await officerTripsApi.getAll("completed");
      setTrips(res.trips || []);
    } catch (err) {
      console.warn("Could not fetch completed trips", err);
      // Fallback: fetch all trips and filter
      try {
        const fallback = await officerTripsApi.getAll();
        setTrips(fallback.trips?.filter((t) => t.status === "completed") || []);
      } catch (e) {
        console.error("History fetch error", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto w-full max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-blue-400" />
            Emergency Incident Operations History
          </h2>
          <p className="text-xs text-ambigo-400 mt-1">
            Official record of completed emergency transit corridors and junction clearance actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHistory}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Records
          </Button>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="animate-spin text-blue-400 w-8 h-8 rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : trips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0d0b1e]/60 rounded-2xl border border-ambigo-800/80 border-dashed">
          <div className="w-16 h-16 bg-ambigo-900 rounded-full flex items-center justify-center mb-4 text-ambigo-500">
            <History className="w-8 h-8" />
          </div>
          <p className="text-white font-bold text-lg">No completed incidents recorded yet</p>
          <p className="text-ambigo-400 text-sm mt-1 max-w-md">
            When a driver and traffic officer complete an emergency transit corridor, the full clearance record will automatically be archived here.
          </p>
        </div>
      ) : (
        <div className="command-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#090814] text-ambigo-400 font-bold uppercase tracking-wider border-b border-ambigo-800/80 text-[11px]">
                  <th className="py-3.5 px-4">Trip ID</th>
                  <th className="py-3.5 px-4">Ambulance</th>
                  <th className="py-3.5 px-4">Driver</th>
                  <th className="py-3.5 px-4">Corridor (Pickup → Destination)</th>
                  <th className="py-3.5 px-4">Start Time</th>
                  <th className="py-3.5 px-4">Completion</th>
                  <th className="py-3.5 px-4">Junctions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ambigo-800/50">
                {trips.map((trip) => {
                  const startTime = new Date(trip.startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const completeTime = trip.completedAt
                    ? new Date(trip.completedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—";

                  const junctionsClearedCount = trip.junctions.filter(
                    (j) => j.status === "cleared"
                  ).length;

                  return (
                    <tr
                      key={trip._id}
                      className="hover:bg-ambigo-800/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedTrip(trip)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        #{trip._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                        <Ambulance className="w-3.5 h-3.5 text-alert-red shrink-0" />
                        <span>{trip.vehicleId}</span>
                      </td>
                      <td className="py-3 px-4 text-ambigo-200 font-medium">
                        {trip.driverName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate text-white font-medium">
                          {trip.pickup}
                        </div>
                        <div className="max-w-xs truncate text-ambigo-400 text-[11px]">
                          → {trip.hospital}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ambigo-300 font-mono">
                        {startTime}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-mono font-semibold">
                        {completeTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {junctionsClearedCount} / {trip.junctions.length} Cleared
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                          Completed
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrip(trip);
                          }}
                          className="p-1.5 rounded-lg bg-ambigo-800/60 hover:bg-ambigo-700/60 text-ambigo-300 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d0b1e] border border-ambigo-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-ambigo-800 bg-[#090814]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Ambulance className="w-5 h-5 text-alert-red" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">
                    Trip #{selectedTrip._id.slice(-6).toUpperCase()} Details
                  </h3>
                  <p className="text-xs text-ambigo-400">
                    Vehicle: {selectedTrip.vehicleId} • Driver: {selectedTrip.driverName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrip(null)}
                className="text-ambigo-400 hover:text-white p-1.5 rounded-lg hover:bg-ambigo-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800">
                  <span className="text-[10px] uppercase font-bold text-ambigo-400 block mb-1">
                    Pickup Location
                  </span>
                  <p className="font-semibold text-white">{selectedTrip.pickup}</p>
                </div>
                <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800">
                  <span className="text-[10px] uppercase font-bold text-ambigo-400 block mb-1">
                    Hospital Destination
                  </span>
                  <p className="font-semibold text-white">{selectedTrip.hospital}</p>
                </div>
              </div>

              {/* Junction Clearances Log */}
              <div>
                <h4 className="text-[11px] font-bold text-ambigo-300 uppercase tracking-wider mb-2">
                  Corridor Junction Clearance Audit
                </h4>
                <div className="space-y-2">
                  {selectedTrip.junctions.map((j, idx) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#090814] border border-ambigo-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-white">{j.name}</p>
                          <p className="text-[10px] text-ambigo-400">
                            Lat: {j.location.lat.toFixed(4)}, Lng: {j.location.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {j.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-ambigo-800 bg-[#090814] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTrip(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
