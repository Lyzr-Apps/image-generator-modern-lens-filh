'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { LuSparkles, LuDownload, LuRefreshCw, LuPenLine, LuBookmark, LuImage, LuPalette, LuTrash2, LuX, LuChevronLeft, LuChevronRight, LuZoomIn, LuFilter, LuLayoutGrid, LuSearch, LuMenu, LuInfo, LuLoader, LuCircleAlert, LuCheck, LuExternalLink } from 'react-icons/lu'

// ─── Constants ───────────────────────────────────────────────────────────────

const IMAGE_AGENT_ID = '69972037953ca8351f0efd92'
const MAX_CHARS = 500
const GALLERY_STORAGE_KEY = 'pixelmuse_gallery'

const STYLES = [
  { id: 'anime', label: 'Anime', color: 'bg-pink-500' },
  { id: 'watercolor', label: 'Watercolor', color: 'bg-sky-400' },
  { id: 'cyberpunk', label: 'Cyberpunk', color: 'bg-violet-500' },
  { id: 'photorealistic', label: 'Photorealistic', color: 'bg-emerald-500' },
  { id: 'oil-painting', label: 'Oil Painting', color: 'bg-amber-600' },
  { id: 'pixel-art', label: 'Pixel Art', color: 'bg-lime-500' },
  { id: '3d-render', label: '3D Render', color: 'bg-cyan-500' },
  { id: 'sketch', label: 'Sketch', color: 'bg-stone-400' },
] as const

interface GalleryItem {
  id: string
  imageUrl: string
  prompt: string
  style: string
  description: string
  createdAt: string
}

