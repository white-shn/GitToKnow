import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { CATEGORIES, categoryOf } from '@/lib/categories'

const RINGS = 5 // folder levels shown at once; click a folder to zoom into it
const MIN_ANGLE = 0.0045 // radians; thinner arcs are not drawn
const CENTER_R = 78
const OUTER_R = 470
const TAU = Math.PI * 2

/** Folder/file tree with a size-based weight and dominant category on every node. */
function buildHierarchy(tree, fileInfo) {
  const walk = (node, depth) => {
    if (node.type === 'file') {
      const info = fileInfo.get(node.path)
      const size = info?.size ?? 500
      return { name: node.name, path: node.path, type: 'file', depth, size, files: 1, value: Math.pow(Math.max(size, 300), 0.55), category: info?.category ?? 'other', important: Boolean(info?.important), children: [] }
    }
    const children = node.children.map((c) => walk(c, depth + 1))
    const tally = {}
    for (const c of children) tally[c.category] = (tally[c.category] ?? 0) + c.files
    return {
      name: node.name, path: node.path, type: 'dir', depth,
      size: children.reduce((s, c) => s + c.size, 0),
      files: children.reduce((s, c) => s + c.files, 0),
      value: children.reduce((s, c) => s + c.value, 0),
      category: Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other',
      children: children.sort((a, b) => b.value - a.value),
    }
  }
  const children = tree.map((n) => walk(n, 1))
  return {
    name: 'repository', path: '', type: 'dir', depth: 0,
    size: children.reduce((s, c) => s + c.size, 0), files: children.reduce((s, c) => s + c.files, 0),
    value: children.reduce((s, c) => s + c.value, 0), category: 'other', children: children.sort((a, b) => b.value - a.value),
  }
}

const findNode = (root, path) => {
  if (!path) return root
  let node = root
  for (const part of path.split('/').map((_, i, arr) => arr.slice(0, i + 1).join('/'))) {
    node = node.children.find((c) => c.path === part)
    if (!node) return root
  }
  return node
}

/** Arcs for `focus` and the next RINGS levels below it. */
function layout(focus) {
  const arcs = []
  const ringW = (OUTER_R - CENTER_R) / RINGS
  const place = (node, a0, a1, ring) => {
    if (ring > RINGS) return
    if (ring > 0) arcs.push({ node, a0, a1, r0: CENTER_R + (ring - 1) * ringW, r1: CENTER_R + ring * ringW - 2, ring })
    let a = a0
    for (const child of node.children) {
      const span = ((a1 - a0) * child.value) / node.value
      if (span >= MIN_ANGLE) place(child, a, a + span, ring + 1)
      a += span
    }
  }
  place(focus, 0, TAU, 0)
  return arcs
}

const pt = (a, r) => [r * Math.sin(a), -r * Math.cos(a)]
function arcPath({ a0, a1, r0, r1 }) {
  const pad = Math.min(0.004, (a1 - a0) / 4)
  const [s, e] = [a0 + pad, a1 - pad]
  const large = e - s > Math.PI ? 1 : 0
  const [x0, y0] = pt(s, r1)
  const [x1, y1] = pt(e, r1)
  const [x2, y2] = pt(e, r0)
  const [x3, y3] = pt(s, r0)
  return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`
}

const formatSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`)

