import React, { useEffect, useState } from "react";
import { Ambulance, MapPin, Clock, Package, Users, Phone, AlertTriangle, Plus, Minus, X, FileText, BadgeCheck, GraduationCap, Briefcase } from "lucide-react";
import { Button } from "../components/UI/Button";
import { requestsApi, vehiclesApi } from "../services/api";
import { onRequestNew, onRequestTaken } from "../services/socket";
import { calculateDistance } from "../utils/distance";
import type { AmbulanceRequest, Coordinates, Trip, Inventory, Crew } from "../types";

interface DashboardPageProps {
  gpsLocation: Coordinates | null;
  gpsError: string | null;
  driverName: string;
  vehicleId: string;
  onTripStart: (trip: Trip) => void;
  isOffline: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  gpsLocation,
  gpsError,
  driverName,
  vehicleId,
  onTripStart,
  isOffline,
}) => {
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New states for tabs
  const [activeTab, setActiveTab] = useState<"requests" | "inventory" | "crew">("requests");
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [selectedCrewMember, setSelectedCrewMember] = useState<number | null>(null);

  const [confirmUpdate, setConfirmUpdate] = useState<{
    itemIndex: number;
    newQuantity: number;
  } | null>(null);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState<Record<number, string>>({});

  // Initial fetch for requests, inventory, and crew
  useEffect(() => {
    Promise.allSettled([
      requestsApi.getPending(),
      vehiclesApi.getInventory(vehicleId),
      vehiclesApi.getCrew(vehicleId),
    ])
      .then(([reqRes, invRes, crewRes]) => {
        if (reqRes.status === "fulfilled") {
          setRequests(reqRes.value.requests);
        }
        if (invRes.status === "fulfilled" && invRes.value.inventory) {
          setInventory(invRes.value.inventory);
        }
        if (crewRes.status === "fulfilled" && crewRes.value.crew) {
          setCrew(crewRes.value.crew);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [vehicleId]);

  // Socket listeners for live updates
  useEffect(() => {
    const unsubNew = onRequestNew((payload) => {
      setRequests((prev) => [payload.request, ...prev]);
    });

    const unsubTaken = onRequestTaken((payload) => {
      setRequests((prev) => prev.filter((r) => r._id !== payload.requestId));
    });

    return () => {
      unsubNew();
      unsubTaken();
    };
  }, []);

  const handleAccept = async (request: AmbulanceRequest) => {
    setAcceptingId(request._id);
    setErrorMsg(null);
    try {
      const res = await requestsApi.accept(request._id, {
        driverName,
        vehicleId,
      });
      // Transition to active trip view
      onTripStart(res.trip);
    } catch (err: any) {
      if (err.message?.includes("409")) {
        setErrorMsg("This request was already accepted by another unit.");
        // The socket 'request:taken' should also fire and remove it, but we can do it locally too
        setRequests((prev) => prev.filter((r) => r._id !== request._id));
      } else {
        setErrorMsg("Failed to accept request. Please try again.");
      }
    } finally {
      setAcceptingId(null);
    }
  };

  const handleInventoryChange = (index: number, newQuantity: number) => {
    if (!inventory) return;
    if (newQuantity < 0) return;
    if (newQuantity === inventory.items[index].quantity) return;

    setConfirmUpdate({ itemIndex: index, newQuantity });
  };

  const handleDraftChange = (index: number, val: string) => {
    setDraftQuantities(prev => ({ ...prev, [index]: val }));
  };

  const commitDraft = (index: number) => {
    if (!inventory) return;
    const val = draftQuantities[index];
    if (val === undefined || val === "") return;
    
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      handleInventoryChange(index, parsed);
    }
    // Clear draft so it reverts if cancelled
    setDraftQuantities(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const submitInventoryUpdate = async () => {
    if (!confirmUpdate || !inventory) return;
    setIsUpdatingInventory(true);
    try {
      const itemToUpdate = inventory.items[confirmUpdate.itemIndex];
      const res = await vehiclesApi.updateInventory(vehicleId, {
        items: [{ name: itemToUpdate.name, quantity: confirmUpdate.newQuantity }]
      });
      setInventory(res.inventory);
    } catch (err) {
      console.error("Failed to update inventory", err);
    } finally {
      setIsUpdatingInventory(false);
      setConfirmUpdate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50dvh]">
        <div className="animate-spin text-ambigo-500 w-8 h-8 rounded-full border-2 border-current border-t-transparent mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto w-full max-w-lg mx-auto">
      {/* ── Tabs Header ── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 sticky top-0 bg-ambigo-950/80 backdrop-blur z-10 border-b border-ambigo-800">
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "requests"
              ? "text-white border-ambigo-500"
              : "text-ambigo-400 border-transparent hover:text-ambigo-200"
          }`}
        >
          Requests
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "inventory"
              ? "text-white border-ambigo-500"
              : "text-ambigo-400 border-transparent hover:text-ambigo-200"
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab("crew")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "crew"
              ? "text-white border-ambigo-500"
              : "text-ambigo-400 border-transparent hover:text-ambigo-200"
          }`}
        >
          Crew
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* ── Requests Tab ── */}
        {activeTab === "requests" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-1">
              Active Dispatches
            </h2>
            <p className="text-sm text-ambigo-400 mb-6">
              Accept a request to begin a trip. First-come, first-served.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg border border-alert-red/30 bg-alert-red/10 text-alert-red text-sm">
                {errorMsg}
              </div>
            )}

            {gpsError && (
              <div className="mb-4 p-3 rounded-lg border border-alert-orange/30 bg-alert-orange/10 text-alert-orange text-sm">
                ⚠ GPS unavailable: {gpsError}. Distance calculations disabled.
              </div>
            )}

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-ambigo-900/50 rounded-2xl border border-ambigo-800 border-dashed">
          <div className="w-16 h-16 bg-ambigo-800 rounded-full flex items-center justify-center mb-4">
            <Ambulance className="w-8 h-8 text-ambigo-600" />
          </div>
          <p className="text-ambigo-200 font-medium text-lg">No active requests</p>
          <p className="text-ambigo-500 text-sm mt-1">
            Stand by for incoming dispatches.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            let distanceStr = "Distance unavailable";
            if (gpsLocation) {
              const km = calculateDistance(
                gpsLocation.lat,
                gpsLocation.lng,
                req.incidentLocation.lat,
                req.incidentLocation.lng
              );
              distanceStr = `${km} km away`;
            }

            const pickupName =
              req.incidentLocation.address ||
              `${req.incidentLocation.lat.toFixed(
                5
              )}, ${req.incidentLocation.lng.toFixed(5)}`;

            // Format time ago naively
            const diffMin = Math.floor(
              (Date.now() - new Date(req.createdAt).getTime()) / 60000
            );
            const timeStr = diffMin === 0 ? "Just now" : `${diffMin} min ago`;

            return (
              <div
                key={req._id}
                className="bg-ambigo-900/80 border border-ambigo-700/50 p-4 rounded-xl shadow-lg flex flex-col gap-4 animate-fade-in"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-ambigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      Incident Location
                    </p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-ambigo-500 shrink-0 mt-0.5" />
                      <p className="text-white text-base truncate font-medium">
                        {pickupName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5 text-ambigo-300 text-sm font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-ambigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                    Destination
                  </p>
                  <p className="text-ambigo-200 text-sm truncate pl-6 relative">
                    <span className="absolute left-2.5 top-2 w-1.5 h-1.5 rounded-full bg-ambigo-600" />
                    {req.hospital}
                  </p>
                </div>

                <div className="pt-3 border-t border-ambigo-800 flex items-center justify-between gap-4">
                  <p className="text-ambigo-300 text-sm font-semibold">
                    {distanceStr}
                  </p>
                  <Button
                    onClick={() => handleAccept(req)}
                    isLoading={acceptingId === req._id}
                    disabled={acceptingId !== null || isOffline}
                    leftIcon={<Ambulance className="w-4 h-4" />}
                    className="shrink-0"
                  >
                    Accept
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
          </>
        )}

        {/* ── Inventory Tab ── */}
        {activeTab === "inventory" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-1">
              In-Stock Material
            </h2>
            <p className="text-sm text-ambigo-400 mb-6">
              Supplies loaded on vehicle {vehicleId}.
            </p>

            {!inventory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-ambigo-900/50 rounded-2xl border border-ambigo-800 border-dashed">
                <div className="w-16 h-16 bg-ambigo-800 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-ambigo-600" />
                </div>
                <p className="text-ambigo-200 font-medium text-lg">Not set up yet</p>
                <p className="text-ambigo-500 text-sm mt-1">
                  No inventory document exists for this vehicle.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.items.map((item, i) => {
                  const isLow = item.quantity < 3 || item.quantity <= item.lowStockThreshold;
                  return (
                    <div
                      key={i}
                      className="bg-ambigo-900/80 border border-ambigo-700/50 p-4 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isLow ? "bg-alert-red/20 text-alert-red" : "bg-ambigo-800 text-ambigo-400"}`}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-medium ${isLow ? "text-alert-red" : "text-white"}`}>
                            {item.name}
                          </p>
                          {isLow && (
                            <div className="flex items-center gap-1 mt-0.5 text-alert-red text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Low Stock</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleInventoryChange(i, item.quantity - 1)}
                          disabled={item.quantity <= 0}
                          className="w-8 h-8 rounded-lg bg-ambigo-800/80 flex items-center justify-center text-ambigo-400 hover:text-white hover:bg-ambigo-700 transition-colors disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center min-w-[48px] flex flex-col items-center">
                          <input
                            type="number"
                            value={draftQuantities[i] !== undefined ? draftQuantities[i] : item.quantity}
                            onChange={(e) => handleDraftChange(i, e.target.value)}
                            onBlur={() => commitDraft(i)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-12 bg-transparent text-xl font-bold text-white text-center outline-none border-b border-transparent focus:border-ambigo-500 transition-colors appearance-none"
                            style={{ MozAppearance: "textfield" }}
                          />
                          <p className="text-[10px] text-ambigo-400 uppercase font-medium mt-0.5 leading-none">{item.unit}</p>
                        </div>
                        <button
                          onClick={() => handleInventoryChange(i, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-ambigo-800/80 flex items-center justify-center text-ambigo-400 hover:text-white hover:bg-ambigo-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Crew Tab ── */}
        {activeTab === "crew" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-1">
              Crew Details
            </h2>
            <p className="text-sm text-ambigo-400 mb-6">
              Assigned to vehicle {vehicleId}.
            </p>

            {!crew ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-ambigo-900/50 rounded-2xl border border-ambigo-800 border-dashed">
                <div className="w-16 h-16 bg-ambigo-800 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-ambigo-600" />
                </div>
                <p className="text-ambigo-200 font-medium text-lg">Not set up yet</p>
                <p className="text-ambigo-500 text-sm mt-1">
                  No crew details assigned for this vehicle.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {crew.members.map((member, i) => (
                  <div
                    key={i}
                    className="bg-ambigo-900/80 border border-ambigo-700/50 p-4 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-ambigo-400 text-sm">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCrewMember(i)}
                        className="w-10 h-10 rounded-full bg-ambigo-800/60 border border-ambigo-600/40 hover:bg-ambigo-600/60 flex items-center justify-center transition-colors shrink-0"
                        title="View Resume"
                      >
                        <FileText className="w-4 h-4 text-ambigo-300" />
                      </button>
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="w-10 h-10 rounded-full bg-ambigo-800/60 border border-ambigo-600/40 hover:bg-ambigo-600/60 flex items-center justify-center transition-colors shrink-0"
                          title="Call"
                        >
                          <Phone className="w-4 h-4 text-ambigo-300" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmUpdate && inventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-ambigo-900 border border-ambigo-700/50 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-ambigo-800">
              <h3 className="font-semibold text-white">Confirm Update</h3>
              <button
                onClick={() => setConfirmUpdate(null)}
                className="text-ambigo-500 hover:text-white transition-colors p-1"
                disabled={isUpdatingInventory}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-ambigo-200 mb-4">
                Are you sure you want to change the quantity of{" "}
                <span className="text-white font-semibold">
                  {inventory.items[confirmUpdate.itemIndex].name}
                </span>{" "}
                to{" "}
                <span className="text-white font-bold">{confirmUpdate.newQuantity}</span>?
              </p>
              <div className="flex items-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirmUpdate(null)}
                  disabled={isUpdatingInventory}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={submitInventoryUpdate}
                  isLoading={isUpdatingInventory}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Crew Resume Modal ── */}
      {selectedCrewMember !== null && crew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-ambigo-900 border border-ambigo-700/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-ambigo-800 bg-ambigo-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ambigo-500 to-ambigo-300 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">
                    {crew.members[selectedCrewMember].name}
                  </h3>
                  <p className="text-ambigo-400 text-sm">
                    {crew.members[selectedCrewMember].role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCrewMember(null)}
                className="text-ambigo-500 hover:text-white transition-colors p-2 rounded-full hover:bg-ambigo-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Experience */}
              {crew.members[selectedCrewMember].experience && (
                <div>
                  <h4 className="flex items-center gap-2 text-ambigo-300 font-semibold mb-2 uppercase tracking-wider text-xs">
                    <Briefcase className="w-4 h-4" /> Experience
                  </h4>
                  <p className="text-ambigo-100 text-sm leading-relaxed bg-ambigo-800/30 p-3 rounded-lg border border-ambigo-700/30">
                    {crew.members[selectedCrewMember].experience}
                  </p>
                </div>
              )}

              {/* Certifications */}
              {crew.members[selectedCrewMember].certifications && crew.members[selectedCrewMember].certifications!.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-ambigo-300 font-semibold mb-2 uppercase tracking-wider text-xs">
                    <GraduationCap className="w-4 h-4" /> Certifications
                  </h4>
                  <ul className="space-y-2">
                    {crew.members[selectedCrewMember].certifications!.map((cert, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-ambigo-100 text-sm bg-ambigo-800/30 p-2.5 rounded-lg border border-ambigo-700/30">
                        <BadgeCheck className="w-4 h-4 text-alert-green shrink-0 mt-0.5" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {crew.members[selectedCrewMember].skills && crew.members[selectedCrewMember].skills!.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-ambigo-300 font-semibold mb-2 uppercase tracking-wider text-xs">
                    <AlertTriangle className="w-4 h-4" /> Core Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {crew.members[selectedCrewMember].skills!.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-full bg-ambigo-800/60 border border-ambigo-600/30 text-ambigo-200 text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {crew.members[selectedCrewMember].phone && (
              <div className="p-4 border-t border-ambigo-800 bg-ambigo-950/30">
                <a
                  href={`tel:${crew.members[selectedCrewMember].phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-ambigo-800 hover:bg-ambigo-700 text-white font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call {crew.members[selectedCrewMember].name.split(' ')[0]}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
