// Short "tap to vote" scene shown when a Sign in button is clicked: a phone lies
// flat with a ballot box on it, a hand taps its VOTE button, a ballot drops into
// the box, then the sign-in page opens. Escape, Enter or a click skips it.

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LogIn } from 'lucide-react'

// Tap, ballot drop, tick, then a beat to see it before the page changes.
const INTRO_MS = 2600

// Flat isometric projection: x runs down-right, y down-left, z straight up.
const ISO = 'matrix(0.866 0.5 -0.866 0.5 100 50)'
const iso = (x, y, z = 0) => `${(100 + 0.866 * (x - y)).toFixed(1)},${(50 + 0.5 * (x + y) - z).toFixed(1)}`
const poly = (...corners) => corners.map((corner) => iso(...corner)).join(' ')

// Ballot box footprint on the phone and its height.
const BOX = { x0: 18, x1: 70, y0: 16, y1: 68, h: 48 }
const SLOT = { x0: 30, x1: 58, y0: 40, y1: 44 }

// Drawn once as an outline and once on top without one, so the overlapping
// pieces read as a single hand. The fingertip sits at (0, 0).
function HandShape(props) {
  return (
    <g {...props}>
      <rect x="-7" y="0" width="14" height="46" rx="7" />
      <rect x="6" y="26" width="11" height="20" rx="5.5" />
      <rect x="15" y="30" width="11" height="19" rx="5.5" />
      <rect x="24" y="35" width="10" height="17" rx="5" />
      <rect x="-9" y="34" width="43" height="40" rx="13" />
      <rect x="-24" y="40" width="13" height="28" rx="6.5" transform="rotate(-32 -17 54)" />
    </g>
  )
}

export function SignInIntro({ onDone }) {
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const timer = setTimeout(() => done.current(), INTRO_MS)
    const onKey = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') done.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const { x0, x1, y0, y1, h } = BOX

  return createPortal(
    <div className="signin-intro" onClick={() => done.current()}>
      <div className="signin-intro-card">
        <svg className="signin-stage" viewBox="0 0 320 220" aria-hidden="true">
          <defs>
            {/* Everything above the slot line; the ballot vanishes below it. */}
            <clipPath id="ib-slot-clip">
              <polygon points="0,-14 320,171 320,-200 0,-200" />
            </clipPath>
          </defs>

          {/* phone */}
          <g transform="translate(0 10)">
            <rect className="ib-phone-edge" transform={ISO} width="180" height="100" rx="16" />
          </g>
          <g transform={ISO}>
            <rect className="ib-phone" width="180" height="100" rx="16" />
            <rect className="ib-screen" x="6" y="6" width="168" height="88" rx="11" />
            <rect className="ib-speaker" x="11" y="40" width="4" height="20" rx="2" />
            <rect className="ib-shadow" x={x0 + 4} y={y0 + 4} width={x1 - x0 + 6} height={y1 - y0 + 6} rx="4" />
            <circle className="ib-ripple" cx="140" cy="72" r="20" />
          </g>

          {/* VOTE button */}
          <g transform="translate(0 4)">
            <rect className="ib-btn-base" transform={ISO} x="118" y="60" width="44" height="24" rx="6" />
          </g>
          <g className="ib-btn">
            <g transform={ISO}>
              <rect className="ib-btn-top" x="118" y="60" width="44" height="24" rx="6" />
              <text className="ib-btn-label" x="140" y="72">
                VOTE
              </text>
            </g>
          </g>

          {/* ballot box */}
          <g className="ib-box">
            <polygon className="ib-box-left" points={poly([x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h])} />
            <polygon className="ib-box-right" points={poly([x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h])} />
            <polygon className="ib-box-top" points={poly([x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h])} />
            <polygon className="ib-box-band" points={poly([x0, y1, h - 13], [x1, y1, h - 13], [x1, y1, h - 7], [x0, y1, h - 7])} />
            <polygon className="ib-box-band shade" points={poly([x1, y0, h - 13], [x1, y1, h - 13], [x1, y1, h - 7], [x1, y0, h - 7])} />
            <polyline className="ib-box-mark" points={poly([34, y1, 21], [40, y1, 15], [54, y1, 29])} />
            <polygon
              className="ib-slot"
              points={poly([SLOT.x0, SLOT.y0, h], [SLOT.x1, SLOT.y0, h], [SLOT.x1, SLOT.y1, h], [SLOT.x0, SLOT.y1, h])}
            />
          </g>

          {/* ballot paper, standing in the slot's plane */}
          <g clipPath="url(#ib-slot-clip)">
            <g className="ib-paper">
              <g transform="translate(101.7 45) skewY(30)">
                <rect className="ib-paper-sheet" x="-11" y="-30" width="22" height="30" rx="2" />
                <rect className="ib-paper-line" x="-7" y="-25" width="10" height="2.5" rx="1" />
                <rect className="ib-paper-line" x="-7" y="-19" width="14" height="2.5" rx="1" />
                <path className="ib-paper-tick" d="M-5 -10 l3 3 l7 -7" />
              </g>
            </g>
          </g>

          {/* tick once the ballot is in */}
          <g transform="translate(152 24)">
            <g className="ib-done">
              <circle r="11" />
              <path d="M-5 0 l3.5 3.5 l6.5 -7" />
            </g>
          </g>

          {/* hand, fingertip on the VOTE button */}
          <g transform="translate(160 153)">
            <g className="ib-hand">
              <g transform="rotate(-110) scale(-1 1)">
                <HandShape className="hand-outline" />
                <HandShape className="hand-fill" />
                <rect className="hand-cuff" x="-12" y="64" width="48" height="13" rx="5" />
                <rect className="hand-sleeve" x="-16" y="75" width="56" height="46" rx="14" />
              </g>
            </g>
          </g>
        </svg>

        <p className="signin-intro-title">
          <LogIn size={17} aria-hidden="true" /> Ready to vote?
        </p>
        <p className="signin-intro-copy" role="status">
          Taking you to sign in…
        </p>
        <span className="signin-intro-bar" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>,
    document.body,
  )
}
