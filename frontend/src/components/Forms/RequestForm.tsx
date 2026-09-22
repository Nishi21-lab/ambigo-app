import React, { useState, useRef, useEffect } from "react";
import { Ambulance, UserCircle, Hash, MapPin } from "lucide-react";
import { Button } from "../UI/Button";

interface RequestFormProps {
  onSubmit: (data: {
    driverName: string;
    vehicleId: string;
    pickup: string;
    hospital: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const HOSPITALS = [
  "Apollo Hospitals, Jubilee Hills",
  "AIG Hospitals, Gachibowli",
  "CARE Hospitals, Banjara Hills",
  "KIMS Hospital, Secunderabad",
  "Yashoda Hospitals, Somajiguda",
  "Continental Hospitals, Nanakramguda",
];

const PICKUP_LOCATIONS = [
  "Current GPS Location",
  "Cyber Towers, Hitec City",
  "Madhapur Metro Station",
  "Jubilee Hills Checkpost",
  "Road No. 36, Jubilee Hills",
  "Gachibowli ORR Junction",
  "Banjara Hills Road No. 1",
  "Kondapur Signal",
  "Kukatpally Y Junction",
];

function AutocompleteInput({
  id,
  name,
  placeholder,
  value,
  options,
  onChange,
}: {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((loc) =>
    loc.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 5); // limit to 5 suggestions

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="glass-input w-full"
        required
        autoComplete="off"
      />
      
      {isOpen && value && filtered.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-ambigo-900 border border-ambigo-700/50 rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-in max-h-48 overflow-y-auto">
          {filtered.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-ambigo-200 hover:bg-ambigo-800 hover:text-white transition-colors flex items-center gap-2"
                onClick={() => {
                  // Simulate an event for the onChange handler
                  onChange({
                    target: { name, value: loc },
                  } as React.ChangeEvent<HTMLInputElement>);
                  setIsOpen(false);
                }}
              >
                <MapPin className="w-3.5 h-3.5 text-ambigo-500 shrink-0" />
                <span className="truncate">{loc}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const RequestForm: React.FC<RequestFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [form, setForm] = useState({
    driverName: localStorage.getItem("ambigo_driver_name") ?? "",
    vehicleId: localStorage.getItem("ambigo_vehicle_id") ?? "",
    pickup: "",
    hospital: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Persist driver identity for future sessions
    localStorage.setItem("ambigo_driver_name", form.driverName);
    localStorage.setItem("ambigo_vehicle_id", form.vehicleId);
    await onSubmit(form);
  };

  const isValid = Object.values(form).every((v) => v.trim().length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Driver Identity */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ambigo-400 uppercase tracking-widest">
          Driver Identity
        </p>
        <div className="relative">
          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ambigo-400" />
          <input
            id="driverName"
            name="driverName"
            type="text"
            placeholder="Your name"
            value={form.driverName}
            onChange={handleChange}
            className="glass-input w-full pl-10"
            required
            autoComplete="name"
          />
        </div>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ambigo-400" />
          <input
            id="vehicleId"
            name="vehicleId"
            type="text"
            placeholder="Vehicle ID (e.g. GJ-01-Z-1234)"
            value={form.vehicleId}
            onChange={handleChange}
            className="glass-input w-full pl-10"
            required
            autoComplete="off"
          />
        </div>
      </div>

      <div className="border-t border-ambigo-700/50" />

      {/* Route Details */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ambigo-400 uppercase tracking-widest">
          Route Details
        </p>
        <AutocompleteInput
          id="pickup"
          name="pickup"
          placeholder="Pickup location"
          value={form.pickup}
          options={PICKUP_LOCATIONS}
          onChange={handleChange}
        />
        <AutocompleteInput
          id="hospital"
          name="hospital"
          placeholder="Destination hospital"
          value={form.hospital}
          options={HOSPITALS}
          onChange={handleChange}
        />
      </div>

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        disabled={!isValid}
        leftIcon={<Ambulance className="w-4 h-4" />}
        className="mt-2"
      >
        Request Emergency Route
      </Button>
    </form>
  );
};

