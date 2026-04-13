'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { saveSnapshot, savePhotoSet } from '@/lib/patient/storage'
import type { SkinType, SkinConcern, RoutineGoal, RoutineProduct } from '@/types/patient'
import type { PhotoAngle } from '@/components/patient/SkinCamera'
import SkinCamera from '@/components/patient/SkinCamera'
import ProductCamera from '@/components/patient/ProductCamera'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Leaf, ChevronRight, ChevronLeft, Check, Loader2, ScanLine, X } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

const SKIN_TYPES: { value: SkinType; label: string; description: string }[] = [
  { value: 'oily',        label: 'Oily',         description: 'Shiny, enlarged pores' },
  { value: 'dry',         label: 'Dry',          description: 'Tight, flaky, dull' },
  { value: 'combination', label: 'Combination',  description: 'Oily T-zone, dry cheeks' },
  { value: 'normal',      label: 'Normal',       description: 'Balanced, few concerns' },
  { value: 'sensitive',   label: 'Sensitive',    description: 'Reacts easily, prone to redness' },
]

const CONCERNS: { value: SkinConcern; label: string; emoji: string }[] = [
  { value: 'acne',         label: 'Acne & breakouts',  emoji: '🔴' },
  { value: 'pigmentation', label: 'Pigmentation',       emoji: '🟤' },
  { value: 'anti-ageing',  label: 'Anti-ageing',        emoji: '⏳' },
  { value: 'redness',      label: 'Redness',            emoji: '🌸' },
  { value: 'texture',      label: 'Texture',            emoji: '🪨' },
  { value: 'hydration',    label: 'Hydration',          emoji: '💧' },
  { value: 'sensitivity',  label: 'Sensitivity',        emoji: '🌿' },
  { value: 'dark-circles', label: 'Dark circles',       emoji: '🌑' },
]

const GOALS: { value: RoutineGoal; label: string; emoji: string }[] = [
  { value: 'clear-skin',   label: 'Clear skin',        emoji: '✨' },
  { value: 'glow',         label: 'Natural glow',      emoji: '🌟' },
  { value: 'anti-ageing',  label: 'Slow ageing',       emoji: '⏳' },
  { value: 'calm-redness', label: 'Calm redness',      emoji: '🌸' },
  { value: 'hydration',    label: 'Deep hydration',    emoji: '💧' },
  { value: 'consistency',  label: 'Build consistency', emoji: '📅' },
]

const PHOTO_ANGLES: PhotoAngle[] = ['front', 'left-side', 'right-side']
const ANGLE_LABELS: Record<PhotoAngle, string> = {
  'front': 'Front',
  'left-side': 'Left',
  'right-side': 'Right',
}

