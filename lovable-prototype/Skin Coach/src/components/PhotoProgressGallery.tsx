import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const PHOTO_STORAGE_KEY = "hazel-skin-photos";

type PhotoAngle = "front" | "left" | "right" | "left_side" | "right_side";

interface StoredPhotoSet {
  date: string;
  photos: Record<string, string>;
}

const ANGLE_LABELS: Record<string, string> = {
  front: "Front",
  left: "Left",
  right: "Right",
  left_side: "Left Side",
  right_side: "Right Side",
};

export default function PhotoProgressGallery() {
  const [photoSets, setPhotoSets] = useState<StoredPhotoSet[]>([]);
  const [compareA, setCompareA] = useState(0); // oldest
  const [compareB, setCompareB] = useState(0); // newest
  const [activeAngle, setActiveAngle] = useState<string>("front");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (!saved) return;
      const sets: StoredPhotoSet[] = JSON.parse(saved);
      // Sort oldest first
      sets.sort((a, b) => a.date.localeCompare(b.date));
      setPhotoSets(sets);
      if (sets.length >= 2) {
        setCompareA(0);
        setCompareB(sets.length - 1);
      } else if (sets.length === 1) {
        setCompareA(0);
        setCompareB(0);
      }
    } catch {
      // ignore
    }
  }, []);

  if (photoSets.length === 0) return null;

  const setA = photoSets[compareA];
  const setB = photoSets[compareB];

  const availableAngles = Array.from(
    new Set([
      ...Object.keys(setA?.photos || {}),
      ...Object.keys(setB?.photos || {}),
    ])
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const daysBetween = () => {
    if (!setA || !setB || setA.date === setB.date) return null;
    const a = new Date(setA.date);
    const b = new Date(setB.date);
    const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const days = daysBetween();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Photo Progress</h3>
        {days !== null && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {days} day{days !== 1 ? "s" : ""} apart
          </span>
        )}
      </div>

      {/* Angle selector */}
      {availableAngles.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {availableAngles.map((angle) => (
            <button
              key={angle}
              onClick={() => setActiveAngle(angle)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeAngle === angle
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {ANGLE_LABELS[angle] || angle}
            </button>
          ))}
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={11} />
            <span className="font-medium">{setA ? formatDate(setA.date) : "—"}</span>
          </div>
          <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
            {setA?.photos?.[activeAngle] ? (
              <img
                src={setA.photos[activeAngle]}
                alt={`${ANGLE_LABELS[activeAngle] || activeAngle} - ${setA.date}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No photo
              </div>
            )}
          </div>
          {photoSets.length > 2 && (
            <div className="flex justify-center gap-1">
              <button
                onClick={() => setCompareA(Math.max(0, compareA - 1))}
                disabled={compareA === 0}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-25"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCompareA(Math.min(compareB - 1, compareA + 1))}
                disabled={compareA >= compareB - 1}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-25"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* After / Current */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={11} />
            <span className="font-medium">{setB ? formatDate(setB.date) : "—"}</span>
            {compareB === photoSets.length - 1 && (
              <span className="ml-1 text-[9px] font-semibold text-primary">Latest</span>
            )}
          </div>
          <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
            {setB?.photos?.[activeAngle] ? (
              <img
                src={setB.photos[activeAngle]}
                alt={`${ANGLE_LABELS[activeAngle] || activeAngle} - ${setB.date}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No photo
              </div>
            )}
          </div>
          {photoSets.length > 2 && (
            <div className="flex justify-center gap-1">
              <button
                onClick={() => setCompareB(Math.max(compareA + 1, compareB - 1))}
                disabled={compareB <= compareA + 1}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-25"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCompareB(Math.min(photoSets.length - 1, compareB + 1))}
                disabled={compareB === photoSets.length - 1}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-25"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline strip */}
      {photoSets.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-medium">All entries</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photoSets.map((set, i) => {
              const isSelected = i === compareA || i === compareB;
              const thumb = set.photos?.front || Object.values(set.photos)[0];
              return (
                <button
                  key={set.date}
                  onClick={() => {
                    // Click to set as compareB (latest comparison)
                    if (i > compareA) setCompareB(i);
                    else if (i < compareB) setCompareA(i);
                  }}
                  className={`flex-shrink-0 w-14 space-y-1 ${isSelected ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
                >
                  <div
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      isSelected ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={set.date} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <p className="text-[9px] text-center text-muted-foreground truncate">
                    {formatDate(set.date)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
