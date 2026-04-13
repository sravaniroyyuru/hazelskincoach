'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getSnapshot, saveRoutineStep, deleteRoutineStep, saveProduct, deleteProduct
} from '@/lib/patient/storage'
import type { RoutineStep, RoutineProduct } from '@/types/patient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Plus, Trash2, Pencil, Sun, Moon, Loader2, Package, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import ProductCamera from '@/components/patient/ProductCamera'

type StepDialogState = {
  open: boolean
  editing: RoutineStep | null
  timeOfDay: 'am' | 'pm'
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Every day',
  every_other_day: 'Every other day',
  weekly: 'Weekly',
  as_needed: 'As needed',
}

export default function RoutinePage() {
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [products, setProducts] = useState<RoutineProduct[]>([])
  const [dialog, setDialog] = useState<StepDialogState>({ open: false, editing: null, timeOfDay: 'am' })
  const [productSearch, setProductSearch] = useState('')
  const [isLooking, setIsLooking] = useState(false)
  const [foundProduct, setFoundProduct] = useState<Partial<RoutineProduct> | null>(null)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [showProductCamera, setShowProductCamera] = useState(false)

  // Step form state
  const [stepName, setStepName] = useState('')
  const [stepFrequency, setStepFrequency] = useState<RoutineStep['frequency']>('daily')
  const [stepNotes, setStepNotes] = useState('')
  const [stepProductId, setStepProductId] = useState<string | null>(null)

  useEffect(() => {
    const snap = getSnapshot()
    setSteps(snap.routineSteps)
    setProducts(snap.products)
  }, [])

  function openAdd(timeOfDay: 'am' | 'pm') {
    setStepName('')
    setStepFrequency('daily')
    setStepNotes('')
    setStepProductId(null)
    setFoundProduct(null)
    setDialog({ open: true, editing: null, timeOfDay })
  }

  function openEdit(step: RoutineStep) {
    setStepName(step.stepName)
    setStepFrequency(step.frequency)
    setStepNotes(step.usageNotes)
    setStepProductId(step.productId)
    setFoundProduct(null)
    setDialog({ open: true, editing: step, timeOfDay: step.timeOfDay })
  }

  function handleSaveStep() {
    const linkedProduct = products.find(p => p.id === stepProductId) ?? null
    const step: RoutineStep = {
      id: dialog.editing?.id ?? uuidv4(),
      stepName: stepName.trim(),
      timeOfDay: dialog.timeOfDay,
      frequency: stepFrequency,
      sortOrder: dialog.editing?.sortOrder ?? steps.filter(s => s.timeOfDay === dialog.timeOfDay).length,
      isPaused: false,
      usageNotes: stepNotes.trim(),
      productId: stepProductId,
      product: linkedProduct,
    }
    saveRoutineStep(step)
    const snap = getSnapshot()
    setSteps(snap.routineSteps)
    setDialog({ open: false, editing: null, timeOfDay: 'am' })
    toast.success(dialog.editing ? 'Step updated' : 'Step added')
  }

  function handleDeleteStep(id: string) {
    deleteRoutineStep(id)
    setSteps(getSnapshot().routineSteps)
    toast.success('Step removed')
  }

  async function handleProductLookup() {
    if (!productSearch.trim()) return
    setIsLooking(true)
    setFoundProduct(null)
    try {
      const res = await fetch('/api/patient/product-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: productSearch }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFoundProduct(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not look up product')
    } finally {
      setIsLooking(false)
    }
  }

  function handleAddFoundProduct() {
    if (!foundProduct?.name) return
    const product: RoutineProduct = {
      id: uuidv4(),
      name: foundProduct.name ?? '',
      brand: foundProduct.brand ?? null,
      category: foundProduct.category ?? null,
      keyIngredients: foundProduct.keyIngredients ?? [],
      flags: foundProduct.flags ?? [],
      status: 'active',
    }
    saveProduct(product)
    setProducts(getSnapshot().products)
    setStepProductId(product.id)
    setShowProductSearch(false)
    setProductSearch('')
    setFoundProduct(null)
    toast.success(`${product.name} added`)
  }

  function handleScannedProduct(scanned: Omit<RoutineProduct, 'id' | 'status'>) {
    const product: RoutineProduct = {
      id: uuidv4(),
      status: 'active',
      ...scanned,
    }
    saveProduct(product)
    setProducts(getSnapshot().products)
    setStepProductId(product.id)
    setShowProductCamera(false)
    toast.success(`${product.name} added from photo`)
  }

  const amSteps = steps.filter(s => s.timeOfDay === 'am').sort((a, b) => a.sortOrder - b.sortOrder)
  const pmSteps = steps.filter(s => s.timeOfDay === 'pm').sort((a, b) => a.sortOrder - b.sortOrder)

  function StepList({ items, time }: { items: RoutineStep[]; time: 'am' | 'pm' }) {
    return (
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {time === 'am' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-400" />}
            <h2 className="text-sm font-semibold text-stone-700">
              {time === 'am' ? 'Morning' : 'Evening'} routine
            </h2>
          </div>
          <Button variant="ghost" size="sm" className="text-[#7C6B5A] h-7 px-2 rounded-lg"
            onClick={() => openAdd(time)}>
            <Plus size={14} className="mr-1" /> Add step
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">No steps yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(step => (
              <div key={step.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-800">{step.stepName}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-stone-400 border-stone-200">
                      {FREQUENCY_LABELS[step.frequency]}
                    </Badge>
                  </div>
                  {step.product && (
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                      <Package size={10} /> {step.product.name}
                      {step.product.brand && ` · ${step.product.brand}`}
                    </p>
                  )}
                  {step.usageNotes && (
                    <p className="text-xs text-stone-400 mt-0.5 italic">{step.usageNotes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(step)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDeleteStep(step.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">My routine</h1>
      <p className="text-stone-500 text-sm mb-6">Build your AM & PM skincare steps.</p>

      <StepList items={amSteps} time="am" />
      <StepList items={pmSteps} time="pm" />

      {/* Products library */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Product library</h2>
          <div className="flex flex-col gap-2">
            {products.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-800">{p.name}</p>
                  {p.brand && <p className="text-xs text-stone-400">{p.brand}</p>}
                  {p.keyIngredients && p.keyIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.keyIngredients.slice(0, 3).map(ing => (
                        <Badge key={ing} variant="outline" className="text-[10px] px-1.5 py-0 text-stone-400 border-stone-200">
                          {ing}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => { deleteProduct(p.id); setProducts(getSnapshot().products) }}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step dialog */}
      <Dialog open={dialog.open} onOpenChange={open => setDialog(d => ({ ...d, open }))}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dialog.editing ? 'Edit step' : `Add ${dialog.timeOfDay === 'am' ? 'morning' : 'evening'} step`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Step name</label>
              <Input
                placeholder="e.g. Cleanser, SPF, Vitamin C serum..."
                value={stepName}
                onChange={e => setStepName(e.target.value)}
                className="border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Frequency</label>
              <Select value={stepFrequency} onValueChange={v => setStepFrequency(v as RoutineStep['frequency'])}>
                <SelectTrigger className="border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product link */}
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Linked product (optional)</label>
              {stepProductId ? (
                <div className="flex items-center justify-between bg-[#F5F0EB] rounded-xl px-3 py-2">
                  <span className="text-sm text-stone-700">
                    {products.find(p => p.id === stepProductId)?.name ?? 'Product'}
                  </span>
                  <button onClick={() => setStepProductId(null)} className="text-xs text-stone-400 hover:text-stone-600">Remove</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.length > 0 && (
                    <Select value="" onValueChange={v => setStepProductId(v)}>
                      <SelectTrigger className="border-stone-200">
                        <SelectValue placeholder="Choose from library..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Always-visible search */}
                  <div className="flex flex-col gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search product name or brand..."
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setFoundProduct(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleProductLookup()}
                        className="border-stone-200 h-9 text-sm bg-white"
                      />
                      <Button size="sm" onClick={handleProductLookup} disabled={isLooking || !productSearch.trim()}
                        className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-lg h-9 px-3 shrink-0">
                        {isLooking ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
                      </Button>
                    </div>
                    {foundProduct && (
                      <div className="p-3 bg-white rounded-lg border border-stone-200">
                        <p className="text-sm font-medium text-stone-800">{foundProduct.name}</p>
                        {foundProduct.brand && <p className="text-xs text-stone-500">{foundProduct.brand}</p>}
                        {foundProduct.keyIngredients && foundProduct.keyIngredients.length > 0 && (
                          <p className="text-xs text-stone-400 mt-1">
                            Key: {foundProduct.keyIngredients.slice(0, 3).join(', ')}
                          </p>
                        )}
                        <Button size="sm" className="mt-2 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-lg h-7 text-xs"
                          onClick={handleAddFoundProduct}>
                          Add to library
                        </Button>
                      </div>
                    )}
                    <button
                      className="text-xs text-[#7C6B5A] text-left hover:underline flex items-center gap-1 self-start"
                      onClick={() => setShowProductCamera(true)}
                    >
                      <ScanLine size={11} /> Or scan product photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Usage notes (optional)</label>
              <Textarea
                placeholder="e.g. 2-3 drops, avoid eye area..."
                value={stepNotes}
                onChange={e => setStepNotes(e.target.value)}
                className="resize-none h-16 border-stone-200 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}
              className="rounded-xl flex-1">Cancel</Button>
            <Button onClick={handleSaveStep} disabled={!stepName.trim()}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-xl flex-1">
              {dialog.editing ? 'Save changes' : 'Add step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product camera dialog */}
      <Dialog open={showProductCamera} onOpenChange={setShowProductCamera}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ScanLine size={16} className="text-[#7C6B5A]" /> Scan product
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-stone-400 -mt-2">
            Point your camera at the product label or front of the bottle.
          </p>
          <ProductCamera
            onProductFound={handleScannedProduct}
            onClose={() => setShowProductCamera(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