interface GenerationResult {
  imageUrl: string
  promptUsed: string
  styleApplied: string
  description: string
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_GALLERY: GalleryItem[] = [
  {
    id: 'sample-1',
    imageUrl: 'https://picsum.photos/seed/pixelmuse1/512/512',
    prompt: 'A mystical forest at dawn with golden light filtering through ancient trees',
    style: 'Watercolor',
    description: 'A serene watercolor painting depicting an enchanted forest bathed in warm dawn light.',
    createdAt: '2025-02-18T14:30:00Z',
  },
  {
    id: 'sample-2',
    imageUrl: 'https://picsum.photos/seed/pixelmuse2/512/512',
    prompt: 'Futuristic neon-lit cityscape with flying vehicles and holographic billboards',
    style: 'Cyberpunk',
    description: 'A vibrant cyberpunk metropolis illuminated by neon lights and holographic displays.',
    createdAt: '2025-02-17T10:15:00Z',
  },
  {
    id: 'sample-3',
    imageUrl: 'https://picsum.photos/seed/pixelmuse3/512/512',
    prompt: 'A majestic dragon perched on a mountain peak surrounded by clouds',
    style: 'Anime',
    description: 'An anime-style dragon with iridescent scales resting atop a cloud-wrapped mountain.',
    createdAt: '2025-02-16T18:45:00Z',
  },
  {
    id: 'sample-4',
    imageUrl: 'https://picsum.photos/seed/pixelmuse4/512/512',
    prompt: 'Vintage Parisian cafe in autumn with falling leaves',
    style: 'Oil Painting',
    description: 'A richly textured oil painting of a cozy Parisian cafe surrounded by autumn foliage.',
    createdAt: '2025-02-15T09:20:00Z',
  },
  {
    id: 'sample-5',
    imageUrl: 'https://picsum.photos/seed/pixelmuse5/512/512',
    prompt: 'Space station orbiting a ringed planet with two moons',
    style: '3D Render',
    description: 'A photorealistic 3D render of a futuristic space station in orbit around a gas giant.',
    createdAt: '2025-02-14T22:00:00Z',
  },
]

const SAMPLE_RESULT: GenerationResult = {
  imageUrl: 'https://picsum.photos/seed/pixelmuse-gen/768/768',
  promptUsed: 'A lone astronaut standing on a crystalline alien landscape, with twin suns setting on the horizon, dramatic lighting, cinematic composition',
  styleApplied: 'Photorealistic',
  description: 'A breathtaking photorealistic image of a solitary astronaut silhouetted against the amber glow of twin suns. The crystalline terrain reflects prismatic light across the alien surface, creating an otherworldly atmosphere of isolation and wonder.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

function Sidebar({
  activeScreen,
  onNavigate,
  collapsed,
  onToggle,
  galleryCount,
}: {
  activeScreen: 'create' | 'gallery'
  onNavigate: (s: 'create' | 'gallery') => void
  collapsed: boolean
  onToggle: () => void
  galleryCount: number
}) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ backgroundColor: 'hsl(20 40% 5%)' }}
    >
      <div className={`flex items-center h-16 border-b border-border px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
              <LuSparkles className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground font-sans">PixelMuse</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <LuSparkles className="w-4 h-4 text-accent-foreground" />
          </div>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 w-6 h-6 rounded-full bg-secondary border-2 border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <LuChevronRight className="w-3 h-3" /> : <LuChevronLeft className="w-3 h-3" />}
      </button>

      <nav className="flex-1 py-4 px-2 space-y-1">
        <button
          onClick={() => onNavigate('create')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeScreen === 'create' ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          aria-label="Create"
        >
          <LuPalette className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Create</span>}
        </button>
        <button
          onClick={() => onNavigate('gallery')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeScreen === 'gallery' ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          aria-label="Gallery"
        >
          <LuLayoutGrid className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span>Gallery</span>
              {galleryCount > 0 && (
                <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full">{galleryCount}</span>
              )}
            </>
          )}
        </button>
      </nav>

      <div className={`p-4 border-t border-border ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <LuImage className="w-4 h-4 text-muted-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Image Generation Agent</p>
              <p className="text-xs text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                Active
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─── Style Picker ────────────────────────────────────────────────────────────

function StylePicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (s: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id === selected ? '' : style.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${style.id === selected ? 'border-accent bg-accent/15 text-foreground shadow-md shadow-accent/20 scale-105' : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground hover:text-foreground'}`}
            aria-label={`Select ${style.label} style`}
            aria-pressed={style.id === selected}
          >
            <span className={`w-3 h-3 rounded-full ${style.color}`} />
            {style.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Shimmer Skeleton ────────────────────────────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="w-full aspect-square rounded-2xl bg-muted overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <LuLoader className="w-10 h-10 text-accent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Generating your masterpiece...</p>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function CreateEmptyState() {
  return (
    <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 bg-card/50">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <LuImage className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-foreground font-semibold mb-1">Describe something amazing</p>
        <p className="text-muted-foreground text-sm">Write a prompt, pick a style, and hit Generate!</p>
      </div>
    </div>
  )
}

// ─── Image Result Display ────────────────────────────────────────────────────

function ImageResult({
  result,
  onDownload,
  onRegenerate,
  onEditPrompt,
  onSaveToGallery,
  saved,
}: {
  result: GenerationResult
  onDownload: () => void
  onRegenerate: () => void
  onEditPrompt: () => void
  onSaveToGallery: () => void
  saved: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border-2 border-border shadow-xl bg-card">
        <img
          src={result.imageUrl}
          alt={result.description || 'Generated image'}
          className="w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors shadow-md"
          aria-label="Download image"
        >
          <LuDownload className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors border-2 border-border"
          aria-label="Regenerate image"
        >
          <LuRefreshCw className="w-4 h-4" />
          Regenerate
        </button>
        <button
          onClick={onEditPrompt}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors border-2 border-border"
          aria-label="Edit prompt"
        >
          <LuPenLine className="w-4 h-4" />
          Edit Prompt
        </button>
        <button
          onClick={onSaveToGallery}
          disabled={saved}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border-2 ${saved ? 'bg-accent/15 text-accent border-accent/30 cursor-default' : 'bg-secondary text-foreground hover:bg-muted border-border'}`}
          aria-label="Save to gallery"
        >
          {saved ? <LuCheck className="w-4 h-4" /> : <LuBookmark className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save to Gallery'}
        </button>
      </div>

      {(result.promptUsed || result.styleApplied || result.description) && (
        <div className="rounded-2xl bg-card border-2 border-border p-5 space-y-3">
          {result.styleApplied && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Style</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-accent/15 text-accent text-xs font-semibold">{result.styleApplied}</span>
            </div>
          )}
          {result.promptUsed && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Prompt Used</span>
              <p className="text-sm text-foreground leading-relaxed">{result.promptUsed}</p>
            </div>
          )}
          {result.description && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Description</span>
              <div className="text-sm text-muted-foreground leading-relaxed">{renderMarkdown(result.description)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Gallery Lightbox Modal ──────────────────────────────────────────────────

function LightboxModal({
  item,
  onClose,
  onDelete,
  onRegenerate,
  onDownload,
}: {
  item: GalleryItem
  onClose: () => void
  onDelete: () => void
  onRegenerate: () => void
  onDownload: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-2 border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-muted/80 backdrop-blur-sm flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Close lightbox"
        >
          <LuX className="w-4 h-4" />
        </button>

        <div className="rounded-t-2xl overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.description || item.prompt}
            className="w-full object-cover"
          />
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-accent/15 text-accent text-xs font-semibold">{item.style}</span>
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Prompt</span>
            <p className="text-sm text-foreground leading-relaxed">{item.prompt}</p>
          </div>

          {item.description && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Description</span>
              <div className="text-sm text-muted-foreground leading-relaxed">{renderMarkdown(item.description)}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
              aria-label="Download image"
            >
              <LuDownload className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors border-2 border-border"
              aria-label="Regenerate this prompt"
            >
              <LuRefreshCw className="w-4 h-4" />
              Regenerate
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/15 text-red-400 text-sm font-semibold hover:bg-destructive/25 transition-colors border-2 border-red-900/30"
              aria-label="Delete from gallery"
            >
              <LuTrash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Gallery Screen ──────────────────────────────────────────────────────────

function GalleryScreen({
  gallery,
  onDelete,
  onRegenerate,
  showSample,
}: {
  gallery: GalleryItem[]
  onDelete: (id: string) => void
  onRegenerate: (item: GalleryItem) => void
  showSample: boolean
}) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [filterStyle, setFilterStyle] = useState<string>('')

  const displayGallery = showSample && gallery.length === 0 ? SAMPLE_GALLERY : gallery

  const filteredGallery = filterStyle
    ? displayGallery.filter((item) => item.style.toLowerCase() === filterStyle.toLowerCase())
    : displayGallery

  const uniqueStyles = Array.from(new Set(displayGallery.map((item) => item.style)))

  const handleDownload = useCallback((imageUrl: string, prompt: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }, [])

  if (displayGallery.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
          <LuLayoutGrid className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-semibold text-lg mb-1">No images yet</p>
          <p className="text-muted-foreground text-sm">Go create your first masterpiece!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Gallery</h2>
        <div className="flex items-center gap-2">
          <LuFilter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value)}
            className="bg-secondary border-2 border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
            aria-label="Filter by style"
          >
            <option value="">All Styles</option>
            {uniqueStyles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGallery.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="group relative rounded-2xl overflow-hidden border-2 border-border bg-card hover:border-accent/50 transition-all duration-300 hover:shadow-xl hover:shadow-accent/10 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring text-left"
            aria-label={`View ${item.prompt}`}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.description || item.prompt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-accent/90 text-accent-foreground text-xs font-semibold mb-1.5">{item.style}</span>
              <p className="text-white text-sm line-clamp-2 leading-snug">{item.prompt}</p>
            </div>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <LuZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedItem && (
        <LightboxModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={() => {
            onDelete(selectedItem.id)
            setSelectedItem(null)
          }}
          onRegenerate={() => {
            onRegenerate(selectedItem)
            setSelectedItem(null)
          }}
          onDownload={() => handleDownload(selectedItem.imageUrl, selectedItem.prompt)}
        />
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  // Navigation state
  const [activeScreen, setActiveScreen] = useState<'create' | 'gallery'>('create')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Create screen state
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [savedToGallery, setSavedToGallery] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>([])

  // Load gallery from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GALLERY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setGallery(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save gallery to localStorage
  const saveGallery = useCallback((items: GalleryItem[]) => {
    setGallery(items)
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Apply sample data
  useEffect(() => {
    if (showSample && !generationResult) {
      setPrompt(SAMPLE_RESULT.promptUsed)
      setSelectedStyle('photorealistic')
      setGenerationResult(SAMPLE_RESULT)
      setSavedToGallery(false)
    } else if (!showSample && generationResult === SAMPLE_RESULT) {
      setPrompt('')
      setSelectedStyle('')
      setGenerationResult(null)
      setSavedToGallery(false)
    }
  }, [showSample])

  // Generate image
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setErrorMessage('')
    setGenerationResult(null)
    setSavedToGallery(false)
    setActiveAgentId(IMAGE_AGENT_ID)

    try {
      const styleName = STYLES.find((s) => s.id === selectedStyle)?.label || 'No specific style'
      const message = `Generate an image with the following details:\nPrompt: ${prompt.trim()}\nArtistic Style: ${styleName}`

      const result = await callAIAgent(message, IMAGE_AGENT_ID)

      if (result.success) {
        const responseData = result?.response?.result || {}
        const promptUsed = typeof responseData?.prompt_used === 'string' ? responseData.prompt_used : prompt.trim()
        const styleApplied = typeof responseData?.style_applied === 'string' ? responseData.style_applied : styleName
        const description = typeof responseData?.description === 'string' ? responseData.description : ''

        const artifacts = result?.module_outputs?.artifact_files
        const imageUrl = Array.isArray(artifacts) && artifacts.length > 0 && typeof artifacts[0]?.file_url === 'string' ? artifacts[0].file_url : ''

        if (imageUrl) {
          setGenerationResult({ imageUrl, promptUsed, styleApplied, description })
        } else {
          setErrorMessage('Image was generated but no image URL was returned. Please try again.')
        }
      } else {
        setErrorMessage(result?.error || 'Something went wrong -- try again.')
      }
    } catch (err) {
      setErrorMessage('Something went wrong -- try again.')
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }, [prompt, selectedStyle])

  // Regenerate
  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  // Edit prompt (scroll to textarea)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const handleEditPrompt = useCallback(() => {
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // Save to gallery
  const handleSaveToGallery = useCallback(() => {
    if (!generationResult || savedToGallery) return
    const newItem: GalleryItem = {
      id: generateId(),
      imageUrl: generationResult.imageUrl,
      prompt: generationResult.promptUsed || prompt,
      style: generationResult.styleApplied || 'Unknown',
      description: generationResult.description || '',
      createdAt: new Date().toISOString(),
    }
    saveGallery([newItem, ...gallery])
    setSavedToGallery(true)
  }, [generationResult, savedToGallery, prompt, gallery, saveGallery])

  // Download
  const handleDownload = useCallback(() => {
    if (!generationResult?.imageUrl) return
    const link = document.createElement('a')
    link.href = generationResult.imageUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }, [generationResult])

  // Gallery operations
  const handleDeleteFromGallery = useCallback((id: string) => {
    saveGallery(gallery.filter((item) => item.id !== id))
  }, [gallery, saveGallery])

  const handleRegenerateFromGallery = useCallback((item: GalleryItem) => {
    setPrompt(item.prompt)
    const matchedStyle = STYLES.find((s) => s.label.toLowerCase() === item.style.toLowerCase())
    setSelectedStyle(matchedStyle?.id || '')
    setActiveScreen('create')
    setGenerationResult(null)
    setSavedToGallery(false)
  }, [])

  const mainPadding = sidebarCollapsed ? 'pl-16' : 'pl-60'

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={(s) => { setActiveScreen(s); setMobileMenuOpen(false) }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          galleryCount={gallery.length}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-8 h-8 flex items-center justify-center" aria-label="Toggle menu">
          <LuMenu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
            <LuSparkles className="w-3 h-3 text-accent-foreground" />
          </div>
          <span className="text-base font-extrabold tracking-tight">PixelMuse</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-60 h-full bg-card border-r border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center h-14 border-b border-border px-4 gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <LuSparkles className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
              <span className="text-base font-extrabold tracking-tight">PixelMuse</span>
            </div>
            <nav className="p-3 space-y-1">
              <button
                onClick={() => { setActiveScreen('create'); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeScreen === 'create' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                <LuPalette className="w-5 h-5" /> Create
              </button>
              <button
                onClick={() => { setActiveScreen('gallery'); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeScreen === 'gallery' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                <LuLayoutGrid className="w-5 h-5" /> Gallery
                {gallery.length > 0 && <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full">{gallery.length}</span>}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ${mainPadding} md:${mainPadding} pt-14 md:pt-0`}>
        {/* Top Bar */}
        <div className="sticky top-0 md:top-0 z-30 backdrop-blur-lg bg-background/80 border-b border-border">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
            <h1 className="text-lg font-extrabold tracking-tight">
              {activeScreen === 'create' ? 'Create' : 'Gallery'}
            </h1>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground font-medium">Sample Data</span>
                <button
                  role="switch"
                  aria-checked={showSample}
                  onClick={() => setShowSample(!showSample)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${showSample ? 'bg-accent' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showSample ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {activeScreen === 'create' ? (
            <div className="space-y-8">
              {/* Prompt Input */}
              <div className="space-y-3">
                <label htmlFor="prompt-input" className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Prompt
                </label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHARS) {
                        setPrompt(e.target.value)
                      }
                    }}
                    placeholder="Describe your image... e.g., A serene Japanese garden at sunset with cherry blossoms floating on still water"
                    rows={4}
                    className="w-full rounded-2xl bg-input border-2 border-border px-5 py-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent resize-none leading-relaxed transition-colors"
                    aria-label="Image prompt"
                  />
                  <span className={`absolute bottom-3 right-4 text-xs font-medium ${prompt.length >= MAX_CHARS ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {prompt.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              {/* Style Picker */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Artistic Style
                </label>
                <StylePicker selected={selectedStyle} onSelect={setSelectedStyle} />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-accent text-accent-foreground text-base font-extrabold tracking-tight hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30"
                aria-label="Generate image"
              >
                {isGenerating ? (
                  <>
                    <LuLoader className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LuSparkles className="w-5 h-5" />
                    Generate Image
                  </>
                )}
              </button>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-destructive/10 border-2 border-red-900/30">
                  <LuCircleAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
                    <button
                      onClick={handleGenerate}
                      className="text-xs text-red-300 underline mt-1 hover:text-red-200"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Result Area */}
              <div>
                {isGenerating ? (
                  <ShimmerSkeleton />
                ) : generationResult ? (
                  <ImageResult
                    result={generationResult}
                    onDownload={handleDownload}
                    onRegenerate={handleRegenerate}
                    onEditPrompt={handleEditPrompt}
                    onSaveToGallery={handleSaveToGallery}
                    saved={savedToGallery}
                  />
                ) : (
                  <CreateEmptyState />
                )}
              </div>
            </div>
          ) : (
            <GalleryScreen
              gallery={gallery}
              onDelete={handleDeleteFromGallery}
              onRegenerate={handleRegenerateFromGallery}
              showSample={showSample}
            />
          )}

          {/* Agent Info */}
          <div className="mt-12 mb-8">
            <div className="rounded-2xl bg-card border-2 border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <LuInfo className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Powered By</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <LuImage className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Image Generation Agent</p>
                  <p className="text-xs text-muted-foreground">Interprets prompts with artistic styles to generate AI images</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-xs text-muted-foreground font-medium">{activeAgentId ? 'Generating' : 'Ready'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
