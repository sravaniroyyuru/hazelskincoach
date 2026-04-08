import { useState, useRef } from "react";
import { Camera, Loader2, X, RotateCcw, ScanLine, ListChecks } from "lucide-react";
import { useProductScan, type ScannedProduct } from "@/hooks/use-product-scan";
import { motion, AnimatePresence } from "framer-motion";

interface ProductPhotoCaptureProps {
  onProductIdentified: (product: ScannedProduct) => void;
  onClose: () => void;
}

const ProductPhotoCapture = ({ onProductIdentified, onClose }: ProductPhotoCaptureProps) => {
  const [mode, setMode] = useState<"product" | "ingredients">("product");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { scanProduct, loading, error } = useProductScan();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      // Fallback to file input
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCapturedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!capturedImage) return;
    const result = await scanProduct(capturedImage, mode);
    if (result && result.identified) {
      onProductIdentified(result);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    stopCamera();
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("product")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            mode === "product" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <ScanLine size={14} /> Product Photo
        </button>
        <button
          onClick={() => setMode("ingredients")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            mode === "ingredients" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <ListChecks size={14} /> Ingredients List
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {mode === "product"
          ? "Take a photo of the product front — the AI will identify it."
          : "Photograph the ingredients list on the back — the AI will extract and analyze them."}
      </p>

      {/* Camera / Preview */}
      {!capturedImage ? (
        <div className="space-y-3">
          {cameraActive ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={capture}
                  className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
                >
                  <Camera size={24} className="text-primary-foreground" />
                </button>
                <button
                  onClick={() => { stopCamera(); }}
                  className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="flex-1 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors"
              >
                <Camera size={20} />
                <span className="text-xs font-medium">Open Camera</span>
              </button>
              <label className="flex-1 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
                <ScanLine size={20} />
                <span className="text-xs font-medium">Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
            <img src={capturedImage} alt="Captured product" className="w-full h-full object-cover" />
            <button
              onClick={reset}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === "product" ? "Identifying..." : "Analyzing ingredients..."}
              </>
            ) : (
              <>
                <ScanLine size={16} />
                {mode === "product" ? "Identify Product" : "Analyze Ingredients"}
              </>
            )}
          </button>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>
      )}

      <button onClick={onClose} className="w-full text-xs text-muted-foreground py-1">
        Cancel
      </button>
    </div>
  );
};

export default ProductPhotoCapture;