type Step = 'name' | 'skin-type' | 'concerns' | 'goals' | 'products' | 'photos' | 'photo-review' | 'welcome'
const STEPS: Step[] = ['name', 'skin-type', 'concerns', 'goals', 'products', 'photos', 'photo-review', 'welcome']

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('name')
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [userName, setUserName] = useState('')
  const [skinType, setSkinType] = useState<SkinType | null>(null)
  const [concerns, setConcerns] = useState<SkinConcern[]>([])
  const [goals, setGoals] = useState<RoutineGoal[]>([])
  const [products, setProducts] = useState<RoutineProduct[]>([])
  const [capturedPhotos, setCapturedPhotos] = useState<Record<PhotoAngle, string> | null>(null)

  // Product search state
  const [productQuery, setProductQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundProduct, setFoundProduct] = useState<Partial<RoutineProduct> | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  function toggleConcern(c: SkinConcern) {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function toggleGoal(g: RoutineGoal) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function next() {
    setDirection(1)
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function prev() {
    setDirection(-1)
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function handleProductSearch() {
    if (!productQuery.trim()) return
    setIsSearching(true)
    setFoundProduct(null)
    try {
      const res = await fetch('/api/patient/product-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: productQuery }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFoundProduct(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not find product — try again')
    } finally {
      setIsSearching(false)
    }
  }

  function addFoundProduct() {
    if (!foundProduct?.name) return
    const p: RoutineProduct = {
      id: uuidv4(),
      name: foundProduct.name ?? '',
      brand: foundProduct.brand ?? null,
      category: foundProduct.category ?? null,
      keyIngredients: foundProduct.keyIngredients ?? [],
      flags: foundProduct.flags ?? [],
      status: 'active',
    }
    setProducts(prev => [...prev, p])
    setFoundProduct(null)
    setProductQuery('')
    toast.success(`${p.name} added`)
  }

  function handleScannedProduct(scanned: Omit<RoutineProduct, 'id' | 'status'>) {
    const p: RoutineProduct = { id: uuidv4(), status: 'active', ...scanned }
    setProducts(prev => [...prev, p])
    setShowCamera(false)
    toast.success(`${p.name} added`)
  }

  function removeProduct(id: string) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function handlePhotosComplete(photos: Record<PhotoAngle, string>) {
    const today = new Date().toISOString().split('T')[0]
    savePhotoSet({
      date: today,
      photos: (Object.entries(photos) as [PhotoAngle, string][]).map(([angle, dataUrl]) => ({
        angle,
        dataUrl,
      })),
    })
    setCapturedPhotos(photos)
    toast.success('Photos saved 🌿')
    setDirection(1)
    setStep('photo-review')
  }

  function handleComplete() {
    saveSnapshot({
      userName,
      onboarded: true,
      skinType,
      concerns,
      goals,
      products,
      routineSteps: [],
    })
    router.replace('/patient/today')
  }

  const stepIndex = STEPS.indexOf(step)
  const showBack = step !== 'name' && step !== 'welcome' && step !== 'photos' && step !== 'photo-review'
  // Hide back on photos/photo-review since SkinCamera has its own skip control
  // photo-review has its own retake button

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Leaf className="text-[#7C6B5A]" size={22} />
        <span className="text-lg font-semibold tracking-wide text-stone-800">hazel</span>
      </div>

      {/* Progress dots — hide on photos/photo-review to avoid clutter */}
      {step !== 'photos' && (
        <div className="flex gap-2 mb-8">
          {STEPS.filter(s => s !== 'photo-review').map((s, i) => {
            const adjustedIndex = stepIndex > STEPS.indexOf('photo-review') ? stepIndex - 1 : stepIndex
            return (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                i === adjustedIndex ? 'w-6 bg-[#7C6B5A]' :
                i < adjustedIndex  ? 'w-4 bg-[#C4B5A5]' : 'w-1.5 bg-stone-300'
              }`} />
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>

        {/* Name */}
        {step === 'name' && (
          <motion.div key="name" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Welcome to Hazel</h1>
              <p className="text-stone-500 text-sm">Your personal skin coach. Let's start with your name.</p>
            </div>
            <Input
              placeholder="Your first name"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && userName.trim() && next()}
              className="bg-white border-stone-200 h-12 text-base"
              autoFocus
            />
            <Button onClick={next} disabled={!userName.trim()}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Skin type */}
        {step === 'skin-type' && (
          <motion.div key="skin-type" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            {showBack && (
              <button onClick={prev} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 self-start -mb-2">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your skin type</h1>
              <p className="text-stone-500 text-sm">This helps Hazel tailor your routine.</p>
            </div>
            <div className="flex flex-col gap-3">
              {SKIN_TYPES.map(({ value, label, description }) => (
                <button key={value} onClick={() => setSkinType(value)}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                    skinType === value
                      ? 'border-[#7C6B5A] bg-[#F5F0EB]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  <div>
                    <div className="font-medium text-stone-800">{label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{description}</div>
                  </div>
                  {skinType === value && <Check size={16} className="text-[#7C6B5A]" />}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={!skinType}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Concerns */}
        {step === 'concerns' && (
          <motion.div key="concerns" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            {showBack && (
              <button onClick={prev} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 self-start -mb-2">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Skin concerns</h1>
              <p className="text-stone-500 text-sm">Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONCERNS.map(({ value, label, emoji }) => (
                <button key={value} onClick={() => toggleConcern(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                    concerns.includes(value)
                      ? 'border-[#7C6B5A] bg-[#F5F0EB] text-stone-800'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}>
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={concerns.length === 0}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Goals */}
        {step === 'goals' && (
          <motion.div key="goals" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            {showBack && (
              <button onClick={prev} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 self-start -mb-2">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your goals</h1>
              <p className="text-stone-500 text-sm">What do you want to achieve?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(({ value, label, emoji }) => (
                <button key={value} onClick={() => toggleGoal(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                    goals.includes(value)
                      ? 'border-[#7C6B5A] bg-[#F5F0EB] text-stone-800'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}>
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={goals.length === 0}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Products */}
        {step === 'products' && !showCamera && (
          <motion.div key="products" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-5">
            {showBack && (
              <button onClick={prev} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 self-start -mb-1">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your products</h1>
              <p className="text-stone-500 text-sm">
                Add anything you already use. Hazel will track ingredients and flag any conflicts.
              </p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-col gap-3">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Search by name</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. CeraVe Moisturiser, Niacinamide..."
                  value={productQuery}
                  onChange={e => { setProductQuery(e.target.value); setFoundProduct(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleProductSearch()}
                  className="border-stone-200 h-10 text-sm"
                />
                <Button size="sm" onClick={handleProductSearch} disabled={isSearching || !productQuery.trim()}
                  className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-lg h-10 px-3 shrink-0">
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
                </Button>
              </div>

              {foundProduct && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-[#F5F0EB] rounded-xl border border-[#E8DDD4]">
                  <p className="text-sm font-medium text-stone-800">{foundProduct.name}</p>
                  {foundProduct.brand && <p className="text-xs text-stone-500">{foundProduct.brand}</p>}
                  {foundProduct.keyIngredients && foundProduct.keyIngredients.length > 0 && (
                    <p className="text-xs text-stone-400 mt-1">
                      Key: {foundProduct.keyIngredients.slice(0, 3).join(', ')}
                    </p>
                  )}
                  <Button size="sm" onClick={addFoundProduct}
                    className="mt-2 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-lg h-7 text-xs">
                    + Add this product
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Camera scan */}
            <button onClick={() => setShowCamera(true)}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-200 text-left hover:border-[#7C6B5A] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center shrink-0">
                <ScanLine size={18} className="text-[#7C6B5A]" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">Scan a product photo</p>
                <p className="text-xs text-stone-400">Point your camera at the label or bottle</p>
              </div>
            </button>

            {/* Added products */}
            {products.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Added ({products.length})</p>
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-stone-100">
                    <div>
                      <p className="text-sm font-medium text-stone-800">{p.name}</p>
                      {p.brand && <p className="text-xs text-stone-400">{p.brand}</p>}
                    </div>
                    <button onClick={() => removeProduct(p.id)} className="text-stone-300 hover:text-red-400 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={next}
                className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
                {products.length > 0
                  ? `Continue with ${products.length} product${products.length > 1 ? 's' : ''}`
                  : 'Continue'} <ChevronRight size={16} className="ml-1" />
              </Button>
              {products.length === 0 && (
                <button onClick={next} className="text-sm text-stone-400 hover:text-stone-600 py-1">
                  Skip for now — I'll add these later
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Product camera */}
        {step === 'products' && showCamera && (
          <motion.div key="camera" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-stone-800">Scan product</h1>
              <button onClick={() => setShowCamera(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-stone-500 text-sm -mt-2">Point at the label or front of the bottle.</p>
            <ProductCamera
              onProductFound={handleScannedProduct}
              onClose={() => setShowCamera(false)}
            />
          </motion.div>
        )}

        {/* Photos */}
        {step === 'photos' && (
          <motion.div key="photos" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Baseline photos</h1>
              <p className="text-stone-500 text-sm">
                Front, left, and right — so you can see your skin change over time. These stay on your device only.
              </p>
            </div>
            <SkinCamera
              angles={PHOTO_ANGLES}
              onComplete={handlePhotosComplete}
              onSkip={() => { setDirection(1); setStep('welcome') }}
            />
          </motion.div>
        )}

        {/* Photo review */}
        {step === 'photo-review' && capturedPhotos && (
          <motion.div key="photo-review" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Looking good 🌿</h1>
              <p className="text-stone-500 text-sm">
                Your baseline photos are saved. Hazel will compare against these over time.
              </p>
            </div>

            {/* Photo thumbnails */}
            <div className="grid grid-cols-3 gap-3">
              {PHOTO_ANGLES.map(angle => (
                <div key={angle} className="flex flex-col items-center gap-1.5">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#7C6B5A] bg-stone-100">
                    <img
                      src={capturedPhotos[angle]}
                      alt={`${angle} view`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-stone-500 font-medium">{ANGLE_LABELS[angle]}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={next}
                className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
                Continue <ChevronRight size={16} className="ml-1" />
              </Button>
              <button
                onClick={() => { setDirection(-1); setStep('photos') }}
                className="text-sm text-stone-400 hover:text-stone-600 py-1"
              >
                Retake photos
              </button>
            </div>
          </motion.div>
        )}

        {/* Welcome */}
        {step === 'welcome' && (
          <motion.div key="welcome" custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F0EB] flex items-center justify-center">
              <Leaf className="text-[#7C6B5A]" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-2">
                You're all set, {userName} 🌿
              </h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                Hazel will help you track your skin, understand your patterns, and feel more at ease — one day at a time.
                {capturedPhotos && ' Your baseline photos are saved.'}
                {products.length > 0 && ` ${products.length} product${products.length > 1 ? 's' : ''} added to your library.`}
              </p>
            </div>
            <Button onClick={handleComplete}
              className="w-full bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Start my skin journey
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
