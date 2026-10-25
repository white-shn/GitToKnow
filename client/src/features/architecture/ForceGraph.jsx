import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 4
const DRAG_THRESHOLD = 4 // px before a press counts as a drag instead of a click

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Obsidian-style physics graph on a canvas: glowing nodes, draggable, hover/selection highlights neighbours. */
export default function ForceGraph({ graph, selectedId, onSelect }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const apiRef = useRef({})
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    selectedRef.current = selectedId
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const colors = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, cssVar(`--cat-${k}`)]))
    const primary = cssVar('--primary')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // ---- build the simulation data
    const degree = new Map(graph.nodes.map((n) => [n.id, n.imports.length + n.imported_by.length]))
    const groups = [...new Set(graph.nodes.map((n) => n.group))]
    const anchor = (group) => {
      const i = groups.indexOf(group)
      const angle = (i / groups.length) * Math.PI * 2
      return { x: Math.cos(angle) * 230, y: Math.sin(angle) * 230 }
    }
    const nodes = graph.nodes.map((n, i) => {
      const a = anchor(n.group)
      return {
        id: n.id,
        label: n.label,
        category: n.category,
        group: n.group,
        order: i,
        r: n.files.length > 1 ? 7 + Math.sqrt(n.files.length) * 2.2 : 3.5 + Math.sqrt(degree.get(n.id)) * 2.2,
        x: a.x + (Math.random() - 0.5) * 80,
        y: a.y + (Math.random() - 0.5) * 80,
      }
    })
    const byId = new Map(nodes.map((n) => [n.id, n]))
    ;[...nodes].sort((a, b) => b.r - a.r).forEach((n, i) => { n.rank = i })
    const links = graph.edges.filter((e) => byId.has(e.source) && byId.has(e.target)).map((e) => ({ source: e.source, target: e.target }))
    const outgoing = new Map(nodes.map((n) => [n.id, new Set()]))
    const incoming = new Map(nodes.map((n) => [n.id, new Set()]))
    for (const e of links) {
      outgoing.get(e.source).add(e.target)
      incoming.get(e.target).add(e.source)
    }

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => d.id).distance(64).strength(0.5))
      .force('charge', forceManyBody().strength(-150).distanceMax(520))
      .force('collide', forceCollide().radius((d) => d.r + 7))
      .force('gx', forceX((d) => anchor(d.group).x).strength(0.05))
      .force('gy', forceY((d) => anchor(d.group).y).strength(0.05))
      .alphaDecay(0.022)
    sim.tick(180) // settle first, so the intro animates a finished layout

    // ---- view state
    const view = { x: 0, y: 0, k: 1, w: 0, h: 0, reveal: 0, hoverId: null, dragNode: null }
    const world = (px, py) => ({ x: (px - view.x) / view.k, y: (py - view.y) / view.k })
    const nodeAt = (px, py) => {
      const p = world(px, py)
      let best = null
      let bestD = Infinity
      for (const n of nodes) {
        const d = Math.hypot(n.x - p.x, n.y - p.y)
        if (d <= n.r + 4 / view.k && d < bestD) {
          best = n
          bestD = d
        }
      }
      return best
    }
    const fitTarget = () => {
      if (!nodes.length) return { x: view.w / 2, y: view.h / 2, k: 1 }
      const xs = nodes.map((n) => n.x)
      const ys = nodes.map((n) => n.y)
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      const pad = 90
      const k = Math.max(MIN_ZOOM, Math.min(1.6, (view.w - pad * 2) / Math.max(x1 - x0, 1), (view.h - pad * 2) / Math.max(y1 - y0, 1)))
      return { k, x: view.w / 2 - ((x0 + x1) / 2) * k, y: view.h / 2 - ((y0 + y1) / 2) * k }
    }
    const flyTo = (target, duration = 0.9) => gsap.to(view, { ...target, duration, ease: 'power3.inOut', overwrite: 'auto' })
    const zoomAt = (px, py, factor) => {
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.k * factor))
      const p = world(px, py)
      gsap.to(view, { k, x: px - p.x * k, y: py - p.y * k, duration: 0.25, ease: 'power2.out', overwrite: 'auto' })
    }
    apiRef.current = {
      fit: () => flyTo(fitTarget()),
      zoomIn: () => zoomAt(view.w / 2, view.h / 2, 1.5),
      zoomOut: () => zoomAt(view.w / 2, view.h / 2, 1 / 1.5),
      focus: (id) => {
        const n = byId.get(id)
        if (n) flyTo({ x: view.w / 2 - n.x * Math.max(view.k, 1), y: view.h / 2 - n.y * Math.max(view.k, 1), k: Math.max(view.k, 1) }, 0.7)
      },
    }

    // ---- drawing
    const draw = (time) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, view.w, view.h)
      ctx.save()
      ctx.translate(view.x, view.y)
      ctx.scale(view.k, view.k)

      const focusId = view.hoverId ?? selectedRef.current
      const near = focusId ? new Set([focusId, ...outgoing.get(focusId), ...incoming.get(focusId)]) : null
      const reveal = view.reveal

      // links
      for (const l of links) {
        const a = l.source
        const b = l.target
        const hot = focusId && (a.id === focusId || b.id === focusId)
        ctx.globalAlpha = Math.min(1, reveal * 1.4) * (near ? (hot ? 1 : 0.05) : 0.28)
        ctx.strokeStyle = hot ? (a.id === focusId ? primary : colors.frontend) : '#8b93b0'
        ctx.lineWidth = (hot ? 1.8 : 0.8) / Math.sqrt(view.k)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      // nodes
      for (const n of nodes) {
        const dim = near && !near.has(n.id)
        const appear = Math.max(0, Math.min(1, reveal * 1.8 - (n.order / nodes.length) * 0.8))
        if (appear <= 0) continue
        const isFocus = n.id === focusId
        const color = colors[n.category] || colors.other
        const r = n.r * (0.4 + 0.6 * appear) * (isFocus ? 1.25 : 1)
        ctx.globalAlpha = appear * (dim ? 0.16 : 1)
        ctx.shadowColor = color
        ctx.shadowBlur = dim ? 0 : isFocus ? 28 : 14
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        if (n.id === selectedRef.current) {
          const pulse = 1 + 0.25 * Math.sin(time / 280)
          ctx.globalAlpha = 0.9
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5 / view.k
          ctx.beginPath()
          ctx.arc(n.x, n.y, (r + 5) * pulse, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // labels: the focused node and its neighbours; otherwise the biggest hubs, more of them as you zoom in.
      // Greedy collision culling keeps them readable.
      ctx.shadowBlur = 0
      ctx.textAlign = 'center'
      ctx.font = `500 ${11 / view.k}px ui-monospace, "JetBrains Mono", monospace`
      const budget = 6 + Math.max(0, view.k - 0.5) * 45
      const candidates = nodes
        .filter((n) => (near ? near.has(n.id) : n.rank < budget))
        .sort((a, b) => (b.id === focusId) - (a.id === focusId) || a.rank - b.rank)
      const placed = []
      const lineH = 12 / view.k
      if (reveal >= 0.9) {
        for (const n of candidates) {
          const w = ctx.measureText(n.label).width
          const box = { x0: n.x - w / 2, x1: n.x + w / 2, y0: n.y + n.r + 3 / view.k, y1: n.y + n.r + 3 / view.k + lineH }
          if (n.id !== focusId && placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue
          placed.push(box)
          ctx.globalAlpha = 1
          ctx.lineWidth = 3 / view.k
          ctx.strokeStyle = 'rgba(8,9,14,0.85)'
          ctx.strokeText(n.label, n.x, box.y1 - 2 / view.k)
          ctx.fillStyle = n.id === focusId ? '#fff' : 'rgba(225,230,245,0.85)'
          ctx.fillText(n.label, n.x, box.y1 - 2 / view.k)
        }
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    let raf
    const loop = (time) => {
      draw(time)
      raf = requestAnimationFrame(loop)
    }

    // ---- size + intro
    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect()
      const first = view.w === 0
      view.w = width
      view.h = height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      if (first) {
        const target = fitTarget()
        Object.assign(view, { x: target.x, y: target.y, k: target.k * 0.55 })
        gsap.to(view, { k: target.k, duration: 1.6, ease: 'power3.out' })
        gsap.to(view, { reveal: 1, duration: 1.8, ease: 'power2.out' })
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()
    raf = requestAnimationFrame(loop)

    // ---- pointer interaction
    let press = null // { x, y, node, moved, startView }
    const local = (e) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e) => {
      const p = local(e)
      gsap.killTweensOf(view, 'x,y,k')
      press = { x: p.x, y: p.y, node: nodeAt(p.x, p.y), moved: false, vx: view.x, vy: view.y }
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e) => {
      const p = local(e)
      if (!press) {
        const n = nodeAt(p.x, p.y)
        view.hoverId = n ? n.id : null
        canvas.style.cursor = n ? 'pointer' : 'grab'
        return
      }
      if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) > DRAG_THRESHOLD) press.moved = true
      if (!press.moved) return
      if (press.node) {
        const w = world(p.x, p.y)
        press.node.fx = w.x
        press.node.fy = w.y
        view.dragNode = press.node
        sim.alphaTarget(0.25).restart()
      } else {
        view.x = press.vx + (p.x - press.x)
        view.y = press.vy + (p.y - press.y)
        canvas.style.cursor = 'grabbing'
      }
    }
    const onUp = (e) => {
      if (!press) return
      const { node, moved } = press
      press = null
      canvas.releasePointerCapture(e.pointerId)
      if (view.dragNode) {
        view.dragNode.fx = null
        view.dragNode.fy = null
        view.dragNode = null
        sim.alphaTarget(0)
      }
      if (!moved) onSelectRef.current(node ? node.id : null)
    }
    const onLeave = () => {
      if (!press) view.hoverId = null
    }
    const onWheel = (e) => {
      e.preventDefault()
      const p = local(e)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015))
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelAnimationFrame(raf)
      gsap.killTweensOf(view)
      sim.stop()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
    }
    // the simulation must only rebuild when the graph changes
  }, [graph])

  // Selecting from the details panel (not a click on the canvas) should bring that node into view
  useEffect(() => {
    if (selectedId) apiRef.current.focus?.(selectedId)
  }, [selectedId])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block touch-none" aria-label="Interactive dependency graph" role="img" />
      <div className="absolute bottom-4 left-4 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
        {[
          { icon: Plus, label: 'Zoom in', action: 'zoomIn' },
          { icon: Minus, label: 'Zoom out', action: 'zoomOut' },
          { icon: Maximize2, label: 'Fit to screen', action: 'fit' },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onClick={() => apiRef.current[action]?.()}
            aria-label={label}
            title={label}
            className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
