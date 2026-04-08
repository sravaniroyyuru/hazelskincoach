import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check, RotateCcw, SwitchCamera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PhotoAngle = "front" | "left" | "right" | "left_side" | "right_side";

const ANGLES: { key: PhotoAngle; label: string; emoji: string; instruction: string }[] = [
  { key: "front", label: "Front", emoji: "🪞", instruction: "Look straight at the camera" },
  { key: "left", label: "Left Profile", emoji: "👈", instruction: "Turn your head to show the left side" },
  { key: "right", label: "Right Profile", emoji: "👉", instruction: "Turn your head to show the right side" },
  { key: "left_side", label: "Left Side Angle", emoji: "📐", instruction: "Turn slightly to the left" },
  { key: "right_side", label: "Right Side Angle", emoji: "📐", instruction: "Turn slightly to the right" },
];

const PHOTO_STORAGE_KEY = "hazel-skin-photos";

interface StoredPhotoSet {
  date: string;
  photos: Record<PhotoAngle, string>;
}

interface SkinPhotoCaptureProps {
  /** If true, renders inline (no trigger button, auto-opens camera) */
  inline?: boolean;
  /** Called when all photos are saved */
  onComplete?: () => void;
}

export default function SkinPhotoCapture({ inline = false, onComplete }: SkinPhotoCaptureProps) {
  const [open, setOpen] = useState(inline);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const todayKey = new Date().toISOString().slice(0, 10);

  const hasTodayPhotos = (() => {
    try {
      const saved = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (!saved) return false;
      const sets: StoredPhotoSet[] = JSON.parse(saved);
      return sets.some((s) => s.date === todayKey);
    } catch {
      return false;
    }
  })();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  }, [facingMode, stopCamera]);

  const toggleFacing = useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const angle = ANGLES[currentAngle].key;
    setPhotos((prev) => ({ ...prev, [angle]: dataUrl }));
    stopCamera();
  }, [currentAngle, stopCamera]);

  // Start camera when dialog opens and no photo for current angle
  useEffect(() => {
    const currentAngleData = ANGLES[currentAngle];
    if (open && !completed && currentAngleData && !photos[currentAngleData.key]) {
      startCamera();
    }
    return () => { if (!open) stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentAngle, completed]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleOpen = () => {
    if (hasTodayPhotos && !inline) return;
    setPhotos({});
    setCurrentAngle(0);
    setCompleted(false);
    setCameraError(null);
    setOpen(true);
  };

  const handleRetake = () => {
    const angle = ANGLES[currentAngle].key;
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
    startCamera();
  };

  const handleNext = () => {
    if (currentAngle < ANGLES.length - 1) {
      setCurrentAngle((prev) => prev + 1);
    } else {
      try {
        const saved = localStorage.getItem(PHOTO_STORAGE_KEY);
        const sets: StoredPhotoSet[] = saved ? JSON.parse(saved) : [];
        const filtered = sets.filter((s) => s.date !== todayKey);
        filtered.push({ date: todayKey, photos: photos as Record<PhotoAngle, string> });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const trimmed = filtered.filter((s) => s.date >= cutoff.toISOString().slice(0, 10));
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(trimmed));
      } catch { /* ignore */ }
      setCompleted(true);
      onComplete?.();
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopCamera();
      setOpen(false);
    }
  };

  const currentAngleData = ANGLES[currentAngle];
  const currentPhoto = currentAngleData ? photos[currentAngleData.key] : null;

  // Hidden canvas for capture
  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />;

  const cameraContent = (
    <AnimatePresence mode="wait">
      {completed ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-6"
        >
          <div className="grid grid-cols-3 gap-2">
            {ANGLES.map((a) => (
              <div key={a.key} className="w-20 h-20 rounded-lg overflow-hidden border border-border">
                {photos[a.key] && (
                  <img src={photos[a.key]} alt={a.label} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Photos saved! Track your progress over time.
          </p>
          {!inline && (
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Done
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          key={currentAngleData?.key}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4 py-2"
        >
          <div className="flex gap-1.5">
            {ANGLES.map((a, i) => (
              <div
                key={a.key}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < currentAngle ? "bg-primary" : i === currentAngle ? "bg-primary/60" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="text-center space-y-1">
            <p className="text-2xl">{currentAngleData?.emoji}</p>
            <p className="font-semibold text-sm">{currentAngleData?.label}</p>
            <p className="text-xs text-muted-foreground">{currentAngleData?.instruction}</p>
          </div>

          {currentPhoto ? (
            <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-border">
              <img src={currentPhoto} alt={currentAngleData?.label} className="w-full h-full object-cover" />
              <button
                onClick={handleRetake}
                className="absolute bottom-2 right-2 h-8 px-3 rounded-lg bg-background/80 backdrop-blur text-xs font-medium flex items-center gap-1"
              >
                <RotateCcw size={12} /> Retake
              </button>
            </div>
          ) : cameraError ? (
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-destructive/30 flex flex-col items-center justify-center gap-2 text-destructive text-center px-4">
              <Camera size={32} />
              <span className="text-xs">{cameraError}</span>
            </div>
          ) : (
            <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="w-12 h-12 rounded-full bg-white border-4 border-white/60 shadow-lg"
                  aria-label="Take photo"
                />
              </div>
              <button
                onClick={toggleFacing}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center"
                aria-label="Switch camera"
              >
                <SwitchCamera size={14} />
              </button>
            </div>
          )}

          {currentPhoto && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
            >
              {currentAngle < ANGLES.length - 1 ? (
                <>Next <span>→</span></>
              ) : (
                <><Check size={16} /> Save Photos</>
              )}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Inline mode: render directly without dialog
  if (inline) {
    return (
      <div className="space-y-2">
        {hiddenCanvas}
        <div className="text-center">
          <h2 className="text-xl font-bold">Take your baseline photos</h2>
          <p className="text-sm text-muted-foreground mt-1">We'll guide you through 5 angles. These help you track progress over time.</p>
        </div>
        {cameraContent}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={`w-full card-warm p-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
          hasTodayPhotos ? "text-primary/70" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Camera size={18} />
        {hasTodayPhotos ? "✓ Today's photos taken" : "Take today's skin photos"}
      </button>

      {hiddenCanvas}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-serif">
              {completed ? "All done! 🎉" : "Skin Photo"}
            </DialogTitle>
          </DialogHeader>
          {cameraContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