/** Interactive sunburst of the repository: arcs sized by code volume, coloured by category. */
export default function Sunburst({ tree, fileInfo, selectedFile, onSelectFile, focusPath, onFocusChange }) {
  const root = useMemo(() => buildHierarchy(tree, fileInfo), [tree, fileInfo])
  const focus = useMemo(() => findNode(root, focusPath), [root, focusPath])
  const arcs = useMemo(() => layout(focus), [focus])
  const [hover, setHover] = useState(null)
  const group = useRef(null)
  const first = useRef(true)

  // Intro: rings sweep in from the centre. On focus changes the whole disc spins/zooms in.
  useEffect(() => {
    if (!group.current) return
    if (first.current) {
      first.current = false
      gsap.from(group.current.querySelectorAll('[data-arc]'), { opacity: 0, scale: 0.85, transformOrigin: '0 0', duration: 0.7, ease: 'power3.out', stagger: { amount: 0.9, from: 'start' } })
    } else {
      gsap.fromTo(group.current, { opacity: 0, rotate: -12, scale: 0.88, transformOrigin: '0 0' }, { opacity: 1, rotate: 0, scale: 1, duration: 0.6, ease: 'power3.out' })
    }
  }, [focus])

  const shown = hover ?? focus
  const parentPath = focus.path.includes('/') ? focus.path.slice(0, focus.path.lastIndexOf('/')) : ''
  const cat = categoryOf(shown.category)

  return (
    <svg viewBox={`${-OUTER_R - 14} ${-OUTER_R - 14} ${(OUTER_R + 14) * 2} ${(OUTER_R + 14) * 2}`} className="size-full" role="img" aria-label="Sunburst of the repository file structure">
      <defs>
        <radialGradient id="sb-center" r="1">
          <stop offset="0%" stopColor="oklch(0.3 0.05 285)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.14 0.01 285)" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      {/* faint guide rings */}
      {Array.from({ length: RINGS + 1 }, (_, i) => (
        <circle key={i} r={CENTER_R + (i * (OUTER_R - CENTER_R)) / RINGS} fill="none" stroke="white" strokeOpacity="0.05" />
      ))}

      <g ref={group}>
        {arcs.map((arc) => {
          const { node } = arc
          const isFile = node.type === 'file'
          const isSelected = isFile && node.path === selectedFile
          const isHover = hover?.path === node.path
          const color = `var(--cat-${CATEGORIES[node.category] ? node.category : 'other'})`
          return (
            <path
              key={node.path}
              data-arc
              d={arcPath(arc)}
              onMouseEnter={() => setHover(node)}
              onMouseLeave={() => setHover(null)}
              onClick={() => (isFile ? onSelectFile(node.path) : onFocusChange(node.path))}
              style={{
                fill: color,
                fillOpacity: isHover || isSelected ? 1 : isFile ? 0.82 : Math.max(0.28, 0.62 - arc.ring * 0.06),
                stroke: isSelected ? '#fff' : 'rgba(8,9,14,0.9)',
                strokeWidth: isSelected ? 2 : 0.6,
                filter: isHover || isSelected ? `drop-shadow(0 0 7px ${color})` : 'none',
                cursor: 'pointer',
                transition: 'fill-opacity .15s',
              }}
            />
          )
        })}
      </g>

      {/* centre: current focus / hovered item; click to go up a level */}
      <g onClick={() => focus.path && onFocusChange(parentPath)} style={{ cursor: focus.path ? 'pointer' : 'default' }}>
        <circle r={CENTER_R - 6} fill="url(#sb-center)" stroke={`var(--cat-${CATEGORIES[shown.category] ? shown.category : 'other'})`} strokeOpacity="0.5" />
        <text y="-18" textAnchor="middle" fill="white" fontSize="15" fontWeight="600" fontFamily="ui-monospace, monospace">
          {shown.path ? (shown.name.length > 13 ? shown.name.slice(0, 12) + '…' : shown.name) : 'repo'}
        </text>
        <text y="2" textAnchor="middle" fill="rgba(225,230,245,.75)" fontSize="11" fontFamily="ui-monospace, monospace">
          {shown.type === 'dir' ? `${shown.files} files` : cat.label}
        </text>
        <text y="19" textAnchor="middle" fill="rgba(225,230,245,.5)" fontSize="10.5" fontFamily="ui-monospace, monospace">
          {formatSize(shown.size)}
        </text>
        {!hover && focus.path && (
          <text y="37" textAnchor="middle" fill="var(--primary)" fontSize="10.5">↑ up</text>
        )}
      </g>
    </svg>
  )
}
