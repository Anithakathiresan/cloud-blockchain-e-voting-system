// Animated backdrop for home, sign-in, about, services, contact and every
// signed-in console page (via ConsoleLayout): a slowly drifting "blockchain" network.
// Nodes link up when they come close, small orange packets run along
// the links, and nodes near the pointer reach out to it. It is decorative only,
// sits behind the page, and shows one still frame when reduced motion is on.

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const LINK_DISTANCE = 150
const POINTER_DISTANCE = 190

function readColours() {
  const styles = getComputedStyle(document.documentElement)
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    orange: styles.getPropertyValue('--brand-orange').trim() || '#ff4f01',
    // Links and plain nodes use the page's text colour, kept faint.
    line: dark ? '231, 233, 251' : '19, 29, 59',
    lineAlpha: dark ? 0.16 : 0.2,
    nodeAlpha: dark ? 0.5 : 0.42,
  }
}

function makeNode(width, height) {
  const speed = 0.12 + Math.random() * 0.22
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 2 + Math.random() * 2.2,
    // About one node in five is an orange "block" drawn as a small square.
    block: Math.random() < 0.2,
    phase: Math.random() * Math.PI * 2,
  }
}

export function AuthBackdrop() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let nodes = []
    let packets = []
    let colours = readColours()
    let frame = 0
    let raf = 0
    const pointer = { x: -9999, y: -9999 }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.max(24, Math.min(90, Math.round((width * height) / 15000)))
      while (nodes.length < count) nodes.push(makeNode(width, height))
      nodes.length = count
      packets = packets.filter((packet) => packet.from < count && packet.to < count)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const { orange, line, lineAlpha, nodeAlpha } = colours

      // Links between nearby nodes.
      ctx.lineWidth = 1
      const links = []
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.hypot(dx, dy)
          if (dist > LINK_DISTANCE) continue
          links.push([i, j])
          ctx.strokeStyle = `rgba(${line}, ${lineAlpha * (1 - dist / LINK_DISTANCE)})`
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }

      // Orange links from the pointer to the nodes around it.
      for (const node of nodes) {
        const dist = Math.hypot(node.x - pointer.x, node.y - pointer.y)
        if (dist > POINTER_DISTANCE) continue
        ctx.strokeStyle = orange
        ctx.globalAlpha = 0.45 * (1 - dist / POINTER_DISTANCE)
        ctx.beginPath()
        ctx.moveTo(pointer.x, pointer.y)
        ctx.lineTo(node.x, node.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Nodes: faint dots, plus orange blocks that gently breathe.
      for (const node of nodes) {
        if (node.block) {
          const s = node.size * 2.2 * (1 + 0.12 * Math.sin(frame / 40 + node.phase))
          ctx.fillStyle = orange
          ctx.globalAlpha = 0.16
          ctx.fillRect(node.x - s * 1.6, node.y - s * 1.6, s * 3.2, s * 3.2)
          ctx.globalAlpha = 0.85
          ctx.fillRect(node.x - s / 2, node.y - s / 2, s, s)
          ctx.globalAlpha = 1
        } else {
          ctx.fillStyle = `rgba(${line}, ${nodeAlpha})`
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.size / 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Now and then a packet sets off along a link from an orange block.
      if (!still && packets.length < 6 && frame % 24 === 0) {
        const candidates = links.filter(([a, b]) => nodes[a].block || nodes[b].block)
        if (candidates.length) {
          const [a, b] = candidates[Math.floor(Math.random() * candidates.length)]
          const from = nodes[a].block ? a : b
          packets.push({ from, to: from === a ? b : a, t: 0 })
        }
      }

      // Packets: a glowing orange dot with a short tail.
      packets = packets.filter((packet) => {
        const a = nodes[packet.from]
        const b = nodes[packet.to]
        if (Math.hypot(a.x - b.x, a.y - b.y) > LINK_DISTANCE * 1.2) return false
        packet.t += 0.012
        if (packet.t >= 1) return false
        const x = a.x + (b.x - a.x) * packet.t
        const y = a.y + (b.y - a.y) * packet.t
        const tail = Math.max(0, packet.t - 0.18)
        const gradient = ctx.createLinearGradient(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail, x, y)
        gradient.addColorStop(0, 'rgba(255, 79, 1, 0)')
        gradient.addColorStop(1, orange)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.lineWidth = 1
        ctx.fillStyle = orange
        ctx.shadowColor = orange
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(x, y, 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        return true
      })
    }

    const step = () => {
      frame += 1
      if (frame % 60 === 0) colours = readColours()
      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy
        if (node.x < -20) node.x = width + 20
        else if (node.x > width + 20) node.x = -20
        if (node.y < -20) node.y = height + 20
        else if (node.y > height + 20) node.y = -20
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const onPointer = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    const onLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
    }
    // Redraw the still frame when the theme changes.
    const themeWatch = new MutationObserver(() => {
      colours = readColours()
      if (still) draw()
    })

    resize()
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', resize)
    if (still) {
      draw()
      window.addEventListener('resize', draw)
    } else {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.addEventListener('pointerleave', onLeave)
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      themeWatch.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', draw)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return createPortal(
    <div className="auth-bg" aria-hidden="true">
      <span className="auth-bg-glow glow-a" />
      <span className="auth-bg-glow glow-b" />
      <canvas ref={canvasRef} className="auth-bg-canvas" />
    </div>,
    document.body,
  )
}
