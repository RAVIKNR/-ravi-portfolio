import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  siCplusplus,
  siCss,
  siDocker,
  siExpress,
  siGsap,
  siGithub,
  siHtml5,
  siInstagram,
  siJest,
  siJavascript,
  siMongodb,
  siNodedotjs,
  siPostgresql,
  siReact,
  siRender,
  siRedis,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVite,
  type SimpleIcon,
} from 'simple-icons'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  DRACO_GLTF_CONFIG,
  DRACOLoader,
} from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import './App.css'

gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0)

const smoothScrollLockEvent = 'portfolio-smooth-scroll-lock'
const lenisScrollEvent = 'portfolio-lenis-scroll'
const smoothScrollLocks = new Set<string>()
let activeLenis: Lenis | null = null
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? ''
const contactFormEndpoint =
  import.meta.env.VITE_CONTACT_FORM_ENDPOINT?.trim() ?? ''
const contactLinkedIn = import.meta.env.VITE_LINKEDIN_URL?.trim() ?? ''
const contactMobile = import.meta.env.VITE_CONTACT_MOBILE?.trim() ?? ''
const configuredGithubUrl = import.meta.env.VITE_GITHUB_URL?.trim() ?? ''
const contactInstagram = import.meta.env.VITE_INSTAGRAM_URL?.trim() ?? ''

function setSmoothScrollLock(reason: string, locked: boolean) {
  const changed = locked
    ? !smoothScrollLocks.has(reason)
    : smoothScrollLocks.has(reason)

  if (!changed) {
    return
  }

  if (locked) {
    smoothScrollLocks.add(reason)
  } else {
    smoothScrollLocks.delete(reason)
  }

  window.dispatchEvent(new Event(smoothScrollLockEvent))
}

function SmoothScroll() {
  useEffect(() => {
    const nativeTouchScrolling = window.matchMedia('(pointer: coarse)').matches
    if (nativeTouchScrolling) {
      ScrollTrigger.refresh()
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      lerp: 0.12,
      smoothWheel: !reducedMotion,
      syncTouch: !reducedMotion,
      syncTouchLerp: 0.1,
      touchInertiaExponent: 1.2,
    })
    activeLenis = lenis

    const synchronizeLock = () => {
      lenis.scrollTo(window.scrollY, { force: true, immediate: true })
      if (smoothScrollLocks.size > 0) {
        lenis.stop()
      } else {
        lenis.start()
      }
    }

    const updateScrollTrigger = () => {
      ScrollTrigger.update()
      window.dispatchEvent(new Event(lenisScrollEvent))
    }
    const updateLenis = (time: number) => lenis.raf(time * 1000)

    window.addEventListener(smoothScrollLockEvent, synchronizeLock)
    lenis.on('scroll', updateScrollTrigger)
    gsap.ticker.add(updateLenis)
    synchronizeLock()
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener(smoothScrollLockEvent, synchronizeLock)
      lenis.off('scroll', updateScrollTrigger)
      gsap.ticker.remove(updateLenis)
      if (activeLenis === lenis) activeLenis = null
      lenis.destroy()
    }
  }, [])

  return null
}

const vertexShaderSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;

  uniform sampler2D uPortrait;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  varying vec2 vUv;

  void main() {
    vec2 depthStep = vec2(0.006);
    float sourceDepth = texture2D(uDepth, vUv).r;
    float depthLeft = texture2D(uDepth, vUv - vec2(depthStep.x, 0.0)).r;
    float depthRight = texture2D(uDepth, vUv + vec2(depthStep.x, 0.0)).r;
    float depthUp = texture2D(uDepth, vUv + vec2(0.0, depthStep.y)).r;
    float depthDown = texture2D(uDepth, vUv - vec2(0.0, depthStep.y)).r;
    float depth = (sourceDepth + depthLeft + depthRight + depthUp + depthDown) * 0.2;
    float depthGradient = max(
      max(abs(sourceDepth - depthLeft), abs(sourceDepth - depthRight)),
      max(abs(sourceDepth - depthUp), abs(sourceDepth - depthDown))
    );
    float contourMask = 1.0 - smoothstep(0.04, 0.14, depthGradient);
    float edgeDistance = min(
      min(vUv.x, 1.0 - vUv.x),
      min(vUv.y, 1.0 - vUv.y)
    );
    float edgeMask = smoothstep(0.0, 0.04, edgeDistance);
    float relativeDepth = depth - 0.5;
    vec2 displacement = uPointer * relativeDepth * 0.018;
    displacement *= contourMask * edgeMask;
    vec2 displacedUv = vUv + displacement;
    vec2 safeDisplacedUv = clamp(displacedUv, 0.006, 0.994);
    float displacedDepth = texture2D(uDepth, safeDisplacedUv).r;
    float displacedLeft = texture2D(uDepth, safeDisplacedUv - vec2(depthStep.x, 0.0)).r;
    float displacedRight = texture2D(uDepth, safeDisplacedUv + vec2(depthStep.x, 0.0)).r;
    float displacedUp = texture2D(uDepth, safeDisplacedUv + vec2(0.0, depthStep.y)).r;
    float displacedDown = texture2D(uDepth, safeDisplacedUv - vec2(0.0, depthStep.y)).r;
    float displacedGradient = max(
      max(abs(displacedDepth - displacedLeft), abs(displacedDepth - displacedRight)),
      max(abs(displacedDepth - displacedUp), abs(displacedDepth - displacedDown))
    );
    float boundaryCrossing = max(
      abs(displacedDepth - sourceDepth),
      displacedGradient
    );
    float boundaryMask = 1.0 - smoothstep(0.008, 0.028, boundaryCrossing);
    displacedUv = mix(vUv, displacedUv, boundaryMask);
    vec2 sampleUv = clamp(displacedUv, 0.006, 0.994);
    float sampleEdge = min(
      min(displacedUv.x, 1.0 - displacedUv.x),
      min(displacedUv.y, 1.0 - displacedUv.y)
    );
    float sampleMask = smoothstep(-0.002, 0.014, sampleEdge);
    gl_FragColor = vec4(texture2D(uPortrait, sampleUv).rgb, sampleMask);
  }
`

function PortraitDepthCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const portrait = canvas?.parentElement?.querySelector<HTMLImageElement>(
      '.portrait-foreground',
    )

    if (!canvas || !portrait) {
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const touchDevice = window.matchMedia('(pointer: coarse)').matches

    if (reducedMotion || touchDevice) {
      return
    }

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    })

    if (!gl) {
      return
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)

      if (!shader) {
        return null
      }

      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Portrait shader compilation failed:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }

      return shader
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    )

    if (!vertexShader || !fragmentShader) {
      return
    }

    const program = gl.createProgram()

    if (!program) {
      return
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Portrait shader linking failed:', gl.getProgramInfoLog(program))
      return
    }

    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    const pointerLocation = gl.getUniformLocation(program, 'uPointer')
    const portraitLocation = gl.getUniformLocation(program, 'uPortrait')
    const depthLocation = gl.getUniformLocation(program, 'uDepth')
    const buffer = gl.createBuffer()

    if (
      positionLocation < 0 ||
      !pointerLocation ||
      !portraitLocation ||
      !depthLocation ||
      !buffer
    ) {
      return
    }

    const loadTexture = (src: string) =>
      new Promise<WebGLTexture | null>((resolve) => {
        const image = new Image()
        image.onload = () => {
          const texture = gl.createTexture()

          if (!texture) {
            resolve(null)
            return
          }

          gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image,
          )
          resolve(texture)
        }
        image.onerror = () => resolve(null)
        image.src = src
      })

    let disposed = false
    let animationFrame: number | null = null
    let portraitTexture: WebGLTexture | null = null
    let depthTexture: WebGLTexture | null = null
    const targetPointer = { x: 0, y: 0 }
    const currentPointer = { x: 0, y: 0 }
    let initialized = false

    const resizeCanvas = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio))
      const height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const scheduleRender = () => {
      if (animationFrame === null && initialized && !disposed) {
        animationFrame = requestAnimationFrame(render)
      }
    }

    const render = () => {
      animationFrame = null

      if (disposed) {
        return
      }

      resizeCanvas()
      currentPointer.x += (targetPointer.x - currentPointer.x) * 0.08
      currentPointer.y += (targetPointer.y - currentPointer.y) * 0.08
      const pointerSettled =
        Math.abs(targetPointer.x - currentPointer.x) < 0.001 &&
        Math.abs(targetPointer.y - currentPointer.y) < 0.001

      if (pointerSettled) {
        currentPointer.x = targetPointer.x
        currentPointer.y = targetPointer.y
      }

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(pointerLocation, currentPointer.x, currentPointer.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      if (!pointerSettled) {
        scheduleRender()
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      targetPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      targetPointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1)
      scheduleRender()
    }

    const resetPointer = () => {
      targetPointer.x = 0
      targetPointer.y = 0
      scheduleRender()
    }

    const resizeObserver = new ResizeObserver(scheduleRender)
    resizeObserver.observe(canvas)

    const initialize = async () => {
      const textures = await Promise.all([
        loadTexture('/assets/portrait.png'),
        loadTexture('/assets/portrait-depth-map.png'),
      ])
      portraitTexture = textures[0]
      depthTexture = textures[1]

      if (disposed || !portraitTexture || !depthTexture) {
        return
      }

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      )
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, portraitTexture)
      gl.uniform1i(portraitLocation, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, depthTexture)
      gl.uniform1i(depthLocation, 1)
      canvas.classList.add('is-ready')
      canvas.parentElement?.classList.add('webgl-ready')
      initialized = true
      canvas.addEventListener('pointermove', handlePointerMove)
      canvas.addEventListener('pointerleave', resetPointer)
      scheduleRender()
    }

    void initialize()

    return () => {
      disposed = true
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
      }
      resizeObserver.disconnect()
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', resetPointer)
      canvas.classList.remove('is-ready')
      canvas.parentElement?.classList.remove('webgl-ready')
      gl.deleteTexture(portraitTexture)
      gl.deleteTexture(depthTexture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [])

  return <canvas ref={canvasRef} className="portrait-depth-canvas" aria-hidden="true" />
}

const sloganRows = [
  ['BUILDING', 'CRAFTING'],
  ['ALGORITHM', 'SOLUTIONS'],
  ['CREATING', 'SPARKING'],
  ['IMPACT', 'CHANGE'],
  ['SINCE 2025.', 'SINCE 2025.'],
]

function SloganWord({
  original,
  alternate,
  staggerStart,
  initialDelayMs,
  adjustedGapIndexes = [],
  tightGapIndexes = [],
}: {
  original: string
  alternate: string
  staggerStart: number
  initialDelayMs: number
  adjustedGapIndexes?: number[]
  tightGapIndexes?: number[]
}) {
  const renderText = (text: string, rising: boolean) => {
    let wordIndex = 0
    const parts = Array.from(text.matchAll(/\S+|\s+/g))

    return parts.map((match, partIndex) => {
      const part = match[0]
      const start = match.index

      if (/^\s+$/.test(part)) {
        return part
      }

      const characters = Array.from(part).map((character, index) => {
        const characterIndex = start + index
        return adjustedGapIndexes.includes(characterIndex) ? (
          <span
            className={`slogan-pair-spacing${tightGapIndexes.includes(characterIndex) ? ' slogan-pair-spacing-tight' : ''}`}
            key={characterIndex}
          >
            {character}
          </span>
        ) : (
          character
        )
      })

      if (!rising) {
        return <span key={partIndex}>{characters}</span>
      }

      const delay = `${initialDelayMs + (staggerStart + wordIndex) * 140}ms`
      wordIndex += 1
      return (
        <span className="rising-word-mask" key={partIndex}>
          <span className="rising-word" style={{ transitionDelay: delay }}>
            {characters}
          </span>
        </span>
      )
    })
  }

  return (
    <>
      <span className="slogan-layer-original">{renderText(original, true)}</span>
      <span className="slogan-layer-alternate" aria-hidden="true">
        {renderText(alternate, false)}
      </span>
    </>
  )
}

function Slogan({ isVisible }: { isVisible: boolean }) {
  return (
    <div className={`slogan${isVisible ? ' is-rising' : ''}`} id="hero-title">
      {sloganRows.map((row, rowIndex) => (
        <div
          className={`slogan-row ${rowIndex === 4 ? 'slogan-row-since' : ''}`}
          key={rowIndex}
          aria-label={row[0]}
        >
          <SloganWord
            original={row[0]}
            alternate={row[1]}
            staggerStart={rowIndex}
            initialDelayMs={500}
            adjustedGapIndexes={
              rowIndex === 0 ? [3] : rowIndex === 2 ? [2, 3] : []
            }
            tightGapIndexes={rowIndex === 2 ? [3] : []}
          />
        </div>
      ))}
    </div>
  )
}

function AboutStatement() {
  const statementRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const statement = statementRef.current

    if (!statement) {
      return
    }

    const reveal = () => statement.classList.add('is-visible')

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      reveal()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal()
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(statement)
    return () => observer.disconnect()
  }, [])

  return (
    <p className="about-statement" ref={statementRef}>
      <span className="about-statement-line">NOT JUST BUILDING THINGS.</span>
      <span className="about-statement-line">BUILDING WHAT MATTERS.</span>
    </p>
  )
}

const skillsTechnologyMarks = [
  {
    name: 'C++',
    path: 'M22.394 6c-.167-.29-.398-.543-.652-.69L12.926.22c-.509-.294-1.34-.294-1.848 0L2.26 5.31c-.508.293-.923 1.013-.923 1.6v10.18c0 .294.104.62.271.91.167.29.398.543.652.69l8.816 5.09c.508.293 1.34.293 1.848 0l8.816-5.09c.254-.147.485-.4.652-.69.167-.29.27-.616.27-.91V6.91c.003-.294-.1-.62-.268-.91zM12 19.11c-3.92 0-7.109-3.19-7.109-7.11 0-3.92 3.19-7.11 7.11-7.11a7.133 7.133 0 016.156 3.553l-3.076 1.78a3.567 3.567 0 00-3.08-1.78A3.56 3.56 0 008.444 12 3.56 3.56 0 0012 15.555a3.57 3.57 0 003.08-1.778l3.078 1.78A7.135 7.135 0 0112 19.11zm7.11-6.715h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79zm2.962 0h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79z',
  },
  {
    name: 'JavaScript',
    path: 'M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z',
  },
  {
    name: 'React',
    path: 'M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z',
  },
  {
    name: 'Node.js',
    path: 'M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0 0.097,0.054 0.189,0.139 0.235l2.409,1.392c1.307 0.654 2.108-.116 2.108-.89V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.112.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551l-2.209-1.327c-.57-.329-.922-.945-.922-1.604V6.921c0-.659.353-1.275.922-1.603l8.795-5.082c.557-.315 1.296-.315 1.848 0l8.794 5.082c.57.329.924.944.924 1.603v10.15c0 .659-.354 1.273-.924 1.604l-8.794 5.078c-.281.163-.6.247-.923.247zm7.101-10.007c0-1.9-1.284-2.406-3.987-2.763-2.731-.361-3.009-.548-3.009-1.187 0-.528.235-1.233 2.258-1.233 1.807 0 2.473.389 2.747 1.607.024.115.129.199.247.199h1.141c.071 0 .138-.031.186-.081.048-.054.074-.123.067-.196-.177-2.098-1.571-3.076-4.388-3.076-2.508 0-4.004 1.058-4.004 2.833 0 1.925 1.488 2.457 3.895 2.695 2.88.282 3.103.703 3.103 1.269 0 .983-.789 1.402-2.642 1.402-2.327 0-2.839-.584-3.011-1.742-.02-.124-.126-.215-.253-.215h-1.137c-.141 0-.254.112-.254.253 0 1.482.806 3.248 4.655 3.248 2.846 0 4.444-1.097 4.444-3.014z',
  },
  {
    name: 'GitHub',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    name: 'VS Code',
    path: 'M23.15 2.587 18.21.204a1.549 1.549 0 0 0-1.773.301L7.636 8.44 3.71 5.461a1.033 1.033 0 0 0-1.32.057L.344 7.353a1.034 1.034 0 0 0 .002 1.585L3.75 12 .346 15.062a1.034 1.034 0 0 0-.002 1.585l2.047 1.835a1.033 1.033 0 0 0 1.32.057l3.925-2.979 8.8 7.935a1.55 1.55 0 0 0 1.773.301l4.941-2.383a1.55 1.55 0 0 0 .87-1.397V3.984a1.55 1.55 0 0 0-.87-1.397zM18.219 16.25l-6.684-4.25 6.684-4.25zM5.028 12l5.213-4.004L15.185 12l-4.944 4.004z',
  },
  {
    name: 'Pre-SQL',
    path: 'M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zm0 2c4.42 0 8 1.12 8 2.5S16.42 9 12 9 4 7.9 4 6.5 7.58 4 12 4zm0 7c2.47 0 4.72-.4 6.3-1.05.59-.24 1.1-.53 1.7-.85v2.4c0 1.4-3.58 2.5-8 2.5s-8-1.1-8-2.5v-2.4c.6.32 1.11.61 1.7.85C7.28 10.6 9.53 11 12 11zm0 7c2.47 0 4.72-.4 6.3-1.05.59-.24 1.1-.53 1.7-.85v1.9c0 1.4-3.58 2.5-8 2.5s-8-1.1-8-2.5v-1.9c.6.32 1.11.61 1.7.85C7.28 17.6 9.53 18 12 18z',
  },
  {
    name: 'Python',
    path: 'M14.4.04H9.57C6.16.04 4.2 1.47 4.2 4.47v2.55h5.72v.8H3.5C1.35 7.82 0 9.6 0 12.02c0 2.46 1.16 4.12 3.5 4.12h2.1v-3.7c0-2.1 1.86-4.03 4.06-4.03h4.8c1.9 0 3.45-1.56 3.45-3.47V3.4c0-1.96-1.66-3.36-3.51-3.36zM10.9 2.05a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm2.25 7.47h-4.8c-1.95 0-3.5 1.67-3.5 3.67v6.8c0 1.89 1.65 2.98 3.5 3.5 2.2.65 4.37.77 6.8 0 1.72-.5 3.5-1.5 3.5-3.5v-2.48h-5.73v-.8h7.8c2.2 0 2.94-1.53 3.5-3.5.6-2.1.58-4.1 0-5.67-.43-1.26-1.3-2.32-3.5-2.32h-2.13v3.38c0 2.07-1.8 3.92-3.94 3.92zm1.95 7.88a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  },
]

const skillCategories = [
  {
    title: 'FRONTEND SKILLS',
    technologies: [
      'HTML5',
      'CSS',
      'JavaScript',
      'TypeScript',
      'React',
      'Tailwind CSS',
      'GSAP',
      'Three.js',
    ],
  },
  {
    title: 'BACKEND SKILLS',
    technologies: ['C++', 'Python', 'Node.js', 'Express', 'BullMQ'],
  },
  {
    title: 'DATABASE SKILLS',
    technologies: ['MongoDB', 'PostgreSQL', 'Redis'],
  },
  {
    title: 'TOOLS & PLATFORMS',
    technologies: ['GitHub', 'VS Code', 'Docker', 'Render', 'Vite', 'Jest'],
  },
] as const satisfies readonly {
  title: string
  technologies: readonly string[]
}[]

class SkillsEllipseCurve extends THREE.Curve<THREE.Vector3> {
  private readonly radiusX: number
  private readonly radiusY: number

  constructor(radiusX: number, radiusY: number) {
    super()
    this.radiusX = radiusX
    this.radiusY = radiusY
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const angle = t * Math.PI * 2
    return target.set(
      this.radiusX * Math.cos(angle),
      this.radiusY * Math.sin(angle),
      0,
    )
  }
}

const skillsTechnologyColors: Record<string, string> = {
  'C++': '#d7dde1',
  JavaScript: '#dfcf88',
  React: '#a4d5dc',
  'Node.js': '#a5c2a4',
  GitHub: '#ddd9d2',
  'VS Code': '#007acc',
  'Pre-SQL': '#c9c1b6',
  Python: '#3776ab',
}

const skillsCategoryIcons: Record<string, SimpleIcon> = {
  'C++': siCplusplus,
  CSS: siCss,
  Docker: siDocker,
  Express: siExpress,
  GitHub: siGithub,
  GSAP: siGsap,
  HTML5: siHtml5,
  Jest: siJest,
  JavaScript: siJavascript,
  MongoDB: siMongodb,
  'Node.js': siNodedotjs,
  PostgreSQL: siPostgresql,
  React: siReact,
  Render: siRender,
  Redis: siRedis,
  'Tailwind CSS': siTailwindcss,
  'Three.js': siThreedotjs,
  TypeScript: siTypescript,
  Vite: siVite,
}

function SkillsTechnologyLogo({
  name,
  path,
  variant = 'orbital',
}: {
  name: string
  path?: string
  variant?: 'orbital' | 'category'
}) {
  if (variant === 'category') {
    const icon = skillsCategoryIcons[name]
    if (!icon && !['BullMQ', 'Python', 'VS Code'].includes(name)) {
      throw new Error(`Missing SVG technology mark for Skills category: ${name}`)
    }
    const categoryFill = icon
      ? ['Express', 'GitHub', 'Render', 'Three.js'].includes(name)
        ? '#fff'
        : `#${icon.hex}`
      : skillsTechnologyColors[name]

    return (
      <span
        aria-hidden="true"
        className="skills-category-logo-badge"
        data-skills-technology-logo={name}
      >
        {name === 'BullMQ' ? (
          <img src="/assets/bullmq-logo.png" alt="" />
        ) : name === 'VS Code' ? (
          <img src="/assets/vscode-original.svg" alt="" />
        ) : (
          <svg
            viewBox={name === 'Python' ? '0 0 110 110' : '0 0 24 24'}
            aria-hidden="true"
          >
            {name === 'Python' ? (
              <>
                <path
                  fill="#3776ab"
                  d="M55.023-.077c-25.971 0-26.25 10.081-26.25 12.156 0 3.148 0 12.594 0 12.594h26.75v3.781s-27.852 0-37.375 0C10.199 28.454.21 33.287.21 54.704c0 19.673 7.792 27.281 15.656 27.281 2.335 0 9.344 0 9.344 0s0-9.765 0-13.125c0-5.491 2.721-15.656 15.406-15.656 15.91 0 19.971 0 26.531 0 3.902 0 14.906-1.696 14.906-14.406 0-13.452 0-17.89 0-24.219C82.054 11.426 81.515-.077 55.023-.077ZM40.273 8.392a4.813 4.813 0 1 1 0 9.626 4.813 4.813 0 0 1 0-9.626Z"
                />
                <path
                  fill="#ffd43b"
                  d="M55.397 109.923c25.959 0 26.282-10.271 26.282-12.156 0-3.148 0-12.594 0-12.594H54.897v-3.781s28.032 0 37.375 0c8.009 0 17.938-4.954 17.938-26.25 0-23.322-10.538-27.281-15.656-27.281-2.336 0-9.344 0-9.344 0s0 10.216 0 13.125c0 5.491-2.631 15.656-15.406 15.656-15.91 0-19.476 0-26.532 0-3.892 0-14.906 1.896-14.906 14.406 0 14.475 0 18.265 0 24.219 0 5.186 3.196 14.612 29.031 14.612Zm14.751-8.469a4.813 4.813 0 1 1 0-9.626 4.813 4.813 0 0 1 0 9.626Z"
                />
              </>
            ) : (
              <path d={icon?.path ?? path ?? ''} fill={categoryFill} />
            )}
          </svg>
        )}
      </span>
    )
  }

  if (!path) {
    throw new Error(`Missing SVG path for orbital technology mark: ${name}`)
  }

  if (name === 'VS Code') {
    return <img src="/assets/vscode-original.svg" alt="" aria-hidden="true" />
  }

  if (name === 'Python') {
    return (
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <path
          fill="#387eb8"
          d="M55.023-.077c-25.971 0-26.25 10.081-26.25 12.156 0 3.148 0 12.594 0 12.594h26.75v3.781s-27.852 0-37.375 0C10.199 28.454.21 33.287.21 54.704c0 19.673 7.792 27.281 15.656 27.281 2.335 0 9.344 0 9.344 0s0-9.765 0-13.125c0-5.491 2.721-15.656 15.406-15.656 15.91 0 19.971 0 26.531 0 3.902 0 14.906-1.696 14.906-14.406 0-13.452 0-17.89 0-24.219C82.054 11.426 81.515-.077 55.023-.077ZM40.273 8.392a4.813 4.813 0 1 1 0 9.626 4.813 4.813 0 0 1 0-9.626Z"
        />
        <path
          fill="#ffd43b"
          d="M55.397 109.923c25.959 0 26.282-10.271 26.282-12.156 0-3.148 0-12.594 0-12.594H54.897v-3.781s28.032 0 37.375 0c8.009 0 17.938-4.954 17.938-26.25 0-23.322-10.538-27.281-15.656-27.281-2.336 0-9.344 0-9.344 0s0 10.216 0 13.125c0 5.491-2.631 15.656-15.406 15.656-15.91 0-19.476 0-26.532 0-3.892 0-14.906 1.896-14.906 14.406 0 14.475 0 18.265 0 24.219 0 5.186 3.196 14.612 29.031 14.612Zm14.751-8.469a4.813 4.813 0 1 1 0-9.626 4.813 4.813 0 0 1 0 9.626Z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill={skillsTechnologyColors[name]} />
    </svg>
  )
}

function SkillsOrbitalShowcase() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const technologyTagRefs = useRef<(HTMLDivElement | null)[]>([])
  const frameId = useRef<number | null>(null)
  const previousFrameTime = useRef(0)
  const elapsedTime = useRef(0)
  const isInView = useRef(false)
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    if (window.matchMedia('(max-width: 800px)').matches) {
      return
    }

    const canvas = canvasRef.current
    const host = canvas?.parentElement

    if (!canvas || !host) {
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch (error) {
      console.error('The Skills 3D showcase could not initialize WebGL.', error)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80)
    const stage = new THREE.Group()
    scene.add(stage)

    scene.add(new THREE.AmbientLight(0xded8d0, 1.2))

    const keyLight = new THREE.DirectionalLight(0xf1eee9, 3.1)
    keyLight.position.set(-4.5, 5, 7)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x778391, 2.1)
    rimLight.position.set(4, -2.5, -4)
    scene.add(rimLight)

    const warmLight = new THREE.PointLight(0xe9713d, 6, 12, 2)
    warmLight.position.set(0, -1.6, 3.2)
    scene.add(warmLight)

    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []
    const screenCanvas = document.createElement('canvas')
    screenCanvas.width = 1024
    screenCanvas.height = 614
    const screenContext = screenCanvas.getContext('2d')

    if (!screenContext) {
      throw new Error('Unable to create a 2D context for the laptop display.')
    }

    screenContext.fillStyle = '#08090a'
    screenContext.fillRect(0, 0, screenCanvas.width, screenCanvas.height)
    const screenTexture = new THREE.CanvasTexture(screenCanvas)
    screenTexture.colorSpace = THREE.SRGBColorSpace
    screenTexture.minFilter = THREE.LinearMipmapLinearFilter
    screenTexture.magFilter = THREE.LinearFilter
    const screenLogo = new Image()
    const drawScreenLogo = () => {
      const scale = Math.min(
        (screenCanvas.width * 0.5) / screenLogo.naturalWidth,
        (screenCanvas.height * 0.66) / screenLogo.naturalHeight,
      )
      const width = screenLogo.naturalWidth * scale
      const height = screenLogo.naturalHeight * scale
      screenContext.drawImage(
        screenLogo,
        (screenCanvas.width - width) / 2,
        (screenCanvas.height - height) / 2,
        width,
        height,
      )
      screenTexture.needsUpdate = true
    }
    const handleScreenLogoError = () => {
      console.error('The portfolio logo could not be loaded onto the laptop display.')
    }
    screenLogo.addEventListener('load', drawScreenLogo)
    screenLogo.addEventListener('error', handleScreenLogoError)
    screenLogo.src = '/assets/logo.svg'
    textures.push(screenTexture)

    const laptop = new THREE.Group()
    laptop.rotation.set(0.22, -0.38, 0.015)
    stage.add(laptop)

    const lidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x505256,
      metalness: 0.48,
      roughness: 0.46,
      clearcoat: 0.24,
      clearcoatRoughness: 0.4,
    })
    const deckMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x34363a,
      metalness: 0.46,
      roughness: 0.48,
      clearcoat: 0.2,
      clearcoatRoughness: 0.44,
    })
    const hingeMaterial = new THREE.MeshStandardMaterial({
      color: 0x181a1c,
      metalness: 0.72,
      roughness: 0.34,
    })
    const keyMaterial = new THREE.MeshStandardMaterial({
      color: 0x292b2e,
      metalness: 0.2,
      roughness: 0.4,
    })
    const touchpadMaterial = new THREE.MeshStandardMaterial({
      color: 0x303236,
      metalness: 0.48,
      roughness: 0.42,
    })
    const screenMaterial = new THREE.MeshBasicMaterial({
      color: 0x08090a,
      toneMapped: false,
    })
    const emblemMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x202225,
      metalness: 0.62,
      roughness: 0.32,
      clearcoat: 0.34,
      clearcoatRoughness: 0.36,
    })
    materials.push(
      lidMaterial,
      deckMaterial,
      hingeMaterial,
      keyMaterial,
      touchpadMaterial,
      screenMaterial,
      emblemMaterial,
    )

    const lidPivot = new THREE.Group()
    lidPivot.position.set(0, -0.92, -0.78)
    lidPivot.rotation.x = -0.045
    laptop.add(lidPivot)

    const lidGeometry = new RoundedBoxGeometry(4.05, 2.5, 0.12, 8, 0.042)
    const lid = new THREE.Mesh(lidGeometry, lidMaterial)
    lid.position.y = 1.25
    lidPivot.add(lid)
    geometries.push(lidGeometry)

    const screenGeometry = new RoundedBoxGeometry(4.02, 2.46, 0.018, 8, 0.045)
    const screen = new THREE.Mesh(screenGeometry, screenMaterial)
    screen.position.set(0, 1.25, 0.066)
    lidPivot.add(screen)
    geometries.push(screenGeometry)

    const screenDisplayMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
    })
    const screenDisplayGeometry = new THREE.PlaneGeometry(3.82, 2.28)
    const screenDisplay = new THREE.Mesh(
      screenDisplayGeometry,
      screenDisplayMaterial,
    )
    screenDisplay.position.set(0, 1.25, 0.077)
    lidPivot.add(screenDisplay)
    geometries.push(screenDisplayGeometry)
    materials.push(screenDisplayMaterial)

    const emblemShape = new THREE.Shape()
    emblemShape.moveTo(-0.23, 0.13)
    emblemShape.lineTo(-0.08, 0.18)
    emblemShape.lineTo(0.01, 0.08)
    emblemShape.lineTo(0.09, 0.28)
    emblemShape.lineTo(0.23, 0.33)
    emblemShape.lineTo(0.2, -0.12)
    emblemShape.lineTo(0, -0.26)
    emblemShape.lineTo(-0.23, -0.1)
    emblemShape.closePath()
    const emblemGeometry = new THREE.ExtrudeGeometry(emblemShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 3,
    })
    const emblem = new THREE.Mesh(emblemGeometry, emblemMaterial)
    emblem.rotation.y = Math.PI
    emblem.position.set(0, 1.25, -0.06)
    lidPivot.add(emblem)
    geometries.push(emblemGeometry)

    const deckPivot = new THREE.Group()
    deckPivot.position.set(0, -0.92, -0.78)
    deckPivot.rotation.x = 0.42
    laptop.add(deckPivot)

    const deckProfile = new THREE.Shape()
    deckProfile.moveTo(0, -0.026)
    deckProfile.lineTo(2.28, -0.026)
    deckProfile.lineTo(2.21, 0.008)
    deckProfile.lineTo(0.14, 0.028)
    deckProfile.lineTo(0, 0.028)
    deckProfile.closePath()
    const deckGeometry = new THREE.ExtrudeGeometry(deckProfile, {
      depth: 4.02,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.006,
      bevelSegments: 3,
      steps: 1,
    })
    deckGeometry.rotateY(-Math.PI / 2)
    const deck = new THREE.Mesh(deckGeometry, deckMaterial)
    deck.position.x = 2.01
    deckPivot.add(deck)
    geometries.push(deckGeometry)

    const hingeGeometry = new THREE.CylinderGeometry(0.032, 0.032, 0.62, 20)
    for (const x of [-1.22, 1.22]) {
      const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial)
      hinge.rotation.z = Math.PI / 2
      hinge.position.set(x, -0.005, -0.025)
      deckPivot.add(hinge)
    }
    geometries.push(hingeGeometry)

    const ventGeometry = new RoundedBoxGeometry(0.06, 0.012, 0.016, 3, 0.004)
    const vents = new THREE.InstancedMesh(ventGeometry, hingeMaterial, 18)
    const ventTransform = new THREE.Object3D()
    for (let index = 0; index < 18; index += 1) {
      ventTransform.position.set((index - 8.5) * 0.105, -0.108, 0.035)
      ventTransform.updateMatrix()
      vents.setMatrixAt(index, ventTransform.matrix)
    }
    vents.instanceMatrix.needsUpdate = true
    deckPivot.add(vents)
    geometries.push(ventGeometry)

    const keyboardPlateGeometry = new RoundedBoxGeometry(3.76, 0.01, 1.08, 6, 0.016)
    const keyboardPlate = new THREE.Mesh(keyboardPlateGeometry, hingeMaterial)
    keyboardPlate.position.set(0, 0.017, 0.72)
    deckPivot.add(keyboardPlate)
    geometries.push(keyboardPlateGeometry)

    const keyGeometry = new RoundedBoxGeometry(0.22, 0.042, 0.15, 3, 0.009)
    const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, 70)
    const keyShadowMaterial = new THREE.MeshStandardMaterial({
      color: 0x090a0c,
      roughness: 0.72,
    })
    materials.push(keyShadowMaterial)
    const keyShadows = new THREE.InstancedMesh(keyGeometry, keyShadowMaterial, 70)
    const keyTransform = new THREE.Object3D()
    let keyIndex = 0
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 14; column += 1) {
        const keyZ = 0.25 + row * 0.18
        const deckTop = 0.028 - ((keyZ - 0.14) / 2.07) * 0.02
        const keyX = (column - 6.5) * 0.248
        keyTransform.position.set(keyX, deckTop + 0.021, keyZ)
        keyTransform.updateMatrix()
        keys.setMatrixAt(keyIndex, keyTransform.matrix)
        keyTransform.scale.set(1.055, 1, 1.055)
        keyTransform.position.set(
          keyX,
          deckTop + 0.019,
          keyZ,
        )
        keyTransform.updateMatrix()
        keyShadows.setMatrixAt(keyIndex, keyTransform.matrix)
        keyTransform.scale.set(1, 1, 1)
        keyIndex += 1
      }
    }
    keys.instanceMatrix.needsUpdate = true
    keyShadows.instanceMatrix.needsUpdate = true
    deckPivot.add(keys)
    deckPivot.add(keyShadows)
    geometries.push(keyGeometry)

    const touchpadFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x151719,
      metalness: 0.3,
      roughness: 0.52,
    })
    materials.push(touchpadFrameMaterial)
    const touchpadFrameGeometry = new RoundedBoxGeometry(1.53, 0.01, 1.02, 8, 0.08)
    const touchpadFrame = new THREE.Mesh(touchpadFrameGeometry, touchpadFrameMaterial)
    touchpadFrame.position.set(0, 0.018, 1.63)
    deckPivot.add(touchpadFrame)
    geometries.push(touchpadFrameGeometry)

    const touchpadGeometry = new RoundedBoxGeometry(1.46, 0.012, 0.95, 8, 0.07)
    const touchpad = new THREE.Mesh(touchpadGeometry, touchpadMaterial)
    touchpad.position.set(0, 0.026, 1.63)
    deckPivot.add(touchpad)
    geometries.push(touchpadGeometry)

    const stickerBackingMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x25282b,
      metalness: 0.28,
      roughness: 0.42,
      clearcoat: 0.4,
      clearcoatRoughness: 0.36,
    })
    const stickerBackingGeometry = new RoundedBoxGeometry(0.44, 0.008, 0.36, 6, 0.035)
    const stickerGeometry = new THREE.PlaneGeometry(0.4, 0.32)
    const stickerSpecs = [
      { x: -1.24, color: '#91d7df', symbol: 'react' },
      { x: 1.24, color: '#e98255', symbol: 'code' },
    ] as const
    materials.push(stickerBackingMaterial)
    geometries.push(stickerBackingGeometry, stickerGeometry)
    stickerSpecs.forEach(({ x, color, symbol }) => {
      const stickerCanvas = document.createElement('canvas')
      stickerCanvas.width = 256
      stickerCanvas.height = 208
      const context = stickerCanvas.getContext('2d')
      if (!context) {
        throw new Error('Unable to create a 2D context for a laptop sticker.')
      }

      context.strokeStyle = color
      context.lineWidth = 9
      context.lineCap = 'round'
      context.lineJoin = 'round'
      if (symbol === 'react') {
        context.beginPath()
        context.ellipse(128, 104, 91, 34, 0, 0, Math.PI * 2)
        context.stroke()
        context.beginPath()
        context.ellipse(128, 104, 91, 34, Math.PI / 3, 0, Math.PI * 2)
        context.stroke()
        context.beginPath()
        context.ellipse(128, 104, 91, 34, -Math.PI / 3, 0, Math.PI * 2)
        context.stroke()
        context.beginPath()
        context.arc(128, 104, 10, 0, Math.PI * 2)
        context.fillStyle = color
        context.fill()
      } else {
        context.beginPath()
        context.moveTo(91, 60)
        context.lineTo(51, 104)
        context.lineTo(91, 148)
        context.moveTo(165, 60)
        context.lineTo(205, 104)
        context.lineTo(165, 148)
        context.moveTo(145, 52)
        context.lineTo(111, 156)
        context.stroke()
      }

      const stickerTexture = new THREE.CanvasTexture(stickerCanvas)
      stickerTexture.colorSpace = THREE.SRGBColorSpace
      stickerTexture.generateMipmaps = true
      stickerTexture.minFilter = THREE.LinearMipmapLinearFilter
      stickerTexture.magFilter = THREE.LinearFilter
      textures.push(stickerTexture)
      const backing = new THREE.Mesh(stickerBackingGeometry, stickerBackingMaterial)
      backing.position.set(x, 0.021, 1.67)
      deckPivot.add(backing)
      const decalMaterial = new THREE.MeshBasicMaterial({
        map: stickerTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
      materials.push(decalMaterial)
      const decal = new THREE.Mesh(stickerGeometry, decalMaterial)
      decal.rotation.x = -Math.PI / 2
      decal.position.set(x, 0.027, 1.67)
      deckPivot.add(decal)
    })

    const orbitSpecs = [
      {
        radiusX: 10.2,
        radiusY: 3.2,
        tiltX: 0.26,
        tiltZ: -Math.PI / 6,
        direction: 1,
        speed: 0.16,
        phase: 0,
        color: 0xe8995c,
        emissive: 0x8f391d,
      },
      {
        radiusX: 10.2,
        radiusY: 3.2,
        tiltX: -0.26,
        tiltZ: Math.PI / 6,
        direction: -1,
        speed: 0.13,
        phase: Math.PI / 5,
        color: 0xf0c27b,
        emissive: 0x84501e,
      },
    ] as const

    const orbits = orbitSpecs.map((spec, orbitIndex) => {
      const group = new THREE.Group()
      group.rotation.set(spec.tiltX, 0, spec.tiltZ)
      stage.add(group)

      const curve = new SkillsEllipseCurve(spec.radiusX, spec.radiusY)
      const geometry = new THREE.TubeGeometry(curve, 256, 0.014, 8, true)
      const material = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: 0.78,
        metalness: 0.35,
        roughness: 0.28,
        transparent: true,
        opacity: 0.86,
      })
      const ring = new THREE.Mesh(geometry, material)
      ring.renderOrder = 1
      group.add(ring)
      geometries.push(geometry)
      materials.push(material)

      return { group, curve, spec, orbitIndex }
    })

    const technologyTags = skillsTechnologyMarks.map((_, index) => {
      const element = technologyTagRefs.current[index]
      return {
        element,
        index: index % 4,
        orbit: orbits[Math.floor(index / 4)],
        width: element?.offsetWidth ?? 0,
        height: element?.offsetHeight ?? 0,
        position: new THREE.Vector3(),
        projected: new THREE.Vector3(),
      }
    })

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const resize = () => {
      const bounds = host.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) {
        return
      }

      const scale = bounds.width <= 640 ? 0.78 : 1
      technologyTags.forEach((tag) => {
        if (tag.element) {
          tag.width = tag.element.offsetWidth
          tag.height = tag.element.offsetHeight
        }
      })
      camera.aspect = bounds.width / bounds.height
      stage.scale.setScalar(scale)
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const horizontalRadius = 10.4 * scale
      const verticalRadius = 6.2 * scale
      camera.position.set(
        0,
        0,
        (Math.max(verticalRadius, horizontalRadius / camera.aspect) / tangent) *
          1.12,
      )
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      camera.updateProjectionMatrix()
      renderer.setSize(bounds.width, bounds.height, false)
      if (reducedMotion && isInView.current) {
        renderFrame(performance.now())
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const updatePointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return
      }

      const bounds = host.getBoundingClientRect()
      pointer.current.targetX =
        ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.3
      pointer.current.targetY =
        ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.2
    }
    const resetPointer = () => {
      pointer.current.targetX = 0
      pointer.current.targetY = 0
    }
    host.addEventListener('pointermove', updatePointer)
    host.addEventListener('pointerleave', resetPointer)

    const renderFrame = (time: number) => {
      frameId.current = null
      if (!isInView.current || document.hidden) {
        return
      }

      const delta = previousFrameTime.current === 0
        ? 0
        : Math.min((time - previousFrameTime.current) / 1000, 0.04)
      previousFrameTime.current = time
      const hostWidth = host.clientWidth
      const hostHeight = host.clientHeight
      const hostBounds = host.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      if (!reducedMotion) {
        elapsedTime.current += delta
        const rotationStartTop = Math.max(
          (window.innerHeight - hostHeight) / 2,
          0,
        )
        const rotationEndTop = Math.min(
          0,
          rotationStartTop - window.innerHeight / 2,
        )
        const scrollProgress = THREE.MathUtils.clamp(
          (rotationStartTop - hostBounds.top) /
            (rotationStartTop - rotationEndTop),
          0,
          1,
        )
        const lidCloseProgress = THREE.MathUtils.smoothstep(
          scrollProgress,
          0.5,
          1,
        )
        laptop.position.y = Math.sin(elapsedTime.current * 0.58) * 0.075
        laptop.rotation.x = 0.22 + Math.sin(elapsedTime.current * 0.34) * 0.014
        laptop.rotation.y =
          -0.38 +
          Math.cos(elapsedTime.current * 0.29) * 0.018 +
          scrollProgress * Math.PI / 2
        lidPivot.rotation.x =
          -0.045 + lidCloseProgress * THREE.MathUtils.degToRad(45)
        pointer.current.x +=
          (pointer.current.targetX - pointer.current.x) *
          Math.min(1, delta * 1.8)
        pointer.current.y +=
          (pointer.current.targetY - pointer.current.y) *
          Math.min(1, delta * 1.8)
        camera.position.x = pointer.current.x
        camera.position.y = pointer.current.y
        camera.lookAt(0, 0, 0)
        camera.updateMatrixWorld()

        orbits.forEach(({ group, spec, orbitIndex }) => {
          const phase = orbitIndex * Math.PI
          group.rotation.x = spec.tiltX + Math.sin(elapsedTime.current * 0.14 + phase) * 0.018
          group.rotation.y = Math.cos(elapsedTime.current * 0.11 + phase) * 0.024
          group.rotation.z = spec.tiltZ + Math.sin(elapsedTime.current * 0.1 + phase) * 0.014
        })
      }

      technologyTags.forEach(({ element, width, height, orbit, index, position, projected }) => {
        const turns =
          index / 4 +
          orbit.spec.phase / (Math.PI * 2) +
          (elapsedTime.current * orbit.spec.speed * orbit.spec.direction) /
          (Math.PI * 2)
        const pathProgress = ((turns % 1) + 1) % 1
        orbit.curve.getPointAt(pathProgress, position)
        orbit.group.localToWorld(position)
        projected.copy(position).project(camera)
        if (element) {
          const centerX = hostBounds.left + (projected.x + 1) * hostWidth / 2
          const centerY = hostBounds.top + (1 - projected.y) * hostHeight / 2
          element.style.left =
            `${Math.round((centerX - width / 2) * pixelRatio) / pixelRatio - hostBounds.left}px`
          element.style.top =
            `${Math.round((centerY - height / 2) * pixelRatio) / pixelRatio - hostBounds.top}px`
        }
      })

      renderer.render(scene, camera)
      if (!reducedMotion) {
        frameId.current = requestAnimationFrame(renderFrame)
      }
    }

    const startRendering = () => {
      if (frameId.current === null && isInView.current && !document.hidden) {
        previousFrameTime.current = 0
        frameId.current = requestAnimationFrame(renderFrame)
      }
    }
    const stopRendering = () => {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
      previousFrameTime.current = 0
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isInView.current = entry.isIntersecting
        if (isInView.current) {
          startRendering()
        } else {
          stopRendering()
        }
      },
      { rootMargin: '120px 0px', threshold: 0 },
    )
    visibilityObserver.observe(host)

    const handleVisibility = () => {
      if (document.hidden) {
        stopRendering()
      } else {
        startRendering()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      screenLogo.removeEventListener('load', drawScreenLogo)
      screenLogo.removeEventListener('error', handleScreenLogoError)
      stopRendering()
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      host.removeEventListener('pointermove', updatePointer)
      host.removeEventListener('pointerleave', resetPointer)
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      textures.forEach((texture) => texture.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <figure className="skills-orbit-showcase" data-skills-reveal>
      <canvas
        ref={canvasRef}
        className="skills-orbit-canvas"
        role="img"
        aria-label="A floating dark gray HP Victus-style laptop displaying the portfolio logo, with a hinge, keyboard deck, and two intersecting technology orbits"
      />
      <div className="skills-orbit-tags" aria-hidden="true">
        {skillsTechnologyMarks.map(({ name, path }, index) => (
          <div
            className="skills-orbit-tag-position"
            key={name}
            ref={(element) => {
              technologyTagRefs.current[index] = element
            }}
          >
            <div className="skills-orbit-tag">
              <SkillsTechnologyLogo name={name} path={path} />
              <span>{name}</span>
            </div>
          </div>
        ))}
      </div>
      <ul className="skills-orbit-accessible" aria-label="Technology tags in orbit">
        {skillsTechnologyMarks.map(({ name }) => <li key={name}>{name}</li>)}
      </ul>
    </figure>
  )
}

function SkillsFloatingObjects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverStates = useRef({ drink: false, mouse: false })
  const frameId = useRef<number | null>(null)
  const previousFrameTime = useRef(0)
  const inView = useRef(false)

  useEffect(() => {
    let effectDisposed = false
    const canvas = canvasRef.current
    const host = canvas?.parentElement

    if (!canvas || !host) {
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch (error) {
      console.error('The floating Skills objects could not initialize WebGL.', error)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 5, -5, 0.1, 40)
    camera.position.z = 20
    scene.add(new THREE.AmbientLight(0xc3c5c8, 1.05))

    const keyLight = new THREE.DirectionalLight(0xd6d9dc, 3)
    keyLight.position.set(-4, 6, 8)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x85898d, 2.3)
    rimLight.position.set(4, 1, -5)
    scene.add(rimLight)

    const drink = new THREE.Group()
    const drinkAxialRotation = new THREE.Group()
    const mouse = new THREE.Group()
    const mouseAxialRotation = new THREE.Group()
    const drinkBaseScale = new THREE.Vector3()
    const mouseBaseScale = new THREE.Vector3()
    const drinkScaleTarget = new THREE.Vector3()
    const mouseScaleTarget = new THREE.Vector3()
    drink.add(drinkAxialRotation)
    mouse.add(mouseAxialRotation)
    scene.add(drink, mouse)
    const drinkUpperLight = new THREE.PointLight(0xd6d9dc, 9, 3.6, 2)
    drinkUpperLight.position.set(0, 1.65, 2.2)
    drink.add(drinkUpperLight)

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(DRACO_GLTF_CONFIG)
    dracoLoader.setWorkerLimit(2)
    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)
    const disposeModel = (root: THREE.Object3D) => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return
        }

        object.geometry.dispose()
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        meshMaterials.forEach((material) => material.dispose())
      })
    }

    const loadModel = async (
      url: string,
      targetSize: number,
      group: THREE.Group,
    ) => {
      const { scene: model } = await gltfLoader.loadAsync(url)
      const cameras: THREE.Camera[] = []
      model.traverse((object) => {
        if (object instanceof THREE.Camera) {
          cameras.push(object)
        }
      })
      cameras.forEach((modelCamera) => modelCamera.removeFromParent())
      model.updateMatrixWorld(true)

      const bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)
      if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
        disposeModel(model)
        throw new Error(`The floating Skills model has invalid bounds: ${url}`)
      }

      const modelScale = targetSize / maxDimension
      model.scale.setScalar(modelScale)
      model.position.copy(bounds.getCenter(new THREE.Vector3()))
        .multiplyScalar(-modelScale)
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return
        }

        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        meshMaterials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            const isDrink = group === drinkAxialRotation
            material.color.setHex(isDrink ? 0x383838 : 0x404040)
            material.roughness = isDrink ? 0.54 : 0.42
            material.metalness = 0.08
          }
        })
      })
      model.updateMatrixWorld(true)

      if (effectDisposed) {
        disposeModel(model)
        return
      }

      group.add(model)
      if (reducedMotion && inView.current) {
        renderer.render(scene, camera)
      }
    }

    void Promise.all([
      loadModel('/assets/skills-coffee.gltf', 3.8, drinkAxialRotation),
      loadModel('/assets/skills-mouse.gltf', 3.7, mouseAxialRotation),
    ]).catch((error: unknown) => {
      console.error('The floating Skills GLTF models could not be loaded.', error)
    })

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let aspect = 1
    let drinkScrollProgress = 0
    let mouseScrollProgress = 0
    const updateScrollProgress = () => {
      const bounds = host.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const rowHeight = bounds.height / 4
      drinkScrollProgress = THREE.MathUtils.clamp(
        (viewportHeight - bounds.top) / (viewportHeight + rowHeight),
        0,
        1,
      )
      const mouseAreaTop = bounds.top + rowHeight * 2
      mouseScrollProgress = THREE.MathUtils.clamp(
        (viewportHeight - mouseAreaTop) /
          (viewportHeight + rowHeight * 2),
        0,
        1,
      )

      drink.position.set(-0.48 * 10 * aspect, 0.65, 0)
      drink.rotation.set(0.45, 0, -0.36)
      drinkAxialRotation.rotation.y = drinkScrollProgress * Math.PI * 0.6
      mouse.position.set(
        (0.995 - 0.5) * 10 * aspect,
        -2.2 - mouseScrollProgress * 0.15,
        0,
      )
      mouse.rotation.set(0, 0, 1.2)
      mouseAxialRotation.rotation.y = -0.5 - mouseScrollProgress * 0.55

      if (reducedMotion && inView.current) {
        renderer.render(scene, camera)
      }
    }

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) {
        return
      }

      aspect = bounds.width / bounds.height
      const responsiveScale = Math.min(1, Math.max(0.9, aspect / 1.6))
      camera.left = -5 * aspect
      camera.right = 5 * aspect
      camera.top = 5
      camera.bottom = -5
      camera.updateProjectionMatrix()
      renderer.setSize(bounds.width, bounds.height, false)

      drinkBaseScale.setScalar(responsiveScale * 1.62)
      drink.scale.copy(drinkBaseScale)
      mouseBaseScale.setScalar(responsiveScale * 1.98)
      mouse.scale.copy(mouseBaseScale)
      updateScrollProgress()

      if (reducedMotion && inView.current) {
        renderer.render(scene, camera)
      }
    }

    const renderFrame = (time: number) => {
      frameId.current = null
      if (!inView.current || document.hidden) {
        return
      }

      const delta = previousFrameTime.current === 0
        ? 0
        : Math.min((time - previousFrameTime.current) / 1000, 0.04)
      previousFrameTime.current = time
      if (!reducedMotion) {
        const drinkHover = hoverStates.current.drink ? 1.045 : 1
        const mouseHover = hoverStates.current.mouse ? 1.045 : 1
        drinkScaleTarget.copy(drinkBaseScale).multiplyScalar(drinkHover)
        mouseScaleTarget.copy(mouseBaseScale).multiplyScalar(mouseHover)
        drink.scale.lerp(drinkScaleTarget, Math.min(1, delta * 5))
        mouse.scale.lerp(mouseScaleTarget, Math.min(1, delta * 5))
      }

      renderer.render(scene, camera)
      if (!reducedMotion) {
        frameId.current = requestAnimationFrame(renderFrame)
      }
    }

    const startRendering = () => {
      if (frameId.current === null && inView.current && !document.hidden) {
        previousFrameTime.current = 0
        frameId.current = requestAnimationFrame(renderFrame)
      }
    }
    const stopRendering = () => {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
      previousFrameTime.current = 0
    }
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting
        if (inView.current) {
          startRendering()
        } else {
          stopRendering()
        }
      },
      { rootMargin: '120px 0px', threshold: 0 },
    )
    const resizeObserver = new ResizeObserver(resize)
    visibilityObserver.observe(host)
    resizeObserver.observe(host)
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    window.addEventListener('resize', updateScrollProgress)
    resize()
    const handleVisibility = () => {
      if (document.hidden) {
        stopRendering()
      } else {
        startRendering()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      effectDisposed = true
      stopRendering()
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('scroll', updateScrollProgress)
      window.removeEventListener('resize', updateScrollProgress)
      document.removeEventListener('visibilitychange', handleVisibility)
      disposeModel(drink)
      disposeModel(mouse)
      dracoLoader.dispose()
      renderer.dispose()
    }
  }, [])

  const setHoveredObject = (object: 'drink' | 'mouse', hovered: boolean) => {
    hoverStates.current[object] = hovered
  }

  return (
    <div className="skills-floating-objects" aria-label="Floating 3D objects">
      <canvas ref={canvasRef} className="skills-floating-objects-canvas" aria-hidden="true" />
      <div
        aria-label="Floating dark drink cup with a straw"
        className="skills-floating-object-hit skills-floating-object-hit--drink"
        data-skills-floating-object
        role="img"
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') {
            setHoveredObject('drink', true)
          }
        }}
        onPointerLeave={() => setHoveredObject('drink', false)}
      />
      <div
        aria-label="Floating charcoal computer mouse with a scroll wheel"
        className="skills-floating-object-hit skills-floating-object-hit--mouse"
        data-skills-floating-object
        role="img"
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') {
            setHoveredObject('mouse', true)
          }
        }}
        onPointerLeave={() => setHoveredObject('mouse', false)}
      />
    </div>
  )
}

function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const skillsEndingRef = useRef<HTMLDivElement>(null)
  const categoryRowsRef = useRef<(HTMLDivElement | null)[]>([])
  const marqueeDistancesRef = useRef<number[]>([])
  const marqueeOffsetsRef = useRef<number[]>([])
  const marqueeFrameRef = useRef<number | null>(null)
  const categoryMeasureFrameRef = useRef<number | null>(null)
  const previousMarqueeTimeRef = useRef<number | null>(null)
  const activeSkillCategoryRef = useRef<number | null>(null)
  const activateSkillCategoryRef = useRef<(index: number) => void>(() => {})
  const deactivateSkillCategoryRef = useRef<(index: number) => void>(() => {})
  const categoryPointerPositionRef = useRef({ x: -1, y: -1 })
  const headingReturnTimersRef = useRef<(number | null)[]>([])
  const categoryCloseGenerationRef = useRef<number[]>([])
  const [activeSkillCategory, setActiveSkillCategory] = useState<number | null>(
    null,
  )
  const [expandedSkillCategories, setExpandedSkillCategories] = useState<
    boolean[]
  >(() => skillCategories.map(() => false))
  const expandedSkillCategoriesRef = useRef(expandedSkillCategories)
  const [restoredHeadingCategories, setRestoredHeadingCategories] = useState<
    boolean[]
  >(() => skillCategories.map(() => false))
  const [trackCopiesCounts, setTrackCopiesCounts] = useState<number[]>(
    () => skillCategories.map(() => 1),
  )

  const updateExpandedSkillCategories = (next: boolean[]) => {
    expandedSkillCategoriesRef.current = next
    next.forEach((expanded, index) => {
      if (!expanded && activeSkillCategoryRef.current !== index) {
        const track =
          categoryRowsRef.current[index]?.querySelector<HTMLElement>(
            '.skills-category-track',
          )
        track?.style.removeProperty('transform')
        track?.style.removeProperty('transition')
        marqueeOffsetsRef.current[index] = Number.NaN
      }
    })
    setExpandedSkillCategories(next)
  }

  const completeCategoryClose = (index: number, generation: number) => {
    const row = categoryRowsRef.current[index]
    const curtain = row?.querySelector<HTMLElement>(
      '.skills-category-curtain',
    )
    if (
      !row ||
      !curtain ||
      categoryCloseGenerationRef.current[index] !== generation ||
      activeSkillCategoryRef.current === index ||
      !expandedSkillCategoriesRef.current[index] ||
      !row.classList.contains('is-closing') ||
      getComputedStyle(curtain).clipPath !== 'inset(50% 0px)'
    ) {
      return
    }

    if (
      headingReturnTimersRef.current[index] !== null &&
      headingReturnTimersRef.current[index] !== undefined
    ) {
      return
    }

    headingReturnTimersRef.current[index] = window.setTimeout(() => {
      headingReturnTimersRef.current[index] = null
      if (
        categoryCloseGenerationRef.current[index] !== generation ||
        activeSkillCategoryRef.current === index ||
        !expandedSkillCategoriesRef.current[index]
      ) {
        return
      }

      setRestoredHeadingCategories((current) =>
        current.map((restored, categoryIndex) =>
          categoryIndex === index ? true : restored,
        ),
      )
      updateExpandedSkillCategories(
        expandedSkillCategoriesRef.current.map((expanded, categoryIndex) =>
          categoryIndex === index ? false : expanded,
        ),
      )
    }, 60)
  }

  const checkForImmediateCategoryClose = (
    index: number,
    generation: number,
  ) => {
    window.requestAnimationFrame(() => {
      const row = categoryRowsRef.current[index]
      const curtain = row?.querySelector<HTMLElement>(
        '.skills-category-curtain',
      )
      if (
        !row ||
        !curtain ||
        categoryCloseGenerationRef.current[index] !== generation ||
        activeSkillCategoryRef.current === index ||
        !expandedSkillCategoriesRef.current[index] ||
        !row.classList.contains('is-closing')
      ) {
        return
      }

      const hasRunningTransition = curtain
        .getAnimations({ subtree: false })
        .some(
          (animation) =>
            animation.playState === 'running' ||
            animation.pending,
        )
      if (!hasRunningTransition) {
        completeCategoryClose(index, generation)
      }
    })
  }

  const activateSkillCategory = (index: number) => {
    if (
      activeSkillCategoryRef.current === index &&
      expandedSkillCategoriesRef.current[index]
    ) {
      return
    }

    const previousIndex = activeSkillCategoryRef.current
    if (previousIndex !== null && previousIndex !== index) {
      const closeGeneration =
        (categoryCloseGenerationRef.current[previousIndex] ?? 0) + 1
      categoryCloseGenerationRef.current[previousIndex] = closeGeneration
      checkForImmediateCategoryClose(previousIndex, closeGeneration)
    }

    categoryCloseGenerationRef.current[index] =
      (categoryCloseGenerationRef.current[index] ?? 0) + 1
    const headingTimer = headingReturnTimersRef.current[index]
    if (headingTimer !== null && headingTimer !== undefined) {
      window.clearTimeout(headingTimer)
      headingReturnTimersRef.current[index] = null
    }
    setRestoredHeadingCategories((current) =>
      current.map((restored, categoryIndex) =>
        categoryIndex === index ? false : restored,
      ),
    )

    const track =
      categoryRowsRef.current[index]?.querySelector<HTMLElement>(
        '.skills-category-track',
      )
    if (track) {
      const transform = getComputedStyle(track).transform
      if (transform !== 'none') {
        marqueeOffsetsRef.current[index] = new DOMMatrixReadOnly(transform).m41
      }
      track.style.removeProperty('transition')
    }

    activeSkillCategoryRef.current = index
    setActiveSkillCategory(index)
    updateExpandedSkillCategories(
      expandedSkillCategoriesRef.current.map(
        (expanded, categoryIndex) => expanded || categoryIndex === index,
        ),
    )
  }

  const deactivateSkillCategory = (index: number) => {
    if (activeSkillCategoryRef.current !== index) {
      return
    }

    activeSkillCategoryRef.current = null
    setActiveSkillCategory(null)
    const generation =
      (categoryCloseGenerationRef.current[index] ?? 0) + 1
    categoryCloseGenerationRef.current[index] = generation
    checkForImmediateCategoryClose(index, generation)
  }

  useEffect(() => {
    activateSkillCategoryRef.current = activateSkillCategory
    deactivateSkillCategoryRef.current = deactivateSkillCategory
  })

  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return
      }

      categoryPointerPositionRef.current.x = event.clientX
      categoryPointerPositionRef.current.y = event.clientY
    }

    const updateHoveredCategory = () => {
      const { x, y } = categoryPointerPositionRef.current
      if (x < 0 || y < 0) {
        return
      }

      const row = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>('.skills-category-row')
      const index = categoryRowsRef.current.findIndex(
        (categoryRow) => categoryRow === row,
      )

      if (index >= 0) {
        activateSkillCategoryRef.current(index)
      } else if (activeSkillCategoryRef.current !== null) {
        deactivateSkillCategoryRef.current(activeSkillCategoryRef.current)
      }
    }

    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('scroll', updateHoveredCategory, {
      passive: true,
    })

    return () => {
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('scroll', updateHoveredCategory)
    }
  }, [])

  useEffect(() => {
    expandedSkillCategories.forEach((expanded, index) => {
      if (expanded && activeSkillCategory !== index) {
        checkForImmediateCategoryClose(
          index,
          categoryCloseGenerationRef.current[index] ?? 0,
        )
      }
    })
  }, [activeSkillCategory, expandedSkillCategories])

  useEffect(() => {
    const measureCategories = () => {
      const nextCopiesCounts = skillCategories.map(() => 1)

      skillCategories.forEach((_, index) => {
        const row = categoryRowsRef.current[index]
        const track = row?.querySelector<HTMLElement>('.skills-category-track')
        const list = track?.querySelector('.skills-category-technology-list')
        if (!row || !track || !list) {
          return
        }

        const items = Array.from(list.children)
        const itemsWidth = items.reduce(
          (total, item) => total + item.getBoundingClientRect().width,
          0,
        )
        const maxItemWidth = Math.max(
          ...items.map((item) => item.getBoundingClientRect().width),
        )
        const rowWidth = row.getBoundingClientRect().width
        const gap = Math.max(
          40,
          (rowWidth + maxItemWidth - itemsWidth) / items.length,
        )
        const gapValue = `${gap}px`
        if (track.style.getPropertyValue('--skills-track-gap') !== gapValue) {
          track.style.setProperty('--skills-track-gap', gapValue)
        }
        const cycleDistance = itemsWidth + items.length * gap
        if (
          index === activeSkillCategory ||
          expandedSkillCategoriesRef.current[index]
        ) {
          nextCopiesCounts[index] = Math.max(
            2,
            Math.ceil(1 + (rowWidth + gap) / cycleDistance),
          )
        }

        const distance = cycleDistance
        const previousDistance = marqueeDistancesRef.current[index]
        const previousOffset = marqueeOffsetsRef.current[index]

        if (
          previousDistance > 0 &&
          distance !== previousDistance &&
          Number.isFinite(previousOffset)
        ) {
          const progress = (previousOffset + previousDistance) / previousDistance
          marqueeOffsetsRef.current[index] =
            -distance + ((progress % 1 + 1) % 1) * distance
        }

        marqueeDistancesRef.current[index] = distance
      })

      setTrackCopiesCounts((current) =>
        nextCopiesCounts.some(
          (copyCount, index) => copyCount !== current[index],
        )
          ? nextCopiesCounts
          : current,
      )
    }

    const observer = new ResizeObserver(() => {
      if (categoryMeasureFrameRef.current === null) {
        categoryMeasureFrameRef.current = window.requestAnimationFrame(() => {
          categoryMeasureFrameRef.current = null
          measureCategories()
        })
      }
    })
    measureCategories()
    categoryRowsRef.current.forEach((row) => {
      if (row) {
        observer.observe(row)
        const list = row.querySelector('.skills-category-technology-list')
        if (list) {
          observer.observe(list)
        }
      }
    })

    return () => {
      observer.disconnect()
      if (categoryMeasureFrameRef.current !== null) {
        window.cancelAnimationFrame(categoryMeasureFrameRef.current)
        categoryMeasureFrameRef.current = null
      }
    }
  }, [activeSkillCategory])

  useEffect(() => {
    const section = sectionRef.current

    if (!section) {
      return
    }

    const sectionRevealTargets = [
      ...section.querySelectorAll<HTMLElement>('[data-skills-reveal]'),
    ]
    const endingRevealTargets = [
      ...(skillsEndingRef.current?.querySelectorAll<HTMLElement>(
        '[data-skills-reveal]',
      ) ?? []),
    ]
    const revealTargets = [...sectionRevealTargets, ...endingRevealTargets]

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      revealTargets.forEach((target) => target.classList.add('is-revealed'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-revealed', entry.isIntersecting)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -12% 0px' },
    )

    sectionRevealTargets.forEach((target) => observer.observe(target))

    const endingObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target
          const isRevealed = target.classList.contains('is-revealed')
          const shouldReveal = isRevealed
            ? entry.isIntersecting
            : entry.isIntersecting && entry.intersectionRatio >= 0.12

          target.classList.toggle('is-revealed', shouldReveal)
        })
      },
      { threshold: [0, 0.12], rootMargin: '32px 0px' },
    )

    endingRevealTargets.forEach((target) => endingObserver.observe(target))
    return () => {
      observer.disconnect()
      endingObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const activeIndex = activeSkillCategory
    const activeTracks = categoryRowsRef.current.flatMap((row, index) => {
      if (
        !row ||
        (index !== activeIndex && !expandedSkillCategories[index])
      ) {
        return []
      }

      const track = row.querySelector<HTMLElement>('.skills-category-track')
      return track && marqueeDistancesRef.current[index] > 0
        ? [{ index, track }]
        : []
    })

    if (activeTracks.length === 0) {
      return
    }

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const pixelsPerMillisecond = 0.036

    const animate = (time: number) => {
      const previousTime = previousMarqueeTimeRef.current
      const elapsed =
        previousTime === null ? 0 : Math.min(time - previousTime, 50)
      previousMarqueeTimeRef.current = time

      activeTracks.forEach(({ index, track }) => {
        const distance = marqueeDistancesRef.current[index]
        if (distance <= 0) {
          return
        }

        let offset = marqueeOffsetsRef.current[index]
        if (!Number.isFinite(offset)) {
          offset = -distance
        }

        offset += elapsed * pixelsPerMillisecond
        if (offset >= 0) {
          offset -= distance
        }

        marqueeOffsetsRef.current[index] = offset
        track.style.transform = `translate3d(${offset}px, 0, 0)`
      })

      marqueeFrameRef.current = requestAnimationFrame(animate)
    }

    const stopAnimation = () => {
      if (marqueeFrameRef.current !== null) {
        cancelAnimationFrame(marqueeFrameRef.current)
        marqueeFrameRef.current = null
      }
      previousMarqueeTimeRef.current = null
    }

    const updateAnimation = () => {
      if (motionPreference.matches) {
        stopAnimation()
      } else if (marqueeFrameRef.current === null) {
        previousMarqueeTimeRef.current = null
        marqueeFrameRef.current = requestAnimationFrame(animate)
      }
    }

    motionPreference.addEventListener('change', updateAnimation)
    updateAnimation()

    return () => {
      motionPreference.removeEventListener('change', updateAnimation)
      stopAnimation()
    }
  }, [activeSkillCategory, expandedSkillCategories])

  return (
    <>
      <section
        className="skills-section"
        id="skills"
        aria-labelledby="skills-title"
        ref={sectionRef}
      >
      <div className="skills-intro">
        <p className="skills-eyebrow" data-skills-reveal>MY TECHNICAL WORLD</p>
        <h2 id="skills-title" aria-label="SKILLS & TECH.">
          <span className="skills-tech-line" data-skills-reveal>
            <span className="slogan-layer-original skills-tech-original">
              SKILLS &amp;
            </span>
            <span className="slogan-layer-alternate" aria-hidden="true">
              JACK OF
            </span>
          </span>
          <span className="skills-tech-line" data-skills-reveal>
            <span className="slogan-layer-original skills-tech-original">
              TECH<span className="skills-title-period">.</span>
            </span>
            <span className="slogan-layer-alternate" aria-hidden="true">
              STACK
            </span>
          </span>
        </h2>
        <p className="skills-description" data-skills-reveal>
          The technologies, tools and ideas I use to turn concepts into working
          solutions.
        </p>
      </div>

      <SkillsOrbitalShowcase />

      <p className="skills-disclaimer">
        Technology marks shown for visual illustration only.
      </p>

      <div className="skills-categories" aria-label="Skill categories">
        <SkillsFloatingObjects />
        {skillCategories.map((category, index) => {
          const isActive = activeSkillCategory === index
          const isExpanded = expandedSkillCategories[index]
          const isClosing = isExpanded && !isActive
          const triggerId = `skills-category-trigger-${index}`
          const panelId = `skills-category-panel-${index}`
          const renderTechnologyItems = () =>
            category.technologies.map((name) => {
              if (
                !skillsCategoryIcons[name] &&
                !['BullMQ', 'Python', 'VS Code'].includes(name)
              ) {
                throw new Error(
                  `Missing SVG technology mark for Skills category: ${name}`,
                )
              }

              return (
                <li
                  className="skills-category-technology"
                  key={name}
                >
                  <SkillsTechnologyLogo name={name} variant="category" />
                  <span>{name}</span>
                </li>
              )
            })
          const trackCopies = Array.from(
            { length: isExpanded ? trackCopiesCounts[index] : 1 },
            (_, copyIndex) => (
              <ul
                aria-hidden={copyIndex > 0 ? true : undefined}
                className="skills-category-technology-list"
                inert={copyIndex > 0}
                key={copyIndex}
              >
                {renderTechnologyItems()}
              </ul>
            ),
          )

          return (
            <div
              className={`skills-category-row${isExpanded ? ' is-expanded' : ''}${isActive ? ' is-active' : ''}${isClosing ? ' is-closing' : ''}${isClosing && restoredHeadingCategories[index] ? ' is-heading-restored' : ''}`}
              key={category.title}
              ref={(element) => {
                categoryRowsRef.current[index] = element
              }}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') {
                  activateSkillCategory(index)
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch') {
                  deactivateSkillCategory(index)
                }
              }}
              onPointerUp={(event) => {
                if (event.pointerType === 'touch') {
                  if (activeSkillCategoryRef.current === index) {
                    deactivateSkillCategory(index)
                  } else {
                    activateSkillCategory(index)
                  }
                }
              }}
            >
              <div
                className="skills-category-curtain"
                aria-hidden="true"
                onTransitionEnd={(event) => {
                  if (
                    event.propertyName !== 'clip-path' ||
                    activeSkillCategoryRef.current === index ||
                    !expandedSkillCategoriesRef.current[index] ||
                    !event.currentTarget.parentElement?.classList.contains(
                      'is-closing',
                    )
                  ) {
                    return
                  }

                  completeCategoryClose(
                    index,
                    categoryCloseGenerationRef.current[index] ?? 0,
                  )
                }}
              >
                <div
                  aria-hidden={!isExpanded}
                  aria-labelledby={triggerId}
                  className="skills-category-panel"
                  id={panelId}
                  inert={!isExpanded}
                  role="region"
                >
                  <div className="skills-category-track">{trackCopies}</div>
                </div>
              </div>
              <h3 className="skills-category-heading">
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className="skills-category-trigger"
                  id={triggerId}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      activateSkillCategory(index)
                    }
                  }}
                  onFocus={() => activateSkillCategory(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      deactivateSkillCategory(index)
                    }
                  }}
                  type="button"
                >
                  <span className="skills-category-index">0{index + 1}</span>
                  <span>{category.title}</span>
                </button>
              </h3>
            </div>
          )
        })}
      </div>
        <aside
          className="skills-exploring-panel"
          aria-labelledby="skills-exploring-title"
          data-skills-reveal
        >
          <div className="skills-exploring-copy">
            <p className="skills-eyebrow">CURRENTLY EXPLORING</p>
            <h2 id="skills-exploring-title">
              GenAI <span>&amp; Beyond.</span>
            </h2>
            <p>
              Exploring emerging technologies, expanding my technical
              perspective, and discovering new ways to build intelligent
              solutions.
            </p>
          </div>
          <span className="skills-exploring-mark" aria-hidden="true">
            <span>01</span>
            <i />
            <span>OPEN ENDED</span>
          </span>
        </aside>
      </section>

      <div className="skills-work-flow" ref={skillsEndingRef}>
        <section
          className="skills-work-transition"
          aria-labelledby="skills-work-transition-title"
        >
          <p className="skills-work-kicker" data-skills-reveal>
            FROM LEARNING TO MAKING
          </p>
          <h2
            id="skills-work-transition-title"
            aria-label="LET'S SEE WHAT I CAN BUILD."
            data-skills-reveal
          >
            <span className="skills-work-line">
              <span className="slogan-layer-original skills-work-original">
                {'LE'}<span className="skills-work-letter-t">T</span>
                <span className="skills-work-apostrophe">&apos;</span>
                {'S SEE WHAT I CAN'}
              </span>
              <span className="slogan-layer-alternate" aria-hidden="true">
                {'LE'}<span className="skills-work-letter-t">T</span>
                <span className="skills-work-apostrophe">&apos;</span>
                {'S DEPLOY AND'}
              </span>
            </span>
            <span className="skills-work-line">
              <span className="slogan-layer-original skills-work-original skills-work-build">
                BUIL<span className="skills-work-build-gap">D</span>.
              </span>
              <span className="slogan-layer-alternate" aria-hidden="true">
                PRAY TO GOD.
              </span>
            </span>
          </h2>
          <span className="skills-work-rule" aria-hidden="true" />
        </section>

        <section
          className="work-section"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="work-section-heading" data-skills-reveal>
            <p className="skills-work-kicker">A SELECTION OF PROJECTS</p>
            <h2 id="work-title" aria-label="SELECTED WORK.">
              <span className="work-heading-line">
                <span className="slogan-layer-original work-heading-original">
                  SELECTED WORK<span className="work-heading-period">.</span>
                </span>
                <span className="slogan-layer-alternate" aria-hidden="true">
                  CONTROLLED CHAOS.
                </span>
              </span>
            </h2>
          </div>
          <ProjectGallery />
        </section>
      </div>
    </>
  )
}

function ContactRobot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const scrollInteractionFrameRef = useRef<number | null>(null)
  const isInViewRef = useRef(false)
  const isPageVisibleRef = useRef(true)
  const previousFrameTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch (error) {
      console.error('The Contact robot could not initialize WebGL.', error)
      host.dataset.webglFailure = 'true'
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)
    camera.position.set(0, 0.35, 7.6)
    camera.lookAt(0, 0.35, 0)

    scene.add(new THREE.AmbientLight(0xe4e0d9, 1.25))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6)
    keyLight.position.set(-3.5, 4.5, 6)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x9ca8b1, 1.6)
    rimLight.position.set(3.5, 2, -4)
    scene.add(rimLight)
    const purpleRimLight = new THREE.DirectionalLight(0x513b78, 0.55)
    purpleRimLight.position.set(4, 1.5, -2.5)
    scene.add(purpleRimLight)
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const createMaterial = (
      color: number,
      roughness = 0.42,
      metalness = 0.06,
    ) => {
      const material = new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      })
      materials.push(material)
      return material
    }
    const shellMaterial = createMaterial(0x121416, 0.18, 0.82)
    const faceMaterial = createMaterial(0x777a82, 0.24, 0.82)
    const sideMaterial = createMaterial(0x37303f, 0.23, 0.78)
    const eyeMaterial = createMaterial(0xffffff, 0.16, 0.08)
    eyeMaterial.emissive.set(0xffffff)
    eyeMaterial.emissiveIntensity = 0.12
    const pupilMaterial = createMaterial(0x25292d, 0.15, 0.72)
    const neckMaterial = createMaterial(0x090a0b, 0.2, 0.78)
    const swivelMaterial = createMaterial(0x747780, 0.2, 0.84)
    const earBaseMaterial = createMaterial(0x181a1e, 0.16, 0.88)
    earBaseMaterial.side = THREE.DoubleSide
    earBaseMaterial.polygonOffset = true
    earBaseMaterial.polygonOffsetFactor = -1
    earBaseMaterial.polygonOffsetUnits = -1
    const earGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6a24,
      metalness: 0.76,
      roughness: 0.18,
      emissive: 0xff4b12,
      emissiveIntensity: 1.6,
    })
    materials.push(earGlowMaterial)
    const earRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff762e,
      metalness: 0.62,
      roughness: 0.24,
      emissive: 0xff4b12,
      emissiveIntensity: 1.35,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    materials.push(earRingMaterial)
    const earCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0xff762e,
      metalness: 0.62,
      roughness: 0.24,
      emissive: 0xff4b12,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
    materials.push(earCoreMaterial)

    const makeRoundedBox = (
      parent: THREE.Object3D,
      size: [number, number, number],
      radius: number,
      material: THREE.Material,
      position: [number, number, number],
    ) => {
      const geometry = new RoundedBoxGeometry(...size, 5, radius)
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      parent.add(mesh)
      return mesh
    }
    const makeSphere = (
      parent: THREE.Object3D,
      radius: number,
      material: THREE.Material,
      position: [number, number, number],
      widthSegments = 24,
      heightSegments = 16,
    ) => {
      const geometry = new THREE.SphereGeometry(
        radius,
        widthSegments,
        heightSegments,
      )
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      parent.add(mesh)
      return mesh
    }
    const makeCylinder = (
      parent: THREE.Object3D,
      radiusTop: number,
      radiusBottom: number,
      height: number,
      material: THREE.Material,
      position: [number, number, number],
      segments = 32,
    ) => {
      const geometry = new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        segments,
      )
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      parent.add(mesh)
      return mesh
    }
    const makeTorus = (
      parent: THREE.Object3D,
      radius: number,
      tube: number,
      material: THREE.Material,
      position: [number, number, number],
      normalAngle: number,
    ) => {
      const geometry = new THREE.TorusGeometry(radius, tube, 16, 48)
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      mesh.rotation.y = normalAngle
      parent.add(mesh)
      return mesh
    }
    const robot = new THREE.Group()
    scene.add(robot)
    const floatFromPosition = new THREE.Vector3()
    const floatTargetPosition = new THREE.Vector3()
    const floatFromRotation = new THREE.Vector3()
    const floatTargetRotation = new THREE.Vector3()
    let floatStartedAt: number | null = null
    let floatDuration = 0

    const chooseFloatTarget = (seconds: number) => {
      floatFromPosition.copy(robot.position)
      floatFromRotation.set(robot.rotation.x, robot.rotation.y, robot.rotation.z)
      floatTargetPosition.set(
        (Math.random() * 2 - 1) * 0.3,
        (Math.random() * 2 - 1) * 0.25,
        (Math.random() * 2 - 1) * 0.05,
      )
      floatTargetRotation.set(
        (Math.random() * 2 - 1) * 0.04,
        (Math.random() * 2 - 1) * 0.06,
        (Math.random() * 2 - 1) * 0.07,
      )
      floatStartedAt = seconds
      floatDuration = 2.8 + Math.random() * 2
    }

    const body = new THREE.Group()
    body.position.y = -0.7
    body.rotation.y = 0.3
    robot.add(body)
    makeRoundedBox(body, [2.12, 1.82, 1.5], 0.12, shellMaterial, [0, 0, 0])
    makeRoundedBox(
      body,
      [0.09, 1.34, 1.08],
      0.065,
      sideMaterial,
      [1.02, 0, 0],
    )
    for (const side of [-1, 1]) {
      makeRoundedBox(
        body,
        [0.032, 1.44, 0.045],
        0.015,
        earGlowMaterial,
        [side * 0.99, 0, 0.745],
      )
    }

    const neckPivot = new THREE.Group()
    neckPivot.position.set(0, 0.12, 0)
    robot.add(neckPivot)
    makeRoundedBox(
      neckPivot,
      [0.26, 0.16, 0.28],
      0.07,
      neckMaterial,
      [0, 0.05, 0],
    )
    makeCylinder(
      neckPivot,
      0.19,
      0.29,
      0.42,
      swivelMaterial,
      [0, 0.34, 0],
    )
    makeCylinder(neckPivot, 0.29, 0.29, 0.09, neckMaterial, [0, 0.1, 0])
    makeCylinder(neckPivot, 0.18, 0.18, 0.1, neckMaterial, [0, 0.58, 0])
    makeRoundedBox(
      neckPivot,
      [0.5, 0.12, 0.42],
      0.06,
      neckMaterial,
      [0, 0.6, 0],
    )

    const headPivot = new THREE.Group()
    headPivot.position.y = 0.7
    neckPivot.add(headPivot)
    const head = new THREE.Group()
    head.position.y = 0.57
    head.rotation.z = -0.035
    head.rotation.y = -0.12
    headPivot.add(head)
    makeRoundedBox(head, [1.82, 1.68, 1.3], 0.18, shellMaterial, [0, 0, 0])
    makeRoundedBox(
      head,
      [1.56, 1.42, 0.14],
      0.14,
      faceMaterial,
      [0, 0, 0.66],
    )
    makeRoundedBox(
      head,
      [0.085, 1.18, 0.055],
      0.03,
      sideMaterial,
      [0.88, 0, -0.02],
    )

    for (const side of [-1, 1]) {
      const earAssembly = new THREE.Group()
      earAssembly.position.set(side * 1.02, 0.02, 0.11)
      earAssembly.rotation.y = side * 1.2
      earAssembly.scale.set(1.633, 1.633, 0.986)
      head.add(earAssembly)

      const earBase = makeCylinder(
        earAssembly,
        0.25,
        0.25,
        0.09,
        earBaseMaterial,
        [0, 0, 0.025],
        48,
      )
      earBase.rotation.x = Math.PI / 2

      const earFace = makeCylinder(
        earAssembly,
        0.218,
        0.218,
        0.018,
        earBaseMaterial,
        [0, 0, 0.065],
        48,
      )
      earFace.rotation.x = Math.PI / 2

      makeTorus(
        earAssembly,
        0.202,
        0.022,
        earBaseMaterial,
        [0, 0, 0.078],
        0,
      )
      makeTorus(
        earAssembly,
        0.16,
        0.018,
        earRingMaterial,
        [0, 0, 0.082],
        0,
      )

      const earCore = makeCylinder(
        earAssembly,
        0.13,
        0.13,
        0.008,
        earCoreMaterial,
        [0, 0, 0.074],
        48,
      )
      earCore.rotation.x = Math.PI / 2
    }

    const pupils: THREE.Group[] = []
    for (const eyeX of [-0.48, 0.48]) {
      const eye = new THREE.Group()
      eye.position.set(eyeX * 0.72, 0.03, 0.79)
      head.add(eye)
      makeSphere(eye, 0.24, eyeMaterial, [0, 0, 0])

      const pupil = new THREE.Group()
      pupil.position.set(0, 0, 0.19)
      eye.add(pupil)
      makeSphere(pupil, 0.115, pupilMaterial, [0, 0, 0.015])
      makeSphere(pupil, 0.035, eyeMaterial, [-0.03, 0.04, 0.1], 16, 12)
      pupils.push(pupil)
    }

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      clientX: 0,
      clientY: 0,
      hasPosition: false,
    }
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    isPageVisibleRef.current = !document.hidden

    const render = () => renderer.render(scene, camera)
    const applyPointerPose = () => {
      const x = pointer.x
      const y = pointer.y
      neckPivot.rotation.z = -x * 0.055
      neckPivot.rotation.x = -y * 0.075
      headPivot.rotation.y = x * 0.32
      headPivot.rotation.x = -y * 0.26
      pupils.forEach((pupil) => {
        pupil.position.x = x * 0.082
        pupil.position.y = y * 0.082
      })
    }

    const renderFrame = (time: number) => {
      animationFrameRef.current = null
      if (!isInViewRef.current || !isPageVisibleRef.current) return
      const previousTime = previousFrameTimeRef.current || time
      const delta = Math.min((time - previousTime) / 1000, 0.05)
      previousFrameTimeRef.current = time
      const easing = 1 - Math.exp(-delta * 9)
      pointer.x += (pointer.targetX - pointer.x) * easing
      pointer.y += (pointer.targetY - pointer.y) * easing
      applyPointerPose()
      if (!reducedMotion) {
        const seconds = time * 0.001
        let segmentStartedAt = floatStartedAt
        if (segmentStartedAt === null) {
          chooseFloatTarget(seconds)
          segmentStartedAt = seconds
        }

        let progress = (seconds - segmentStartedAt) / floatDuration
        if (progress >= 1) {
          robot.position.copy(floatTargetPosition)
          robot.rotation.set(
            floatTargetRotation.x,
            floatTargetRotation.y,
            floatTargetRotation.z,
          )
          chooseFloatTarget(seconds)
          progress = 0
        }

        const easedProgress = progress * progress * (3 - 2 * progress)
        robot.position.lerpVectors(
          floatFromPosition,
          floatTargetPosition,
          easedProgress,
        )
        robot.rotation.set(
          THREE.MathUtils.lerp(
            floatFromRotation.x,
            floatTargetRotation.x,
            easedProgress,
          ),
          THREE.MathUtils.lerp(
            floatFromRotation.y,
            floatTargetRotation.y,
            easedProgress,
          ),
          THREE.MathUtils.lerp(
            floatFromRotation.z,
            floatTargetRotation.z,
            easedProgress,
          ),
        )
      } else {
        robot.position.set(0, 0, 0)
        robot.rotation.set(0, 0, 0)
      }
      render()
      animationFrameRef.current = window.requestAnimationFrame(renderFrame)
    }
    const startRendering = () => {
      if (
        animationFrameRef.current === null &&
        isInViewRef.current &&
        isPageVisibleRef.current &&
        !reducedMotion
      ) {
        previousFrameTimeRef.current = 0
        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
      }
    }

    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    previousFrameTimeRef.current = 0
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    let isTrackingPointer = false
    const updatePointerTarget = (clientX: number, clientY: number) => {
      pointer.clientX = clientX
      pointer.clientY = clientY
      pointer.hasPosition = true
      pointer.targetX = Math.max(
        -1,
        Math.min(1, (clientX / window.innerWidth) * 2 - 1),
      )
      pointer.targetY = Math.max(
        -1,
        Math.min(1, 1 - (clientY / window.innerHeight) * 2),
      )
    }
    const refreshScrollInteraction = () => {
      scrollInteractionFrameRef.current = null
      if (!pointer.hasPosition) return

      const bounds = host.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      pointer.targetX = Math.max(
        -1,
        Math.min(
          1,
          ((pointer.clientX - bounds.left) / bounds.width) * 2 - 1,
        ),
      )
      pointer.targetY = Math.max(
        -1,
        Math.min(
          1,
          1 - ((pointer.clientY - bounds.top) / bounds.height) * 2,
        ),
      )

      if (!isInViewRef.current || !isPageVisibleRef.current) return

      if (reducedMotion) {
        pointer.x = pointer.targetX
        pointer.y = pointer.targetY
        applyPointerPose()
        render()
      } else {
        startRendering()
      }
    }
    const scheduleScrollInteractionRefresh = () => {
      if (
        isPageVisibleRef.current &&
        scrollInteractionFrameRef.current === null
      ) {
        scrollInteractionFrameRef.current = window.requestAnimationFrame(
          refreshScrollInteraction,
        )
      }
    }
    const cancelScrollInteractionRefresh = () => {
      if (scrollInteractionFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollInteractionFrameRef.current)
        scrollInteractionFrameRef.current = null
      }
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      updatePointerTarget(event.clientX, event.clientY)
      if (!isInViewRef.current || !isPageVisibleRef.current) return
      if (reducedMotion) {
        pointer.x = pointer.targetX
        pointer.y = pointer.targetY
        applyPointerPose()
        render()
      } else {
        startRendering()
      }
    }
    const handleViewportResize = () => {
      if (pointer.hasPosition) {
        updatePointerTarget(pointer.clientX, pointer.clientY)
        if (reducedMotion) {
          pointer.x = pointer.targetX
          pointer.y = pointer.targetY
          applyPointerPose()
          render()
        } else {
          startRendering()
        }
      }
    }
    const handlePointerLeave = () => {
      pointer.hasPosition = false
      pointer.targetX = 0
      pointer.targetY = 0
      if (reducedMotion) {
        pointer.x = 0
        pointer.y = 0
        applyPointerPose()
        render()
      }
    }
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) handlePointerLeave()
    }
    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    })
    window.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('blur', handlePointerLeave)
    window.addEventListener('scroll', scheduleScrollInteractionRefresh, {
      passive: true,
    })
    window.addEventListener(lenisScrollEvent, scheduleScrollInteractionRefresh)
    const startPointerTracking = () => {
      if (isTrackingPointer || !isInViewRef.current || !isPageVisibleRef.current)
        return
      isTrackingPointer = true
      window.addEventListener('resize', handleViewportResize)
      scheduleScrollInteractionRefresh()
    }
    const stopPointerTracking = () => {
      if (!isTrackingPointer) return
      isTrackingPointer = false
      window.removeEventListener('resize', handleViewportResize)
      cancelScrollInteractionRefresh()
    }
    const visibilityChange = () => {
      isPageVisibleRef.current = !document.hidden
      if (isPageVisibleRef.current) {
        startPointerTracking()
        scheduleScrollInteractionRefresh()
        startRendering()
      } else {
        stopPointerTracking()
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    }
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInViewRef.current = entry.isIntersecting
      if (isInViewRef.current) {
        render()
        startPointerTracking()
        scheduleScrollInteractionRefresh()
        startRendering()
      } else {
        stopPointerTracking()
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    })

    document.addEventListener('visibilitychange', visibilityChange)
    intersectionObserver.observe(host)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      stopPointerTracking()
      cancelScrollInteractionRefresh()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('blur', handlePointerLeave)
      window.removeEventListener('scroll', scheduleScrollInteractionRefresh)
      window.removeEventListener(lenisScrollEvent, scheduleScrollInteractionRefresh)
      document.removeEventListener('visibilitychange', visibilityChange)
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <div
      className="contact-robot"
      role="img"
      aria-label="Interactive 3D robot"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="contact-robot-fallback" role="status">
        The 3D robot is unavailable in this browser.
      </p>
    </div>
  )
}

function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<'name' | 'email' | 'message', string>>
  >({})
  const [submissionStatus, setSubmissionStatus] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [emailCopyStatus, setEmailCopyStatus] = useState<
    'copied' | 'error' | null
  >(null)
  const linkedInUrl = /^https:\/\/(?:www\.)?linkedin\.com\//i.test(
    contactLinkedIn,
  )
    ? contactLinkedIn
    : ''
  const githubUrl = /^https:\/\/(?:www\.)?github\.com\//i.test(
    configuredGithubUrl,
  )
    ? configuredGithubUrl
    : 'https://github.com/RAVIKNR'
  const instagramUrl = /^https:\/\/(?:www\.)?instagram\.com\//i.test(
    contactInstagram,
  )
    ? contactInstagram
    : ''
  const mobileNumber = contactMobile.replace(/[^\d+]/g, '')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const handleContactLightMove = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return

      const surface = event.target.closest<HTMLElement>('[data-contact-light]')
      if (!surface) return

      const bounds = surface.getBoundingClientRect()
      surface.style.setProperty(
        '--contact-light-x',
        `${event.clientX - bounds.left}px`,
      )
      surface.style.setProperty(
        '--contact-light-y',
        `${event.clientY - bounds.top}px`,
      )
    }
    const handleContactLightOut = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return

      const surface = event.target.closest<HTMLElement>('[data-contact-light]')
      if (
        !surface ||
        (event.relatedTarget instanceof Node && surface.contains(event.relatedTarget))
      ) {
        return
      }

      surface.style.removeProperty('--contact-light-x')
      surface.style.removeProperty('--contact-light-y')
    }
    const removeContactLightListeners = () => {
      section.removeEventListener('pointermove', handleContactLightMove)
      section.removeEventListener('pointerout', handleContactLightOut)
    }
    section.addEventListener('pointermove', handleContactLightMove, {
      passive: true,
    })
    section.addEventListener('pointerout', handleContactLightOut)

    const revealTargets = [
      ...section.querySelectorAll<HTMLElement>('[data-contact-reveal]'),
    ]
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      revealTargets.forEach((target) => target.classList.add('is-revealed'))
      return removeContactLightListeners
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -12% 0px' },
    )
    revealTargets.forEach((target) => observer.observe(target))
    return () => {
      observer.disconnect()
      removeContactLightListeners()
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSending) return

    const form = event.currentTarget
    const values = new FormData(form)
    const name = String(values.get('name') ?? '').trim()
    const email = String(values.get('email') ?? '').trim()
    const subject = String(values.get('subject') ?? '').trim()
    const message = String(values.get('message') ?? '').trim()
    const nextErrors: Partial<
      Record<'name' | 'email' | 'message', string>
    > = {}

    if (!name) nextErrors.name = 'Please enter your name.'
    if (!email) {
      nextErrors.email = 'Please enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!message) nextErrors.message = 'Please enter a message.'

    setFormErrors(nextErrors)
    setSubmissionStatus(null)
    if (Object.keys(nextErrors).length > 0) return

    if (!contactFormEndpoint) {
      setSubmissionStatus({
        kind: 'error',
        message:
          'Message delivery is not configured yet. Please contact me through GitHub.',
      })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(contactFormEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!response.ok) {
        throw new Error(
          `Message could not be sent (HTTP ${response.status}). Please try again.`,
        )
      }
      setSubmissionStatus({
        kind: 'success',
        message: 'Message sent successfully. Thank you for reaching out.',
      })
      form.reset()
    } catch (error) {
      setSubmissionStatus({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Message could not be sent. Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const copyEmail = async () => {
    if (!contactEmail) return
    try {
      await navigator.clipboard.writeText(contactEmail)
      setEmailCopyStatus('copied')
    } catch {
      setEmailCopyStatus('error')
    }
  }

  const scrollToTop = () => {
    if (activeLenis) {
      activeLenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <section
      className="contact-section"
      id="contact"
      ref={sectionRef}
      aria-labelledby="contact-title"
    >
      <div className="contact-content">
        <div className="contact-stage">
          <div className="contact-heading" data-contact-reveal>
            <h2
              id="contact-title"
              className="contact-curtain-heading"
              aria-label="GOT SOMETHING TO BUILD?"
            >
              <span className="contact-heading-line">
                <span className="contact-heading-original" aria-hidden="true">
                  {'GOT SOME'}
                  <span className="contact-heading-spacing">T</span>
                  {'HING'}
                </span>
                <span className="contact-heading-alternate" aria-hidden="true">
                  {'LE'}
                  <span className="contact-heading-spacing">T</span>
                  &apos;S OVERTHINK
                </span>
              </span>
              <span className="contact-heading-line">
                <span className="contact-heading-original" aria-hidden="true">
                  {'TO BUIL'}
                  <span className="contact-heading-spacing">D</span>?
                </span>
                <span className="contact-heading-alternate" aria-hidden="true">
                  IT TOGETHER.
                </span>
              </span>
            </h2>
            <p>A GOOD CONVERSATION CAN BE THE START OF SOMETHING GREAT.</p>
          </div>
          <ContactRobot />
        </div>

        <div className="contact-grid">
          <div className="contact-details" data-contact-reveal>
            <p className="contact-kicker">LET&apos;S CONNECT.</p>
            <div className="contact-method-grid">
              {contactEmail ? (
                <div className="contact-method contact-method--email">
                  <a
                    className="contact-method-link contact-method-link--details"
                    href={`mailto:${contactEmail}`}
                    aria-label="Email me"
                    data-contact-light
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 5h18v14H3zM3 6l9 7 9-7" />
                    </svg>
                    <span className="contact-method-copy">
                      <span className="contact-method-label">EMAIL</span>
                      <span className="contact-method-value">
                        I promise, my replies have fewer bugs than my code.
                      </span>
                    </span>
                    <span className="contact-method-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                  <button
                    className="contact-copy-button"
                    type="button"
                    onClick={copyEmail}
                    aria-label="Copy email address"
                  >
                    {emailCopyStatus === 'copied' ? 'COPIED' : 'COPY'}
                  </button>
                  {emailCopyStatus === 'error' && (
                    <p className="contact-inline-status" role="status">
                      Could not copy the email address. Please copy it manually.
                    </p>
                  )}
                </div>
              ) : (
                <div className="contact-method contact-method--email contact-method--unconfigured">
                  <div className="contact-method-link contact-method-link--details">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 5h18v14H3zM3 6l9 7 9-7" />
                    </svg>
                    <span className="contact-method-copy">
                      <span className="contact-method-label">EMAIL</span>
                      <span className="contact-method-value">
                        I promise, my replies have fewer bugs than my code.
                      </span>
                    </span>
                    <span className="contact-method-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </div>
              )}
              {githubUrl ? (
                <a
                  className="contact-method-link contact-method-link--details"
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Visit GitHub profile"
                  data-contact-light
                >
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d={siGithub.path} />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">GITHUB</span>
                    <span className="contact-method-value">
                      My bugs are open source. You&apos;re welcome.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : (
                <div className="contact-method-link contact-method-link--details contact-method--unconfigured">
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d={siGithub.path} />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">GITHUB</span>
                    <span className="contact-method-value">
                      My bugs are open source. You&apos;re welcome.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              )}
              {linkedInUrl ? (
                <a
                  className="contact-method-link contact-method-link--details"
                  href={linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Visit LinkedIn profile"
                  data-contact-light
                >
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <use href="/assets/social-icons.svg#linkedin" />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">LINKEDIN</span>
                    <span className="contact-method-value">
                      Experienced in pretending I have it all figured out.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : (
                <div className="contact-method-link contact-method-link--details contact-method--unconfigured">
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <use href="/assets/social-icons.svg#linkedin" />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">LINKEDIN</span>
                    <span className="contact-method-value">
                      Experienced in pretending I have it all figured out.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              )}
              {instagramUrl ? (
                <a
                  className="contact-method-link contact-method-link--details"
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Visit Instagram profile"
                  data-contact-light
                >
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d={siInstagram.path} />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">INSTAGRAM</span>
                    <span className="contact-method-value">
                      Yes, I do touch grass. Occasionally.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : (
                <div className="contact-method-link contact-method-link--details contact-method--unconfigured">
                  <svg
                    className="contact-method-brand-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d={siInstagram.path} />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">INSTAGRAM</span>
                    <span className="contact-method-value">
                      Yes, I do touch grass. Occasionally.
                    </span>
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              )}
              {mobileNumber ? (
                <a
                  className="contact-method-link contact-method-link--mobile"
                  href={`tel:${mobileNumber}`}
                  aria-label={`Call ${contactMobile}`}
                  data-contact-light
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3h10v18H7zM10 18h4" />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">MOBILE</span>
                    <span className="contact-method-value">{contactMobile}</span>
                  </span>
                  <span className="contact-method-dialogue">
                    Available 24/7, unless my phone battery hits 1%.
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : (
                <div className="contact-method-link contact-method-link--mobile contact-method--unconfigured">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3h10v18H7zM10 18h4" />
                  </svg>
                  <span className="contact-method-copy">
                    <span className="contact-method-label">MOBILE</span>
                    <span className="contact-method-value">Not configured</span>
                  </span>
                  <span className="contact-method-dialogue">
                    Available 24/7, unless my phone battery hits 1%.
                  </span>
                  <span className="contact-method-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              )}
            </div>
          </div>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isSending}
            data-contact-reveal
          >
            <div className="contact-form-row">
              <div className="contact-field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={
                    formErrors.name ? 'contact-name-error' : undefined
                  }
                  onChange={() =>
                    setFormErrors((current) => ({ ...current, name: undefined }))
                  }
                />
                {formErrors.name && (
                  <span className="contact-field-error" id="contact-name-error">
                    {formErrors.name}
                  </span>
                )}
              </div>
              <div className="contact-field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(formErrors.email)}
                  aria-describedby={
                    formErrors.email ? 'contact-email-error' : undefined
                  }
                  onChange={() =>
                    setFormErrors((current) => ({
                      ...current,
                      email: undefined,
                    }))
                  }
                />
                {formErrors.email && (
                  <span
                    className="contact-field-error"
                    id="contact-email-error"
                  >
                    {formErrors.email}
                  </span>
                )}
              </div>
            </div>
            <div className="contact-field">
              <label htmlFor="contact-subject">
                Subject <span>(optional)</span>
              </label>
              <input id="contact-subject" name="subject" type="text" />
            </div>
            <div className="contact-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                required
                aria-invalid={Boolean(formErrors.message)}
                aria-describedby={
                  formErrors.message ? 'contact-message-error' : undefined
                }
                onChange={() =>
                  setFormErrors((current) => ({
                    ...current,
                    message: undefined,
                  }))
                }
              />
              {formErrors.message && (
                <span
                  className="contact-field-error"
                  id="contact-message-error"
                >
                  {formErrors.message}
                </span>
              )}
            </div>
            <button
              className="contact-submit"
              type="submit"
              disabled={isSending}
              data-contact-light
            >
              <span className="contact-submit-capsule contact-submit-text">
                <span>{isSending ? 'SENDING...' : 'SEND MESSAGE'}</span>
              </span>
              <span className="contact-submit-capsule contact-submit-arrow-shell" aria-hidden="true">
                <span className="contact-submit-arrow contact-submit-arrow-current">
                  ↗
                </span>
                <span className="contact-submit-arrow contact-submit-arrow-next">
                  ↗
                </span>
              </span>
            </button>
            {submissionStatus && (
              <p
                className={`contact-form-status contact-form-status--${submissionStatus.kind}`}
                role={submissionStatus.kind === 'error' ? 'alert' : 'status'}
              >
                {submissionStatus.message}
              </p>
            )}
          </form>
        </div>

        <div className="contact-actions" data-contact-reveal>
          <button
            className="contact-back-to-top"
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            data-contact-light
          >
            <span>BACK TO TOP</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 16V4M4 10l6-6 6 6" />
            </svg>
          </button>
        </div>
        <div className="contact-ending" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
    </section>
  )
}

const workProjects = [
  {
    name: 'LedgerGuard',
    description:
      'LedgerGuard pairs a ledger-first banking API with an operator dashboard for account management, double-entry postings, idempotent transfers, risk review, and reconciliation. The Express API owns financial workflows; the React interface exposes them for inspection and administration.',
    detail: 'BACKEND ENGINEERING',
    image: '/assets/project-ledger-guard-gallery-desktop.webp',
    mobileImage: '/assets/project-ledger-guard-gallery-mobile.webp',
    href: 'https://ledgerguard-frontend-q1se.onrender.com',
  },
  {
    name: 'K72',
    description:
      'A responsive recreation of the K72 agency website, focused on carrying its distinctive visual identity, layouts, navigation, and motion across screen sizes. The interface is assembled from React components and styled with Tailwind CSS.',
    detail: 'INTERACTION STUDY',
    image: '/assets/project-k72-clone-gallery-desktop.webp',
    mobileImage: '/assets/project-k72-clone-gallery-mobile.webp',
    href: 'https://k72-clone-ppwj.onrender.com',
  },
  {
    name: 'Two Good Co',
    description:
      'A study of Two Good Co.’s editorial storefront, pairing product and gift browsing with the brand’s social-impact story. Image-led sections, product callouts, and animated navigation are built with HTML, CSS, JavaScript, GSAP, and Locomotive Scroll.',
    detail: 'INTERACTION STUDY',
    image: '/assets/project-two-good-co-gallery-desktop.webp',
    mobileImage: '/assets/project-two-good-co-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/TWO-GOOD-CO',
  },
  {
    name: 'Dogstudio',
    description:
      'An interactive studio portfolio concept centered on a 3D dog that responds to hover, scrolling, and navigation. React Three Fiber and Three.js bring the model into the page, with Drei and GSAP supporting the surrounding experience.',
    detail: 'INTERACTION STUDY',
    image: '/assets/project-dogstudio-gallery-desktop.webp',
    mobileImage: '/assets/project-dogstudio-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/Dogstudio',
  },
  {
    name: 'Backend Ledger',
    description:
      'Backend Ledger is an Express and MongoDB banking API for account access, account creation, transfers, and transaction history. It protects credentials with bcrypt hashing and JWT authentication, and includes email notifications.',
    detail: 'BACKEND ENGINEERING',
    image: '/assets/project-backend-ledger-gallery-desktop.webp',
    mobileImage: '/assets/project-backend-ledger-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/Backend-Ledger',
  },
  {
    name: 'Food-View',
    description:
      'Food-View is a short-video food discovery app: diners browse, like, and save dish clips, while food partners can sign in and publish videos with descriptions and store details. Its React interface connects to an Express and MongoDB API.',
    detail: 'WEB EXPERIENCE',
    image: '/assets/project-food-view-gallery-desktop.webp',
    mobileImage: '/assets/project-food-view-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/Food-View',
  },
  {
    name: 'Lazarev',
    description:
      'A front-end study of Lazarev’s AI-focused agency site, with service categories, case studies, testimonials, and editorial content. Animated navigation and project previews recreate its motion-led presentation using HTML, CSS, JavaScript, GSAP, and ScrollTrigger.',
    detail: 'INTERACTION STUDY',
    image: '/assets/project-lazarev-design-gallery-desktop.webp',
    mobileImage: '/assets/project-lazarev-design-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/LAZAREV',
  },
  {
    name: 'DSA',
    description:
      'A C++ LeetCode practice collection organized by topic, including arrays, linked lists, binary search, heaps, graphs, and dynamic programming. Its topic index helps readers explore solutions and compare approaches for interview preparation.',
    detail: 'COMPUTER SCIENCE',
    image: '/assets/project-dsa-learning-gallery-desktop.webp',
    mobileImage: '/assets/project-dsa-learning-gallery-mobile.webp',
    href: 'https://github.com/RAVIKNR/DSA',
  },
] as const

const workProjectDisplayNames = [
  'LedgerGuard',
  'K72 Clone',
  'Two Good Co.',
  'Dogstudio',
  'Backend Ledger',
  'Food-View',
  'Lazarev Design',
  'DSA Learning',
] as const

function ProjectGallery() {
  const galleryRef = useRef<HTMLElement>(null)
  const activeIndexRef = useRef(0)

  useLayoutEffect(() => {
    const gallery = galleryRef.current
    const track = gallery?.querySelector<HTMLElement>('.clothesline-track')
    const trackWindow = gallery?.querySelector<HTMLElement>(
      '.clothesline-track-window',
    )
    const rope = gallery?.querySelector<SVGSVGElement>('.clothesline-rope')

    if (!gallery || !track || !trackWindow || !rope) {
      return
    }

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>('[data-project-index]'),
    )
    const ropePaths = Array.from(
      rope.querySelectorAll<SVGPathElement>('[data-rope-path]'),
    )
    const photoMotion = cards.map((card) => ({
      link: card.querySelector<HTMLAnchorElement>('.clothesline-link'),
      swing: card.querySelector<HTMLElement>('.clothesline-swing'),
      print: card.querySelector<HTMLElement>('.clothesline-print'),
      angle: 0,
    }))
    const photoTimelines: (gsap.core.Timeline | null)[] = cards.map(() => null)
    const ropeMotion = {
      anchor: 0.5,
      anchorVelocity: 0,
      targetAnchor: 0.5,
      pressure: 0,
      velocity: 0,
      targetPressure: 0,
    }
    const ropePulse = { anchor: 0.5, progress: 0 }
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const physicsFrame = { id: null as number | null }
    const physicsClock = { lastFrameTime: 0 }
    let ropePulseTimeline: gsap.core.Tween | null = null
    let ropeContactActive = false
    const getHorizontalTravel = () =>
      Math.max(track.getBoundingClientRect().width - trackWindow.clientWidth, 0)
    const transitionSequence =
      document.querySelector<HTMLElement>('.transition-sequence')
    const transitionObserver = new MutationObserver(() => {
      if (transitionSequence?.classList.contains('is-completed')) {
        ScrollTrigger.refresh()
      }
    })
    if (transitionSequence) {
      transitionObserver.observe(transitionSequence, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }
    activeIndexRef.current = 0

    const renderRope = () => {
      const points = Array.from({ length: 41 }, (_, index) => {
        const x = index / 40
        const naturalSag = 20 + 8 * 4 * x * (1 - x)
        const distance = (x - ropeMotion.anchor) / 0.075
        const response = ropeMotion.pressure * Math.exp(-distance * distance)
        const pulseDistance = (x - ropePulse.anchor) / 0.075
        const pulseEnvelope = Math.sin(Math.PI * ropePulse.progress)
        const pulseWave = Math.sin(
          ropePulse.progress * Math.PI * 6 -
            Math.abs(x - ropePulse.anchor) * 36,
        )
        const pulseResponse =
          9 *
          pulseEnvelope *
          pulseWave *
          Math.exp(-pulseDistance * pulseDistance)
        return `${(x * 1000).toFixed(1)},${(naturalSag + response + pulseResponse).toFixed(2)}`
      })
      const path = `M${points.join(' L')}`
      ropePaths.forEach((ropePath) => ropePath.setAttribute('d', path))
      const trackWidth = Math.max(track.offsetWidth, 1)
      const verticalScale = rope.getBoundingClientRect().height / 50
      photoMotion.forEach(({ swing, angle }, index) => {
        if (!swing) {
          return
        }

        const card = cards[index]
        const anchor = (card.offsetLeft + card.offsetWidth / 2) / trackWidth
        const distance = (anchor - ropeMotion.anchor) / 0.075
        const offset =
          ropeMotion.pressure * Math.exp(-distance * distance) * verticalScale
        swing.style.transform = `translateY(${offset.toFixed(3)}px) rotate(${angle}rad)`
      })
    }

    const startRopePulse = (anchor: number) => {
      if (reducedMotion || ropePulseTimeline?.isActive()) {
        return
      }

      ropePulse.anchor = anchor
      ropePulse.progress = 0
      ropePulseTimeline = gsap.to(ropePulse, {
        progress: 1,
        duration: 1.35,
        ease: 'none',
        onUpdate: renderRope,
        onComplete: () => {
          ropePulse.progress = 0
          ropePulseTimeline = null
          renderRope()
        },
      })
    }

    const updateFinalRunway = () => {
      const previousCard = cards[cards.length - 2]
      const finalCard = cards[cards.length - 1]
      const previousPrint = photoMotion[cards.length - 2]?.print
      if (!previousCard || !finalCard || !previousPrint) {
        return
      }

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
      const previousPrintWidth =
        previousPrint.offsetWidth || previousCard.offsetWidth
      const runway = Math.max(
        8,
        trackWindow.clientWidth -
          previousCard.offsetWidth -
          finalCard.offsetWidth -
          gap +
          (previousCard.offsetWidth - previousPrintWidth) / 2 +
          1,
      )
      track.style.setProperty('--clothesline-final-active-runway', `${runway}px`)
    }

    const updateActiveProject = () => {
      const viewport = trackWindow.getBoundingClientRect()
      const nextIndex = cards.findIndex((card) => {
        const photograph = card
          .querySelector<HTMLElement>('.clothesline-print')
          ?.getBoundingClientRect()

        return (
          photograph !== undefined &&
          photograph.left >= viewport.left &&
          photograph.right <= viewport.right &&
          photograph.top >= viewport.top &&
          photograph.bottom <= viewport.bottom
        )
      })

      if (nextIndex === -1 || nextIndex === activeIndexRef.current) {
        return
      }

      activeIndexRef.current = nextIndex
      cards.forEach((card, index) => {
        const isActive = index === nextIndex
        card.classList.toggle('is-active', isActive)
        card.dataset.activeProject = String(isActive)
        const link = card.querySelector<HTMLAnchorElement>('.clothesline-link')
        if (link) {
          if (isActive) {
            link.setAttribute('aria-current', 'true')
          } else {
            link.removeAttribute('aria-current')
          }
        }
      })
    }

    const animatePhysics = (time: number) => {
      physicsFrame.id = null
      const delta = Math.min((time - physicsClock.lastFrameTime) / 1000, 0.032)
      physicsClock.lastFrameTime = time
      let isMoving = false

      const anchorAcceleration =
        42 * (ropeMotion.targetAnchor - ropeMotion.anchor) -
        10 * ropeMotion.anchorVelocity
      ropeMotion.anchorVelocity += anchorAcceleration * delta
      ropeMotion.anchor += ropeMotion.anchorVelocity * delta
      if (
        Math.abs(ropeMotion.targetAnchor - ropeMotion.anchor) < 0.0008 &&
        Math.abs(ropeMotion.anchorVelocity) < 0.002
      ) {
        ropeMotion.anchor = ropeMotion.targetAnchor
        ropeMotion.anchorVelocity = 0
      } else {
        isMoving = true
      }

      const ropeAcceleration =
        56 * (ropeMotion.targetPressure - ropeMotion.pressure) -
        9.2 * ropeMotion.velocity
      ropeMotion.velocity += ropeAcceleration * delta
      ropeMotion.pressure += ropeMotion.velocity * delta
      if (
        Math.abs(ropeMotion.targetPressure - ropeMotion.pressure) < 0.008 &&
        Math.abs(ropeMotion.velocity) < 0.02
      ) {
        ropeMotion.pressure = ropeMotion.targetPressure
        ropeMotion.velocity = 0
      } else {
        isMoving = true
      }
      renderRope()

      if (isMoving) {
        physicsFrame.id = requestAnimationFrame(animatePhysics)
      } else {
        updateActiveProject()
      }
    }

    const startPhysics = () => {
      if (reducedMotion || physicsFrame.id !== null) {
        return
      }

      const hasRopeMotion =
        Math.abs(ropeMotion.targetAnchor - ropeMotion.anchor) >= 0.0008 ||
        Math.abs(ropeMotion.anchorVelocity) >= 0.002 ||
        Math.abs(ropeMotion.targetPressure - ropeMotion.pressure) >= 0.008 ||
        Math.abs(ropeMotion.velocity) >= 0.02
      if (hasRopeMotion) {
        physicsClock.lastFrameTime = performance.now()
        physicsFrame.id = requestAnimationFrame(animatePhysics)
      }
    }

    const startPhotoSwing = (index: number) => {
      const motion = photoMotion[index]
      if (!motion?.link || !motion.swing) {
        return
      }

      photoTimelines[index]?.kill()
      const leftPeak = Math.min(-0.048, motion.angle - 0.018)
      const rightPeak = Math.max(
        0.03,
        Math.min(0.045, motion.angle * 0.15 + 0.03),
      )
      const timeline = gsap.timeline({
        onUpdate: renderRope,
        onComplete: () => {
          motion.angle = 0
          renderRope()
          photoTimelines[index] = null
        },
      })

      timeline
        .to(motion, {
          angle: leftPeak,
          duration: 0.28,
          ease: 'power2.out',
        })
        .to(motion, {
          angle: rightPeak,
          duration: 0.4,
          ease: 'power1.inOut',
        })
        .to(motion, {
          angle: 0,
          duration: 0.48,
          ease: 'power2.out',
        })
      photoTimelines[index] = timeline
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === 'touch') {
        return
      }

      const ropeBounds = rope.getBoundingClientRect()
      const overClip = cards.some((projectCard) => {
        const clip = projectCard
          .querySelector<HTMLElement>('[data-clothesline-clip]')
          ?.getBoundingClientRect()
        return (
          clip !== undefined &&
          event.clientX >= clip.left &&
          event.clientX <= clip.right &&
          event.clientY >= clip.top - 4 &&
          event.clientY <= clip.bottom
        )
      })
      const trackWindowBounds = trackWindow.getBoundingClientRect()
      const withinRopeWidth =
        event.clientX >= Math.max(ropeBounds.left, trackWindowBounds.left) &&
        event.clientX <= Math.min(ropeBounds.right, trackWindowBounds.right)
      const ropeX = Math.max(
        0,
        Math.min(1, (event.clientX - ropeBounds.left) / ropeBounds.width),
      )
      const naturalSag = 20 + 32 * ropeX * (1 - ropeX)
      const ropeY = ropeBounds.top + (naturalSag / 50) * ropeBounds.height
      const ropeDistance = Math.abs(event.clientY - ropeY)
      const touchingRope = withinRopeWidth && ropeDistance < 20
      if (touchingRope && !ropeContactActive) {
        startRopePulse(ropeX)
      }
      ropeContactActive = touchingRope

      if (overClip) {
        ropeMotion.targetAnchor = ropeX
        ropeMotion.targetPressure = 4
      } else {
        ropeMotion.targetPressure = 0
      }
      startPhysics()
    }

    const handleProjectPointerOver = (event: PointerEvent) => {
      if (
        reducedMotion ||
        event.pointerType === 'touch' ||
        !(event.target instanceof Element)
      ) {
        return
      }

      const link = event.target.closest<HTMLAnchorElement>('.clothesline-link')
      const previousLink =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest<HTMLAnchorElement>('.clothesline-link')
          : null
      if (!link || link === previousLink) {
        return
      }

      const index = photoMotion.findIndex((motion) => motion.link === link)
      startPhotoSwing(index)
    }

    const releaseInteractions = () => {
      ropeContactActive = false
      ropeMotion.targetPressure = 0
      startPhysics()
    }

    const handleTouchEnd = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        releaseInteractions()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (reducedMotion || !(event.target instanceof Element)) {
        return
      }
      const link = event.target.closest<HTMLAnchorElement>('.clothesline-link')
      const index = photoMotion.findIndex((item) => item.link === link)
      startPhotoSwing(index)
    }

    const handleTouchStart = (event: PointerEvent) => {
      if (
        reducedMotion ||
        event.pointerType !== 'touch' ||
        !(event.target instanceof Element)
      ) {
        return
      }

      const ropeBounds = rope.getBoundingClientRect()
      const anchor = Math.max(
        0,
        Math.min(1, (event.clientX - ropeBounds.left) / ropeBounds.width),
      )
      const naturalSag = 20 + 32 * anchor * (1 - anchor)
      const ropeY = ropeBounds.top + (naturalSag / 50) * ropeBounds.height
      const ropeDistance = Math.abs(event.clientY - ropeY)
      const overClip = cards.some((card) => {
        const clip = card
          .querySelector<HTMLElement>('[data-clothesline-clip]')
          ?.getBoundingClientRect()
        return (
          clip !== undefined &&
          event.clientX >= clip.left &&
          event.clientX <= clip.right &&
          event.clientY >= clip.top - 4 &&
          event.clientY <= clip.bottom
        )
      })
      if (overClip) {
        ropeMotion.targetAnchor = anchor
        ropeMotion.targetPressure = 3.2
      } else if (ropeDistance < 20) {
        startRopePulse(anchor)
      }

      const link = event.target.closest<HTMLAnchorElement>('.clothesline-link')
      const index = photoMotion.findIndex((item) => item.link === link)
      startPhotoSwing(index)
      startPhysics()
    }

    const horizontalTween = reducedMotion
      ? gsap.to(track, { x: 0, duration: 0 })
      : gsap.to(track, {
          x: () => -Math.ceil(getHorizontalTravel()),
          ease: 'none',
          scrollTrigger: {
            trigger: gallery,
            start: 'top top',
            end: () =>
              `+=${Math.max(Math.floor(getHorizontalTravel()) - 1, 0)}`,
            pin: true,
            pinSpacing: true,
            scrub: 0.25,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: updateActiveProject,
          },
        })

    gallery.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    })
    gallery.addEventListener('pointerleave', releaseInteractions)
    gallery.addEventListener('pointerover', handleProjectPointerOver)
    gallery.addEventListener('pointerdown', handleTouchStart)
    gallery.addEventListener('pointerup', handleTouchEnd)
    gallery.addEventListener('pointercancel', handleTouchEnd)
    gallery.addEventListener('focusin', handleFocusIn)
    const handleResize = () => {
      updateFinalRunway()
      updateActiveProject()
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', handleResize, { passive: true })
    trackWindow.addEventListener('scroll', updateActiveProject, {
      passive: true,
    })
    updateFinalRunway()
    renderRope()
    updateActiveProject()
    ScrollTrigger.refresh()

    return () => {
      transitionObserver.disconnect()
      gallery.removeEventListener('pointermove', handlePointerMove)
      gallery.removeEventListener('pointerleave', releaseInteractions)
      gallery.removeEventListener('pointerover', handleProjectPointerOver)
      gallery.removeEventListener('pointerdown', handleTouchStart)
      gallery.removeEventListener('pointerup', handleTouchEnd)
      gallery.removeEventListener('pointercancel', handleTouchEnd)
      gallery.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('resize', handleResize)
      trackWindow.removeEventListener('scroll', updateActiveProject)
      if (physicsFrame.id !== null) {
        cancelAnimationFrame(physicsFrame.id)
      }
      ropePulseTimeline?.kill()
      photoTimelines.forEach((timeline) => timeline?.kill())
      horizontalTween.scrollTrigger?.kill()
      horizontalTween.kill()
    }
  }, [])

  return (
    <section
      className="clothesline-gallery"
      ref={galleryRef}
      aria-label="Interactive project gallery"
    >
      <div className="clothesline-track-window">
        <div className="clothesline-track">
          <svg
            className="clothesline-rope"
            viewBox="0 0 1000 50"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="clothesline-rope-shadow"
              data-rope-path
              d="M0 20 Q500 29 1000 20"
            />
            <path
              className="clothesline-rope-fiber"
              data-rope-path
              d="M0 20 Q500 29 1000 20"
            />
            <path
              className="clothesline-rope-highlight"
              data-rope-path
              d="M0 20 Q500 29 1000 20"
            />
          </svg>
          {workProjects.map((project, index) => (
            <div
              className={`clothesline-hanging${index === 0 ? ' is-active' : ''}`}
              data-project-index={index}
              data-active-project={index === 0 ? 'true' : 'false'}
              key={project.name}
            >
              <a
                className="clothesline-link"
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${project.name} on GitHub (opens in a new tab)`}
                aria-current={index === 0 ? 'true' : undefined}
              >
                <span className="clothesline-swing">
                  <span
                    className="clothesline-clip"
                    data-clothesline-clip
                    aria-hidden="true"
                  >
                    <span className="clothesline-clip-head" />
                    <span className="clothesline-clip-body" />
                  </span>
                  <span className="clothesline-print">
                    <picture>
                      <source
                        media="(max-width: 640px)"
                        srcSet={project.mobileImage}
                      />
                      <img
                        src={project.image}
                        alt={`${workProjectDisplayNames[index]} project preview`}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </picture>
                  </span>
                  <span className="clothesline-project-copy">
                    <h3 className="clothesline-project-title">
                      {workProjectDisplayNames[index]}
                    </h3>
                    <span className="clothesline-project-meta">
                      <span>
                        {String(index + 1).padStart(2, '0')} /{' '}
                        {String(workProjects.length).padStart(2, '0')}
                      </span>
                      <span>{project.detail}</span>
                    </span>
                    <span className="clothesline-project-description">
                      {project.description}
                    </span>
                  </span>
                </span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutHeadline() {
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const revealTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const headline = headlineRef.current

    if (!headline) {
      return
    }

    const reveal = () => headline.classList.add('is-rising')
    const handleTransitionStart = () => {
      window.removeEventListener(
        aboutTransitionStartEvent,
        handleTransitionStart,
      )
      revealTimeoutRef.current = window.setTimeout(() => {
        revealTimeoutRef.current = null
        reveal()
      }, 3000)
    }

    window.addEventListener(
      aboutTransitionStartEvent,
      handleTransitionStart,
    )
    return () => {
      window.removeEventListener(
        aboutTransitionStartEvent,
        handleTransitionStart,
      )
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
    }
  }, [])

  return (
    <h2
      className="about-headline"
      id="about-title"
      aria-label="BEHIND THE CODE."
      ref={headlineRef}
    >
      <span className="about-headline-row">
        <span className="about-headline-original">
          <span className="rising-word-mask">
            <span className="rising-word about-rising-word" style={{ animationDelay: '0ms' }}>
              BEHIND
            </span>
          </span>{' '}
          <span className="rising-word-mask">
            <span className="rising-word about-rising-word" style={{ animationDelay: '140ms' }}>
              THE
            </span>
          </span>
        </span>
        <span className="about-headline-alternate" aria-hidden="true">
          BEYOND THE
        </span>
      </span>
      <span className="about-headline-row">
        <span className="about-headline-original">
          <span className="rising-word-mask">
            <span className="rising-word about-rising-word" style={{ animationDelay: '280ms' }}>
              COD<span className="about-letter-spacing">E</span>.
            </span>
          </span>
        </span>
        <span className="about-headline-alternate about-headline-alternate--craft" aria-hidden="true">
          CRA<span className="about-letter-spacing about-letter-spacing--craft-f">F</span>T.
        </span>
      </span>
    </h2>
  )
}

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const pointer = pointerRef.current
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const desktopViewport = window.matchMedia('(min-width: 801px)').matches

    if (!cursor || !pointer || reducedMotion || !finePointer || !desktopViewport) {
      return
    }

    const baseCursorSize = 32
    const target = { x: -20, y: -20 }
    const current = { x: -20, y: -20 }
    let targetCursorSize = baseCursorSize
    let currentCursorSize = baseCursorSize
    let hasPointerPosition = false
    let scrollHitTestPending = false
    let animationFrame: number | null = null
    let activeCurtain: HTMLElement | null = null
    let sloganCurtainVisible = false
    let aboutCurtainVisible = false
    let skillsTechCurtainVisible = false
    let skillsHeadlineCurtainVisible = false
    let workHeadingCurtainVisible = false
    let contactHeadingCurtainVisible = false
    let activeSocial: HTMLElement | null = null
    const slogan = document.querySelector<HTMLElement>('.slogan')
    const aboutHeadline = document.querySelector<HTMLElement>(
      '.about-headline',
    )
    const skillsTechHeadline = document.querySelector<HTMLElement>(
      '.skills-intro h2',
    )
    const skillsWorkHeadline = document.querySelector<HTMLElement>(
      '.skills-work-transition h2',
    )
    const workHeading = document.querySelector<HTMLElement>('#work-title')
    const contactHeading = document.querySelector<HTMLElement>('#contact-title')
    const aboutSection = document.querySelector<HTMLElement>('.about-section')
    const aboutCurtainCircle = document.querySelector<HTMLElement>(
      '.about-curtain-circle',
    )
    const transitionSequence = document.querySelector<HTMLElement>(
      '.transition-sequence',
    )
    const brand = document.querySelector<HTMLElement>('.brand')
    const siteHeader = document.querySelector<HTMLElement>('.site-header')
    const soundControl = document.querySelector<HTMLElement>('.sound-control')
    const magneticElements = Array.from(
      document.querySelectorAll<HTMLElement>('.social-link'),
    )
    const skillsCategoryRows = Array.from(
      document.querySelectorAll<HTMLElement>('.skills-category-row'),
    )
    const socials = document.querySelector<HTMLElement>('.socials')
    const sloganLines = Array.from(
      document.querySelectorAll<HTMLElement>('.slogan-row'),
    )
    const aboutHeadlineRows = Array.from(
      document.querySelectorAll<HTMLElement>('.about-headline-row'),
    )
    const skillsTechHeadlineRows = Array.from(
      document.querySelectorAll<HTMLElement>('.skills-tech-line'),
    )
    const skillsHeadlineRows = Array.from(
      document.querySelectorAll<HTMLElement>('.skills-work-line'),
    )
    const workHeadingRows = Array.from(
      document.querySelectorAll<HTMLElement>('.work-heading-line'),
    )
    const contactHeadingRows = Array.from(
      document.querySelectorAll<HTMLElement>('.contact-heading-line'),
    )
    const isPointerInTextRegion = (
      x: number,
      y: number,
      lines: HTMLElement[],
    ) => {
      const wordBounds = lines
        .map((line) =>
          line
            .querySelector<HTMLElement>(
              '.slogan-layer-original, .about-headline-original, .skills-tech-original, .skills-work-original, .work-heading-original, .contact-heading-original',
            )
            ?.getBoundingClientRect(),
        )
        .filter((bounds): bounds is DOMRect => Boolean(bounds))
      const firstWord = wordBounds[0]
      const lastWord = wordBounds[wordBounds.length - 1]

      if (!firstWord || !lastWord || y < firstWord.top || y > lastWord.bottom) {
        return false
      }

      const horizontalRegion = wordBounds.reduce((nearest, bounds) => {
        const distance =
          y < bounds.top
            ? bounds.top - y
            : y > bounds.bottom
              ? y - bounds.bottom
              : 0
        const nearestDistance =
          y < nearest.top
            ? nearest.top - y
            : y > nearest.bottom
              ? y - nearest.bottom
              : 0

        return distance < nearestDistance ? bounds : nearest
      }, firstWord)

      return x >= horizontalRegion.left && x <= horizontalRegion.right
    }

    const isPointerOverHeadlineWord = (
      x: number,
      y: number,
      lines: HTMLElement[],
    ) =>
      lines.some((line) => {
        const textLayers = line.matches('.contact-heading-line')
          ? Array.from(
              line.querySelectorAll<HTMLElement>(
                '.contact-heading-original, .contact-heading-alternate',
              ),
            )
          : [
              line.querySelector<HTMLElement>(
                '.slogan-layer-original, .skills-tech-original, .skills-work-original, .work-heading-original, .contact-heading-original',
              ),
            ].filter((text): text is HTMLElement => text !== null)

        return textLayers.some((text) => {
          const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT)
          const range = document.createRange()
          let node: Node | null
          while ((node = walker.nextNode())) {
            const words = node.textContent?.matchAll(/\S+/g)
            if (!words) {
              continue
            }

            for (const word of words) {
              range.setStart(node, word.index)
              range.setEnd(node, word.index + word[0].length)
              if (
                Array.from(range.getClientRects()).some(
                  (bounds) =>
                    x >= bounds.left &&
                    x <= bounds.right &&
                    y >= bounds.top &&
                    y <= bounds.bottom,
                )
              ) {
                return true
              }
            }
          }
          return false
        })
      })

    const scheduleRender = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(render)
      }
    }

    const render = () => {
      animationFrame = null
      if (scrollHitTestPending) {
        scrollHitTestPending = false
        if (hasPointerPosition) {
          const activeHeadline = [
            { element: slogan, lines: sloganLines },
            { element: aboutHeadline, lines: aboutHeadlineRows },
            { element: skillsTechHeadline, lines: skillsTechHeadlineRows },
            { element: skillsWorkHeadline, lines: skillsHeadlineRows },
            { element: workHeading, lines: workHeadingRows },
            { element: contactHeading, lines: contactHeadingRows },
          ].find(({ element, lines }) =>
            element === slogan || element === aboutHeadline
              ? isPointerInTextRegion(target.x, target.y, lines)
              : isPointerOverHeadlineWord(target.x, target.y, lines),
          )

          if (activeHeadline) {
            const area =
              activeHeadline.element === skillsTechHeadline ||
              activeHeadline.element === skillsWorkHeadline ||
              activeHeadline.element === workHeading
                ? document.querySelector<HTMLElement>('.hero')
                : activeHeadline.element === contactHeading
                  ? document.querySelector<HTMLElement>('.contact-section')
                : activeHeadline.element?.closest<HTMLElement>(
                    '.hero, .about-section',
                  )
            const areaBounds = area?.getBoundingClientRect()
            const size = Math.min(
              (areaBounds?.height ?? 0) * 0.5,
              window.innerWidth * 0.25,
            )
            targetCursorSize = Math.max(baseCursorSize, size)
            activeCurtain = activeHeadline.element
          } else if (
            activeCurtain === slogan ||
            activeCurtain === aboutHeadline ||
            activeCurtain === skillsTechHeadline ||
            activeCurtain === skillsWorkHeadline ||
            activeCurtain === workHeading ||
            activeCurtain === contactHeading
          ) {
            targetCursorSize = baseCursorSize
            activeCurtain = null
          }
        }
      }

      current.x += (target.x - current.x) * 0.22
      current.y += (target.y - current.y) * 0.22
      const skillsHeadlineInteraction =
        activeCurtain === skillsWorkHeadline ||
        skillsHeadlineCurtainVisible
      currentCursorSize +=
        (targetCursorSize - currentCursorSize) *
        (skillsHeadlineInteraction ? 0.12 : 0.08)
      const pointerSettled =
        Math.abs(target.x - current.x) < 0.05 &&
        Math.abs(target.y - current.y) < 0.05 &&
        Math.abs(targetCursorSize - currentCursorSize) < 0.05

      if (pointerSettled) {
        current.x = target.x
        current.y = target.y
        currentCursorSize = targetCursorSize
      }

      cursor.style.setProperty('--cursor-x', `${current.x}px`)
      cursor.style.setProperty('--cursor-y', `${current.y}px`)
      cursor.style.setProperty('--cursor-size', `${currentCursorSize}px`)
      pointer.style.setProperty('--cursor-x', `${target.x}px`)
      pointer.style.setProperty('--cursor-y', `${target.y}px`)
      const pointerTargets = hasPointerPosition
        ? document.elementsFromPoint(target.x, target.y)
        : []
      const pointerSection = pointerTargets
        .map((element) =>
          element.closest<HTMLElement>(
            '.about-section, .skills-section, .work-section, .contact-section, #contact',
          ),
        )
        .find((section) => section !== null)
      const exploreIsOpen = Boolean(
        document.querySelector('.explore-screen'),
      )
      document.documentElement.classList.toggle(
        'explore-screen-active',
        exploreIsOpen,
      )
      pointer.classList.toggle('explore-native-pointer', exploreIsOpen)

      const socialPositions = magneticElements
        .map((element) => {
          const bounds = element.getBoundingClientRect()
          const applied = getComputedStyle(element).translate.split(' ')
          const currentX = Number.parseFloat(applied[0]) || 0
          const currentY = Number.parseFloat(applied[1]) || 0
          const centerX = bounds.left + bounds.width / 2 - currentX
          const centerY = bounds.top + bounds.height / 2 - currentY
          return {
            element,
            distance: Math.hypot(target.x - centerX, target.y - centerY),
          }
        })
      const nearestSocial = socialPositions.reduce<
        (typeof socialPositions)[number] | null
      >(
        (nearest, position) =>
          !nearest || position.distance < nearest.distance ? position : nearest,
        null,
      )
      const socialMagnetRadius = 48
      const activeMagnet =
        nearestSocial && nearestSocial.distance < socialMagnetRadius
          ? nearestSocial
          : null
      if (activeMagnet) {
        const bounds = activeMagnet.element.getBoundingClientRect()
        cursor.style.setProperty(
          '--social-target-x',
          `${bounds.left + bounds.width / 2 - current.x + currentCursorSize / 2}px`,
        )
        cursor.style.setProperty(
          '--social-target-y',
          `${bounds.top + bounds.height / 2 - current.y + currentCursorSize / 2}px`,
        )
      } else {
        cursor.style.removeProperty('--social-target-x')
        cursor.style.removeProperty('--social-target-y')
      }
      const logoMagnetRadius = 48
      let logoOffsetX = 0
      let logoOffsetY = 0

      if (brand) {
        const bounds = brand.getBoundingClientRect()
        const applied = getComputedStyle(brand).translate.split(' ')
        const currentX = Number.parseFloat(applied[0]) || 0
        const currentY = Number.parseFloat(applied[1]) || 0
        const left = bounds.left - currentX
        const right = bounds.right - currentX
        const top = bounds.top - currentY
        const bottom = bounds.bottom - currentY
        const distanceX = Math.max(left - target.x, 0, target.x - right)
        const distanceY = Math.max(top - target.y, 0, target.y - bottom)
        const distance = Math.hypot(distanceX, distanceY)

        if (distance < logoMagnetRadius) {
          const centerX = (left + right) / 2
          const centerY = (top + bottom) / 2
          const influence = 1 - distance / logoMagnetRadius
          logoOffsetX = Math.max(
            -6,
            Math.min(6, (target.x - centerX) * 0.18 * influence),
          )
          logoOffsetY = Math.max(
            -6,
            Math.min(6, (target.y - centerY) * 0.18 * influence),
          )
        }

        brand.style.setProperty('--mag-x', `${logoOffsetX}px`)
        brand.style.setProperty('--mag-y', `${logoOffsetY}px`)
        brand.classList.toggle('logo-magnetic-active', distance < logoMagnetRadius)
        siteHeader?.classList.toggle(
          'logo-magnetic-active',
          distance < logoMagnetRadius,
        )
      }

      const activeNav = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.main-nav a, .explore-exit, .explore-orb, .intro-start',
        ),
      ).some((element) => {
        const bounds = element.getBoundingClientRect()
        const distanceX = Math.max(bounds.left - target.x, 0, target.x - bounds.right)
        const distanceY = Math.max(bounds.top - target.y, 0, target.y - bounds.bottom)
        return Math.hypot(distanceX, distanceY) < 18
      })
      const exploreNavigationTarget = pointerTargets.some((element) =>
        element.closest('.explore-exit, .explore-nav-button'),
      )
      const contactNavigationTarget = pointerTargets.some((element) =>
        element.closest('.main-nav a[href="#contact"]'),
      )
      const workAnimationTarget = pointerTargets.some((element) =>
        element.closest(
          '.work-section-heading, .clothesline-link, .clothesline-rope, .work-section button, .work-section [role="button"]',
        ),
      )
      const contactTextTarget = pointerTargets.some((element) =>
        element.closest('.contact-section input, .contact-section textarea'),
      )
      const contactInteractiveTarget = pointerTargets.some((element) =>
        element.closest(
          '.contact-section a.contact-method-link, .contact-section .contact-copy-button, .contact-section .contact-submit:not(:disabled), .contact-section .contact-back-to-top',
        ),
      )
      const resumeDownloadTarget = pointerTargets.some((element) =>
        element.closest('.resume-download__button:not(:disabled)'),
      )
      const skillsCategoryAnimationActive = skillsCategoryRows.some((row) =>
        row.classList.contains('is-active'),
      )
      const normalCursorHidden = exploreIsOpen
        ? exploreNavigationTarget
        : activeCurtain !== null ||
          sloganCurtainVisible ||
          aboutCurtainVisible ||
          skillsTechCurtainVisible ||
          skillsHeadlineCurtainVisible ||
          workHeadingCurtainVisible ||
          contactHeadingCurtainVisible ||
          activeMagnet !== null ||
          skillsCategoryAnimationActive ||
          (pointerSection?.matches('.work-section') === true &&
            workAnimationTarget) ||
          pointerTargets.some((element) =>
            element.closest('.sound-control'),
          ) ||
          contactTextTarget ||
          contactInteractiveTarget ||
          contactNavigationTarget ||
          resumeDownloadTarget ||
          activeNav
      cursor.classList.toggle('normal-cursor-hidden', normalCursorHidden)

      const pointerOverClothesline = Boolean(
        document
          .elementFromPoint(target.x, target.y)
          ?.closest('.clothesline-gallery'),
      )
      document.documentElement.classList.toggle(
        'clothesline-gallery-cursor-active',
        pointerOverClothesline,
      )
      pointer.classList.toggle(
        'is-hand',
        activeNav || contactInteractiveTarget || resumeDownloadTarget,
      )
      pointer.classList.toggle('is-text-caret', contactTextTarget)
      cursor.classList.toggle('nav-target-active', activeNav)
      const soundControlBounds = soundControl?.getBoundingClientRect()
      cursor.classList.toggle(
        'sound-control-active',
        soundControlBounds !== undefined &&
          target.x >= soundControlBounds.left &&
          target.x <= soundControlBounds.right &&
          target.y >= soundControlBounds.top &&
          target.y <= soundControlBounds.bottom,
      )

      magneticElements.forEach((element) => {
        const bounds = element.getBoundingClientRect()
        let offsetX = 0
        let offsetY = 0

        const position = socialPositions.find((item) => item.element === element)

        if (
          position === nearestSocial &&
          position.distance < socialMagnetRadius
        ) {
          const applied = getComputedStyle(element).translate.split(' ')
          const currentX = Number.parseFloat(applied[0]) || 0
          const currentY = Number.parseFloat(applied[1]) || 0
          const centerX = bounds.left + bounds.width / 2 - currentX
          const centerY = bounds.top + bounds.height / 2 - currentY
          const distanceX = target.x - centerX
          const distanceY = target.y - centerY
          const influence = 1 - position.distance / socialMagnetRadius
          offsetX = distanceX * influence * 0.8
          offsetY = distanceY * influence * 0.8
        }

        element.style.setProperty('--mag-x', `${offsetX}px`)
        element.style.setProperty('--mag-y', `${offsetY}px`)
        element.classList.toggle('magnetic-active', offsetX !== 0 || offsetY !== 0)
      })

      if (socials) {
        const bounds = socials.getBoundingClientRect()
        socials.style.setProperty('--mag-circle-x', `${current.x - bounds.left}px`)
        socials.style.setProperty('--mag-circle-y', `${current.y - bounds.top}px`)
        socials.classList.toggle('is-magnetic-active', activeMagnet !== null)
      }

      if (activeCurtain === aboutHeadline) {
        aboutCurtainVisible = true
      } else if (activeCurtain !== null) {
        aboutCurtainVisible = false
      }

      if (activeCurtain === slogan) {
        sloganCurtainVisible = true
      } else if (activeCurtain !== null) {
        sloganCurtainVisible = false
      }

      const sloganCurtainRadius =
        activeCurtain === slogan
          ? currentCursorSize / 2
          : sloganCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (sloganCurtainVisible && currentCursorSize <= baseCursorSize + 1) {
        sloganCurtainVisible = false
      }

      const aboutCurtainRadius =
        activeCurtain === aboutHeadline
          ? currentCursorSize / 2
          : aboutCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (aboutCurtainVisible && currentCursorSize <= baseCursorSize + 1) {
        aboutCurtainVisible = false
      }

      if (activeCurtain === skillsTechHeadline) {
        skillsTechCurtainVisible = true
      } else if (activeCurtain !== null) {
        skillsTechCurtainVisible = false
      }

      const skillsTechCurtainRadius =
        activeCurtain === skillsTechHeadline
          ? currentCursorSize / 2
          : skillsTechCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (
        skillsTechCurtainVisible &&
        currentCursorSize <= baseCursorSize + 1
      ) {
        skillsTechCurtainVisible = false
      }

      if (activeCurtain === skillsWorkHeadline) {
        skillsHeadlineCurtainVisible = true
      } else if (activeCurtain !== null) {
        skillsHeadlineCurtainVisible = false
      }

      const skillsHeadlineCurtainRadius =
        activeCurtain === skillsWorkHeadline
          ? currentCursorSize / 2
          : skillsHeadlineCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (
        skillsHeadlineCurtainVisible &&
        currentCursorSize <= baseCursorSize + 1
      ) {
        skillsHeadlineCurtainVisible = false
      }

      if (activeCurtain === workHeading) {
        workHeadingCurtainVisible = true
      } else if (activeCurtain !== null) {
        workHeadingCurtainVisible = false
      }

      const workHeadingCurtainRadius =
        activeCurtain === workHeading
          ? currentCursorSize / 2
          : workHeadingCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (
        workHeadingCurtainVisible &&
        currentCursorSize <= baseCursorSize + 1
      ) {
        workHeadingCurtainVisible = false
      }

      if (activeCurtain === contactHeading) {
        contactHeadingCurtainVisible = true
      } else if (activeCurtain !== null) {
        contactHeadingCurtainVisible = false
      }

      const contactHeadingCurtainRadius =
        activeCurtain === contactHeading
          ? currentCursorSize / 2
          : contactHeadingCurtainVisible
            ? Math.max(baseCursorSize / 2, (currentCursorSize - baseCursorSize) / 2)
            : 0

      if (
        contactHeadingCurtainVisible &&
        currentCursorSize <= baseCursorSize + 1
      ) {
        contactHeadingCurtainVisible = false
      }

      const maskLineGroups = [
        { lines: sloganLines, radius: sloganCurtainRadius },
        { lines: aboutHeadlineRows, radius: aboutCurtainRadius },
        {
          lines: skillsTechHeadlineRows,
          radius: skillsTechCurtainRadius,
        },
        {
          lines: skillsHeadlineRows,
          radius: skillsHeadlineCurtainRadius,
        },
        {
          lines: workHeadingRows,
          radius: workHeadingCurtainRadius,
        },
        {
          lines: contactHeadingRows,
          radius: contactHeadingCurtainRadius,
        },
      ]
      maskLineGroups.forEach(({ lines, radius }) => {
        lines.forEach((line) => {
          const contactLayers =
            line.matches('.contact-heading-line')
              ? line.querySelectorAll<HTMLElement>(
                  '.contact-heading-original, .contact-heading-alternate',
                )
              : null
          const targets: HTMLElement[] = contactLayers
            ? Array.from(contactLayers)
            : [line]

          targets.forEach((target) => {
            const bounds = target.getBoundingClientRect()
            target.style.setProperty('--mask-x', `${current.x - bounds.left}px`)
            target.style.setProperty('--mask-y', `${current.y - bounds.top}px`)
            target.style.setProperty('--mask-radius', `${radius}px`)
          })
        })
      })

      if (slogan) {
        const bounds = slogan.getBoundingClientRect()
        slogan.style.setProperty('--hero-circle-x', `${current.x - bounds.left}px`)
        slogan.style.setProperty('--hero-circle-y', `${current.y - bounds.top}px`)
        slogan.style.setProperty('--hero-circle-size', `${sloganCurtainRadius * 2}px`)
        slogan.classList.toggle(
          'is-curtain-active',
          sloganCurtainVisible && sloganCurtainRadius > 0,
        )
      }

      if (skillsTechHeadline) {
        const bounds = skillsTechHeadline.getBoundingClientRect()
        skillsTechHeadline.style.setProperty(
          '--hero-circle-x',
          `${current.x - bounds.left}px`,
        )
        skillsTechHeadline.style.setProperty(
          '--hero-circle-y',
          `${current.y - bounds.top}px`,
        )
        skillsTechHeadline.style.setProperty(
          '--hero-circle-size',
          `${skillsTechCurtainRadius * 2}px`,
        )
        skillsTechHeadline.classList.toggle(
          'is-curtain-active',
          skillsTechCurtainVisible && skillsTechCurtainRadius > 0,
        )
      }

      if (skillsWorkHeadline) {
        const bounds = skillsWorkHeadline.getBoundingClientRect()
        skillsWorkHeadline.style.setProperty(
          '--hero-circle-x',
          `${current.x - bounds.left}px`,
        )
        skillsWorkHeadline.style.setProperty(
          '--hero-circle-y',
          `${current.y - bounds.top}px`,
        )
        skillsWorkHeadline.style.setProperty(
          '--hero-circle-size',
          `${skillsHeadlineCurtainRadius * 2}px`,
        )
        skillsWorkHeadline.classList.toggle(
          'is-curtain-active',
          skillsHeadlineCurtainVisible && skillsHeadlineCurtainRadius > 0,
        )
      }

      if (workHeading) {
        const bounds = workHeading.getBoundingClientRect()
        workHeading.style.setProperty(
          '--hero-circle-x',
          `${current.x - bounds.left}px`,
        )
        workHeading.style.setProperty(
          '--hero-circle-y',
          `${current.y - bounds.top}px`,
        )
        workHeading.style.setProperty(
          '--hero-circle-size',
          `${workHeadingCurtainRadius * 2}px`,
        )
        workHeading.classList.toggle(
          'is-curtain-active',
          workHeadingCurtainVisible && workHeadingCurtainRadius > 0,
        )
      }

      if (contactHeading) {
        const bounds = contactHeading.getBoundingClientRect()
        contactHeading.style.setProperty(
          '--hero-circle-x',
          `${current.x - bounds.left}px`,
        )
        contactHeading.style.setProperty(
          '--hero-circle-y',
          `${current.y - bounds.top}px`,
        )
        contactHeading.style.setProperty(
          '--hero-circle-size',
          `${contactHeadingCurtainRadius * 2}px`,
        )
        contactHeading.classList.toggle(
          'is-curtain-active',
          contactHeadingCurtainVisible && contactHeadingCurtainRadius > 0,
        )
      }

      if (aboutCurtainCircle && aboutSection) {
        const bounds = aboutSection.getBoundingClientRect()
        aboutCurtainCircle.style.setProperty(
          '--circle-x',
          `${current.x - bounds.left}px`,
        )
        aboutCurtainCircle.style.setProperty(
          '--circle-y',
          `${current.y - bounds.top}px`,
        )
        aboutCurtainCircle.style.setProperty(
          '--circle-size',
          `${aboutCurtainRadius * 2}px`,
        )
        aboutCurtainCircle.classList.toggle('is-active', aboutCurtainRadius > 0)
      }
      cursor.classList.toggle(
        'about-curtain-active',
        activeCurtain === aboutHeadline || aboutCurtainVisible,
      )
      cursor.classList.toggle(
        'hero-curtain-active',
        activeCurtain === slogan ||
          sloganCurtainVisible ||
          activeCurtain === skillsTechHeadline ||
          skillsTechCurtainVisible ||
          activeCurtain === skillsWorkHeadline ||
          skillsHeadlineCurtainVisible ||
          activeCurtain === workHeading ||
          workHeadingCurtainVisible ||
          activeCurtain === contactHeading ||
          contactHeadingCurtainVisible,
      )
      cursor.classList.toggle('social-target-active', activeMagnet !== null)
      const heroSequenceHidden =
        transitionSequence?.classList.contains('is-pinned') ?? false
      cursor.classList.toggle('hero-sequence-hidden', heroSequenceHidden)
      pointer.classList.toggle('hero-sequence-hidden', heroSequenceHidden)

      if (!pointerSettled) {
        scheduleRender()
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      target.x = event.clientX
      target.y = event.clientY
      hasPointerPosition = true
      const hoveredSocial = document
        .elementFromPoint(target.x, target.y)
        ?.closest<HTMLElement>('.social-link') ?? null

      if (hoveredSocial !== activeSocial) {
        activeSocial?.classList.remove('social-hover')
        activeSocial = hoveredSocial
        activeSocial?.classList.add('social-hover')
      }

      const activeRegion = [
        { element: slogan, lines: sloganLines },
        { element: aboutHeadline, lines: aboutHeadlineRows },
        { element: skillsTechHeadline, lines: skillsTechHeadlineRows },
        { element: skillsWorkHeadline, lines: skillsHeadlineRows },
        { element: workHeading, lines: workHeadingRows },
        { element: contactHeading, lines: contactHeadingRows },
      ].find(({ element, lines }) =>
        element === skillsTechHeadline || element === contactHeading
          ? isPointerOverHeadlineWord(target.x, target.y, lines)
          : isPointerInTextRegion(target.x, target.y, lines),
      )

      if (activeRegion) {
        const area =
          activeRegion.element === skillsTechHeadline ||
          activeRegion.element === skillsWorkHeadline ||
          activeRegion.element === workHeading
            ? document.querySelector<HTMLElement>('.hero')
            : activeRegion.element === contactHeading
              ? document.querySelector<HTMLElement>('.contact-section')
            : activeRegion.element?.closest<HTMLElement>(
                '.hero, .about-section',
              )
        const areaBounds = area?.getBoundingClientRect()
        const size = Math.min(
          (areaBounds?.height ?? 0) * 0.5,
          window.innerWidth * 0.25,
        )
        targetCursorSize = Math.max(baseCursorSize, size)
        activeCurtain = activeRegion.element
      } else {
        targetCursorSize = baseCursorSize
        activeCurtain = null
      }
      scheduleRender()
    }

    const handleScroll = () => {
      scrollHitTestPending = true
      scheduleRender()
    }

    const handlePointerOver = (event: PointerEvent) => {
      const targetElement = event.target

      if (targetElement instanceof Element) {
        const social = targetElement.closest<HTMLElement>('.social-link')

        if (social) {
          activeSocial?.classList.remove('social-hover')
          activeSocial = social
          activeSocial.classList.add('social-hover')
        }

      }
    }

    const handlePointerOut = (event: PointerEvent) => {
      const targetElement = event.target
      const relatedTarget = event.relatedTarget

      if (!(targetElement instanceof Element)) {
        return
      }

      const social = targetElement.closest<HTMLElement>('.social-link')

      if (
        social &&
        !(relatedTarget instanceof Node && social.contains(relatedTarget))
      ) {
        social.classList.remove('social-hover')
        if (activeSocial === social) {
          activeSocial = null
        }
      }

    }

    document.documentElement.classList.add('custom-cursor-enabled')
    const transitionObserver = transitionSequence
      ? new MutationObserver(scheduleRender)
      : null
    const exploreObserver = new MutationObserver(scheduleRender)
    if (transitionSequence) {
      transitionObserver?.observe(transitionSequence, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }
    exploreObserver.observe(document.body, { childList: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', scheduleRender, { passive: true })
    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    scheduleRender()

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', scheduleRender)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      transitionObserver?.disconnect()
      exploreObserver.disconnect()
      document.documentElement.classList.remove('custom-cursor-enabled')
      document.documentElement.classList.remove(
        'clothesline-gallery-cursor-active',
      )
      document.documentElement.classList.remove('explore-screen-active')
      document
        .querySelectorAll('.cursor-hover')
        .forEach((element) => element.classList.remove('cursor-hover'))
      document
        .querySelectorAll('.slogan-hover')
        .forEach((element) => element.classList.remove('slogan-hover'))
      document
        .querySelectorAll('.social-hover')
        .forEach((element) => element.classList.remove('social-hover'))
      cursor.classList.remove('normal-cursor-hidden')
      pointer.classList.remove('explore-native-pointer')
      magneticElements.forEach((element) => {
        element.style.removeProperty('--mag-x')
        element.style.removeProperty('--mag-y')
        element.classList.remove('magnetic-active')
      })
      brand?.style.removeProperty('--mag-x')
      brand?.style.removeProperty('--mag-y')
      brand?.classList.remove('logo-magnetic-active')
      siteHeader?.classList.remove('logo-magnetic-active')
      pointer.classList.remove('is-hand')
      pointer.classList.remove('is-text-caret')
      socials?.style.removeProperty('--mag-circle-x')
      socials?.style.removeProperty('--mag-circle-y')
      socials?.classList.remove('is-magnetic-active')
    }
  }, [])

  return (
    <>
      <span ref={pointerRef} className="custom-pointer" aria-hidden="true" />
      <span ref={cursorRef} className="custom-cursor" aria-hidden="true" />
    </>
  )
}

const transitionScenes = ['CREATE.', 'BUILD.', 'IMPACT.']
const aboutTransitionStartEvent = 'about-transition-start'

const transitionLetterSpacing: Record<string, number> = {
  CREATE: 2,
  BUILD: 3,
}

function TransitionSequence() {
  const sequenceRef = useRef<HTMLElement>(null)
  const sceneRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const headlineLineRefs = useRef<(HTMLSpanElement | null)[]>([])
  const progressRefs = useRef<(HTMLSpanElement | null)[]>([])
  const sequenceActiveRef = useRef(false)
  const sequencePlayedRef = useRef(false)
  const isCompletingScrollRef = useRef(false)
  const previousScrollYRef = useRef(0)
  const pinScrollYRef = useRef(0)
  const controlledScrollYRef = useRef(0)
  const isRevealingAboutRef = useRef(false)
  const revealStartPositionRef = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const sequence = sequenceRef.current

    if (!sequence) {
      return
    }

    const transitionRegion =
      sequence.parentElement?.querySelector<HTMLElement>(
        '.about-transition-region',
      )
    const aboutSection =
      sequence.parentElement?.querySelector<HTMLElement>('.about-section')
    const homeSection = document.querySelector<HTMLElement>('.home')

    if (!transitionRegion || !aboutSection || !homeSection) {
      console.error('The About transition is missing its destination sections.')
      return
    }

    previousScrollYRef.current = window.scrollY
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const sceneDuration = reducedMotion ? 450 : 2450
    const finalEntranceDuration = reducedMotion ? 0 : 1000
    const finalHoldDuration = reducedMotion ? 700 : 1200
    const taglineSequenceDuration =
      sceneDuration * 2 + finalEntranceDuration + finalHoldDuration
    const impactExitDuration = reducedMotion ? 0 : 350
    const headlineEntranceDuration = reducedMotion ? 0 : 750
    const headlineLineDelay = reducedMotion ? 0 : 350
    const headlineHoldDuration = reducedMotion ? 0 : 450
    const regionSettleDuration = reducedMotion ? 0 : 1100
    const headlineEntranceStart = taglineSequenceDuration + impactExitDuration
    const headlineSettleStart =
      headlineEntranceStart +
      headlineLineDelay +
      headlineEntranceDuration +
      headlineHoldDuration
    const totalDuration = headlineSettleStart + regionSettleDuration

    const easeOut = (value: number) => {
      let lower = 0
      let upper = 1
      let parameter = value

      for (let iteration = 0; iteration < 8; iteration += 1) {
        const inverse = 1 - parameter
        const curveX =
          3 * inverse ** 2 * parameter * 0.22 +
          3 * inverse * parameter ** 2 * 0.36 +
          parameter ** 3

        if (curveX < value) {
          lower = parameter
        } else {
          upper = parameter
        }
        parameter = (lower + upper) / 2
      }

      const inverse = 1 - parameter
      return (
        3 * inverse ** 2 * parameter +
        3 * inverse * parameter ** 2 +
        parameter ** 3
      )
    }

    const drawScene = (elapsed: number) => {
      const boundedElapsed = Math.min(elapsed, taglineSequenceDuration)
      const firstScenesDuration = sceneDuration * 2
      const activeScene =
        boundedElapsed < firstScenesDuration
          ? Math.floor(boundedElapsed / sceneDuration)
          : transitionScenes.length - 1
      const sceneTime =
        activeScene < 2
          ? boundedElapsed - activeScene * sceneDuration
          : boundedElapsed - firstScenesDuration
      const entranceDuration =
        activeScene === 2 ? finalEntranceDuration : reducedMotion ? 0 : 1000
      const holdDuration =
        activeScene === 2
          ? finalHoldDuration
          : reducedMotion
            ? sceneDuration
            : 850
      const exitDuration = activeScene === 2 || reducedMotion ? 0 : 600

      sceneRefs.current.forEach((scene, index) => {
        if (!scene) {
          return
        }

        let opacity = 0
        let reveal = 0
        let verticalOffset = 22

        if (
          index === 2 &&
          activeScene === 2 &&
          elapsed >= taglineSequenceDuration
        ) {
          const exit = reducedMotion
            ? 1
            : easeOut(
                Math.min(1, (elapsed - taglineSequenceDuration) / 350),
              )
          opacity = 1 - exit
          reveal = 1 - exit
          verticalOffset = -14 * exit
        } else if (index === 2 && activeScene === 2) {
          if (sceneTime < entranceDuration) {
            const entrance = easeOut(sceneTime / entranceDuration)
            opacity = entrance
            reveal = entrance
            verticalOffset = 22 * (1 - entrance)
          } else {
            opacity = 1
            reveal = 1
            verticalOffset = 0
          }
        } else if (reducedMotion && index === activeScene) {
          opacity = 1
          reveal = 1
          verticalOffset = 0
        } else if (index === activeScene) {
          if (sceneTime < entranceDuration) {
            const entrance = easeOut(sceneTime / entranceDuration)
            opacity = entrance
            reveal = entrance
            verticalOffset = 22 * (1 - entrance)
          } else if (sceneTime < entranceDuration + holdDuration) {
            opacity = 1
            reveal = 1
            verticalOffset = 0
          } else if (sceneTime < entranceDuration + holdDuration + exitDuration) {
            const exit = easeOut(
              (sceneTime - entranceDuration - holdDuration) / exitDuration,
            )
            opacity = 1 - exit
            reveal = 1 - exit
            verticalOffset = -14 * exit
          }
        }

        scene.style.opacity = `${opacity}`
        scene.style.clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`
        scene.style.transform = `translate3d(0, ${verticalOffset}px, 0)`
        scene.setAttribute('aria-hidden', `${index !== activeScene}`)
      })

      progressRefs.current.forEach((marker, index) => {
        marker?.classList.toggle('is-active', index === activeScene)
      })

      const isIntroducing = elapsed >= headlineEntranceStart
      sequence.classList.toggle('is-fourth-statement', isIntroducing)
      if (isIntroducing) {
        if (
          transitionRegion &&
          !transitionRegion.classList.contains('is-introducing')
        ) {
          transitionRegion.classList.add('is-introducing')
          window.dispatchEvent(new Event(aboutTransitionStartEvent))
        }
      } else {
        transitionRegion?.classList.remove('is-introducing', 'is-settling')
      }

      transitionRegion?.classList.toggle(
        'is-settling',
        elapsed >= headlineSettleStart,
      )

      const headlineElapsed = elapsed - headlineEntranceStart
      headlineLineRefs.current.forEach((line, index) => {
        if (!line) {
          return
        }

        const lineStart = index * headlineLineDelay
        const linearProgress = Math.min(
          1,
          (headlineElapsed - lineStart) / headlineEntranceDuration,
        )
        const entranceProgress =
          headlineElapsed < lineStart
            ? 0
            : reducedMotion
              ? 1
              : linearProgress === 1
                ? 1
                : easeOut(linearProgress)
        line.style.opacity = `${entranceProgress}`
        line.style.clipPath =
          entranceProgress === 1
            ? 'none'
            : `inset(0 ${(1 - entranceProgress) * 100}% 0 0)`
        line.style.transform = `translate3d(0, ${24 * (1 - entranceProgress)}px, 0)`
      })
    }

    const setScrollPosition = (position: number) => {
      if (sequenceActiveRef.current) {
        controlledScrollYRef.current = position
      }

      if (activeLenis) {
        activeLenis.scrollTo(position, { force: true, immediate: true })
      } else {
        window.scrollTo({ top: position, behavior: 'instant' })
      }
    }

    const releaseSequence = () => {
      sequenceActiveRef.current = false
      sequencePlayedRef.current = true
      isRevealingAboutRef.current = false
      previousScrollYRef.current = window.scrollY
      document.documentElement.classList.remove(
        'about-transition-cursor-hidden',
      )
      setSmoothScrollLock('about-transition', false)
    }

    const handleTimelineInterrupt = () => {
      if (!sequenceActiveRef.current) {
        return
      }

      sequence.classList.remove('is-pinned', 'is-fourth-statement')
      sequence.classList.add('is-completed')
      sequence.style.removeProperty('--sequence-glow')
      transitionRegion.classList.remove('is-introducing', 'is-settling')
      transitionRegion.classList.add('is-permanent')
      releaseSequence()
    }

    const startSequence = () => {
      if (sequenceActiveRef.current || sequencePlayedRef.current) {
        return
      }

      isCompletingScrollRef.current = false
      sequence.classList.remove('is-completed', 'is-fourth-statement')
      transitionRegion?.classList.remove(
        'is-introducing',
        'is-settling',
        'is-permanent',
      )
      isRevealingAboutRef.current = false
      drawScene(0)
      const bounds = sequence.getBoundingClientRect()
      pinScrollYRef.current = Math.max(0, bounds.top + window.scrollY)
      controlledScrollYRef.current = pinScrollYRef.current
      sequenceActiveRef.current = true
      document.documentElement.classList.add(
        'about-transition-cursor-hidden',
      )
      setSmoothScrollLock('about-transition', true)
      sequence.classList.add('is-pinned')
      setScrollPosition(pinScrollYRef.current)
      previousScrollYRef.current = pinScrollYRef.current
      timelineRef.current?.play(0)
    }

    const completeScrollToSequence = (destination: number) => {
      if (
        sequenceActiveRef.current ||
        sequencePlayedRef.current ||
        isCompletingScrollRef.current
      ) {
        return
      }

      isCompletingScrollRef.current = true
      if (reducedMotion) {
        setScrollPosition(destination)
        startSequence()
        return
      }

      if (activeLenis) {
        activeLenis.scrollTo(destination, {
          duration: 0.65,
          lock: true,
          onComplete: startSequence,
        })
      } else {
        setScrollPosition(destination)
        startSequence()
      }
    }

    const prepareAboutReveal = () => {
      sequence.classList.remove('is-pinned', 'is-fourth-statement')
      sequence.classList.add('is-completed')
      sequence.style.removeProperty('--sequence-glow')
      transitionRegion.classList.remove('is-introducing', 'is-settling')
      transitionRegion.classList.add('is-permanent')
      revealStartPositionRef.current = window.scrollY
      isRevealingAboutRef.current = true
    }

    const gsapContext = gsap.context(() => {
      const animationClock = { elapsed: 0 }
      const revealProgress = { value: 0 }

      timelineRef.current = gsap
        .timeline({ paused: true, onInterrupt: handleTimelineInterrupt })
        .to(animationClock, {
          elapsed: totalDuration,
          duration: totalDuration / 1000,
          ease: 'none',
          onUpdate: () => {
            const elapsed = animationClock.elapsed
            drawScene(elapsed)
            if (elapsed < taglineSequenceDuration) {
              sequence.style.setProperty(
                '--sequence-glow',
                `${
                  Math.sin(
                    Math.PI * ((elapsed % sceneDuration) / sceneDuration),
                  ) * 0.18
                }`,
              )
            } else {
              sequence.style.removeProperty('--sequence-glow')
            }
          },
        })
        .call(prepareAboutReveal)
        .to(revealProgress, {
          value: 1,
          duration: reducedMotion ? 0.01 : 1.35,
          ease: 'power2.inOut',
          onUpdate: () => {
            const aboutTop =
              aboutSection.getBoundingClientRect().top + window.scrollY
            const destination =
              revealStartPositionRef.current +
              (aboutTop - revealStartPositionRef.current) *
                revealProgress.value
            setScrollPosition(destination)
          },
        })
        .call(releaseSequence)
    }, sequence)

    const handleScroll = () => {
      const bounds = sequence.getBoundingClientRect()
      const currentScrollY = window.scrollY
      const sequenceTop = bounds.top + currentScrollY
      if (isCompletingScrollRef.current) {
        previousScrollYRef.current = currentScrollY
        return
      }
      if (sequenceActiveRef.current) {
        const controlledScrollY = isRevealingAboutRef.current
          ? controlledScrollYRef.current
          : pinScrollYRef.current
        if (Math.abs(currentScrollY - controlledScrollY) > 1) {
          setScrollPosition(controlledScrollY)
        }
        previousScrollYRef.current = controlledScrollY
        return
      }

      const homeTop =
        homeSection.getBoundingClientRect().top + currentScrollY
      const homeToSequenceDistance = sequenceTop - homeTop
      const triggerPosition =
        homeTop + Math.max(0, homeToSequenceDistance) * 0.75

      if (
        !sequencePlayedRef.current &&
        currentScrollY >= triggerPosition &&
        previousScrollYRef.current < triggerPosition
      ) {
        completeScrollToSequence(sequenceTop)
      }
      previousScrollYRef.current = currentScrollY
    }

    const handleWheel = (event: WheelEvent) => {
      if (!sequenceActiveRef.current && !isCompletingScrollRef.current) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!sequenceActiveRef.current && !isCompletingScrollRef.current) {
        return
      }

      if (
        ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(
          event.key,
        )
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (sequenceActiveRef.current || isCompletingScrollRef.current) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (
        (sequenceActiveRef.current || isCompletingScrollRef.current) &&
        event.target instanceof Element &&
        event.target.closest('a[href^="#"]')
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    const handleResize = () => {
      if (sequenceActiveRef.current && !isRevealingAboutRef.current) {
        setScrollPosition(pinScrollYRef.current)
      } else if (!sequenceActiveRef.current) {
        handleScroll()
      }
      ScrollTrigger.refresh()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false,
    })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleClick, true)
    window.addEventListener('touchmove', handleTouchMove, {
      capture: true,
      passive: false,
    })

    const initialBounds = sequence.getBoundingClientRect()
    if (initialBounds.top <= 0) {
      startSequence()
    }

    return () => {
      if (sequenceActiveRef.current) {
        sequenceActiveRef.current = false
        isRevealingAboutRef.current = false
        sequence.classList.remove('is-pinned', 'is-fourth-statement')
        sequence.classList.add('is-completed')
        sequence.style.removeProperty('--sequence-glow')
        transitionRegion.classList.remove('is-introducing', 'is-settling')
        transitionRegion.classList.add('is-permanent')
      }
      document.documentElement.classList.remove(
        'about-transition-cursor-hidden',
      )
      setSmoothScrollLock('about-transition', false)
      timelineRef.current?.kill()
      timelineRef.current = null
      gsapContext.revert()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('wheel', handleWheel, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('touchmove', handleTouchMove, true)
    }
  }, [])

  return (
    <>
      <section
        className="transition-sequence"
        ref={sequenceRef}
        aria-label="Ideas in motion"
      >
        <div className="transition-stage">
          {transitionScenes.map((scene, index) => (
            <p
              className="transition-tagline"
              aria-hidden={index !== 0}
              key={scene}
              ref={(element) => {
                sceneRefs.current[index] = element
              }}
            >
              {Array.from(scene).map((character, characterIndex) =>
                characterIndex === transitionLetterSpacing[scene.slice(0, -1)] ? (
                  <span className="transition-letter-spacing" key={characterIndex}>
                    {character}
                  </span>
                ) : (
                  character
                ),
              )}
            </p>
          ))}
          <div className="transition-progress" aria-hidden="true">
            {transitionScenes.map((scene, index) => (
              <span
                className={index === 0 ? 'is-active' : ''}
                key={scene}
                ref={(element) => {
                  progressRefs.current[index] = element
                }}
              />
            ))}
          </div>
        </div>
      </section>
      <section
        className="about-transition-region"
        aria-label="The mind behind the making"
      >
        <h2
          className="transition-headline"
          aria-label="THE MIND BEHIND THE MAKING."
        >
          <span
            className="transition-headline-line"
            ref={(element) => {
              headlineLineRefs.current[0] = element
            }}
          >
            THE <span className="transition-headline-accent">MIND</span> BEHIND
          </span>
          <span
            className="transition-headline-line transition-headline-line--final"
            ref={(element) => {
              headlineLineRefs.current[1] = element
            }}
          >
            THE <span className="transition-headline-accent">MAKING.</span>
          </span>
        </h2>
      </section>
    </>
  )
}

function ExploreGyroscope({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !active) {
      return
    }

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch (error) {
      console.warn('Explore gyroscope WebGL is unavailable; using its fallback.', error)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30)
    camera.position.set(0, 0, 6)

    scene.add(new THREE.AmbientLight(0xb7bdc3, 1.45))

    const keyLight = new THREE.DirectionalLight(0xf4f2ec, 3.2)
    keyLight.position.set(-3.5, 4.5, 5)
    scene.add(keyLight)

    const edgeLight = new THREE.DirectionalLight(0x9eaab6, 2.1)
    edgeLight.position.set(4, -2, 3)
    scene.add(edgeLight)

    const orangeLight = new THREE.PointLight(0xe95134, 4.5, 8, 2)
    orangeLight.position.set(1.7, 0.4, 2.4)
    scene.add(orangeLight)

    const assembly = new THREE.Group()
    const tiltGroup = new THREE.Group()
    assembly.add(tiltGroup)
    const axisGroups: THREE.Group[] = []
    const spinGroups: THREE.Group[] = []
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    scene.add(assembly)

    const ringFinishes = [
      new THREE.MeshStandardMaterial({
        color: 0x7d8285,
        metalness: 0.92,
        roughness: 0.24,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x44494d,
        metalness: 0.94,
        roughness: 0.28,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xb5b8b8,
        metalness: 0.96,
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x303437,
        metalness: 0.94,
        roughness: 0.26,
      }),
    ]
    const orangeFinish = new THREE.MeshStandardMaterial({
      color: 0x9b3b24,
      emissive: 0xe95134,
      emissiveIntensity: 0.48,
      metalness: 0.82,
      roughness: 0.26,
    })
    const coreFinish = new THREE.MeshPhysicalMaterial({
      color: 0x202426,
      metalness: 0.88,
      roughness: 0.3,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
    })
    const innerFinish = new THREE.MeshStandardMaterial({
      color: 0xb34a2c,
      emissive: 0xa82b13,
      emissiveIntensity: 0.25,
      metalness: 0.9,
      roughness: 0.23,
    })
    materials.push(...ringFinishes, orangeFinish, coreFinish, innerFinish)

    const ringSpecs = [
      { radius: 1.34, tube: 0.042, tilt: [0.12, 0.08, -0.08], speed: 0.24, direction: 1 },
      { radius: 1.12, tube: 0.038, tilt: [0.92, 0.24, 0.37], speed: 0.18, direction: -1 },
      { radius: 0.91, tube: 0.034, tilt: [-0.48, 1.02, -0.28], speed: 0.29, direction: 1 },
      { radius: 0.7, tube: 0.03, tilt: [1.32, -0.62, 0.65], speed: 0.14, direction: -1 },
    ] as const

    ringSpecs.forEach((spec, index) => {
      const axis = new THREE.Group()
      axis.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2])
      const spin = new THREE.Group()
      const ringGeometry = new THREE.TorusGeometry(spec.radius, spec.tube, 16, 144)
      const ring = new THREE.Mesh(ringGeometry, ringFinishes[index])
      ring.castShadow = false
      ring.receiveShadow = false
      geometries.push(ringGeometry)
      spin.add(ring)

      const accentGeometry = new THREE.TorusGeometry(
        spec.radius - spec.tube * 0.72,
        spec.tube * 0.34,
        8,
        72,
        Math.PI * 0.34,
      )
      const accent = new THREE.Mesh(accentGeometry, orangeFinish)
      accent.rotation.z = index * 1.15
      spin.add(accent)
      geometries.push(accentGeometry)

      axis.add(spin)
      tiltGroup.add(axis)
      axisGroups.push(axis)
      spinGroups.push(spin)
    })

    const core = new THREE.Group()
    const coreGeometry = new THREE.SphereGeometry(0.39, 48, 32)
    const coreMesh = new THREE.Mesh(coreGeometry, coreFinish)
    core.add(coreMesh)
    geometries.push(coreGeometry)

    const coreBandGeometry = new THREE.TorusGeometry(0.43, 0.012, 8, 96)
    const coreBand = new THREE.Mesh(coreBandGeometry, innerFinish)
    coreBand.rotation.set(0.8, 0.2, 0.45)
    core.add(coreBand)
    geometries.push(coreBandGeometry)
    tiltGroup.add(core)

    const pointerTarget = { x: 0, y: 0 }
    const pointerTilt = { x: 0, y: 0 }
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.55
      pointerTarget.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.45
    }
    const resetPointer = () => {
      pointerTarget.x = 0
      pointerTarget.y = 0
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', resetPointer)

    const resizeObserver = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) {
        return
      }

      renderer.setSize(bounds.width, bounds.height, false)
      camera.aspect = bounds.width / bounds.height
      camera.updateProjectionMatrix()
    })
    resizeObserver.observe(canvas)

    const initialBounds = canvas.getBoundingClientRect()
    if (initialBounds.width > 0 && initialBounds.height > 0) {
      renderer.setSize(initialBounds.width, initialBounds.height, false)
      camera.aspect = initialBounds.width / initialBounds.height
      camera.updateProjectionMatrix()
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const timer = new THREE.Timer()
    timer.connect(document)
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (document.hidden || time - lastFrameTimeRef.current < 1000 / 45) {
        return
      }

      lastFrameTimeRef.current = time
      timer.update(time)
      const delta = Math.min(timer.getDelta(), 0.04)
      if (!reducedMotion) {
        axisGroups.forEach((axis, index) => {
          const spec = ringSpecs[index]
          const direction = spec.direction
          spinGroups[index].rotation.x += delta * spec.speed * direction
          spinGroups[index].rotation.z += delta * spec.speed * 0.24
          axis.rotation.y += delta * spec.speed * 0.12 * direction
        })
        core.rotation.y += delta * 0.16
        core.rotation.x += delta * 0.08
        assembly.rotation.y += delta * 0.09
        pointerTilt.x += (pointerTarget.y - pointerTilt.x) * Math.min(1, delta * 2.8)
        pointerTilt.y += (pointerTarget.x - pointerTilt.y) * Math.min(1, delta * 2.8)
        assembly.rotation.x += delta * 0.045
        tiltGroup.rotation.x = pointerTilt.x
        tiltGroup.rotation.y = pointerTilt.y
      }

      renderer.render(scene, camera)
    }

    const handleVisibility = () => {
      lastFrameTimeRef.current = 0
      if (document.hidden) {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      } else {
        timer.reset()
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    canvas.parentElement?.classList.add('is-webgl-ready')
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      canvas.parentElement?.classList.remove('is-webgl-ready')
      document.removeEventListener('visibilitychange', handleVisibility)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', resetPointer)
      resizeObserver.disconnect()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
      timer.dispose()
    }
  }, [active])

  return (
    <aside
      className={`explore-gyroscope${active ? '' : ' is-paused'}`}
      aria-label="Interlocking metallic gyroscope"
    >
      <div className="gyroscope-fallback" role="img" aria-label="Metallic gyroscope">
        <span />
        <span />
        <span />
        <i />
      </div>
      <canvas ref={canvasRef} className="gyroscope-canvas" aria-hidden="true" />
    </aside>
  )
}

function ExploreMeExperience() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const exitRef = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<
    'closed' | 'opening' | 'experience' | 'closing'
  >('closed')
  const [step, setStep] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const hasOpenedRef = useRef(false)
  const isOpen = phase !== 'closed'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    const previousBodyPaddingRight = document.body.style.paddingRight
    const previousScrollX = window.scrollX
    const previousScrollY = window.scrollY
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      const currentPaddingRight =
        Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPhase(
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'closed'
            : 'closing',
        )
      }
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    setSmoothScrollLock('explore-me', true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
      document.body.style.paddingRight = previousBodyPaddingRight
      setSmoothScrollLock('explore-me', false)
      window.removeEventListener('keydown', handleKeyDown)
      if (window.scrollX !== previousScrollX || window.scrollY !== previousScrollY) {
        window.scrollTo({
          left: previousScrollX,
          top: previousScrollY,
          behavior: 'instant',
        })
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (phase === 'experience') {
      exitRef.current?.focus()
    } else if (phase === 'closed' && hasOpenedRef.current) {
      triggerRef.current?.focus({ preventScroll: true })
      hasOpenedRef.current = false
    }
  }, [phase])

  const beginExperience = () => {
    const trigger = triggerRef.current
    if (!trigger || phase !== 'closed') {
      return
    }

    hasOpenedRef.current = true
    setStep(0)
    setPhase(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'experience'
        : 'opening',
    )
  }

  const exitExperience = () => {
    setPhase(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'closed'
        : 'closing',
    )
  }

  const moveChapter = (direction: -1 | 1) => {
    if (isTransitioning) {
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    setStep((current) => Math.min(5, Math.max(0, current + direction)))
    setIsTransitioning(!reducedMotion)
  }

  const renderChapter = () => {
    if (step === 0) {
      return (
        <section className="explore-chapter explore-chapter--identity" aria-labelledby="explore-title">
          <p className="explore-eyebrow">CHAPTER 01 <span>/</span> WHO I AM</p>
          <h2 id="explore-title">WHO I AM</h2>
          <p className="explore-name">RAVI YADAV</p>
          <div className="explore-chapter-body">
            <p>
              I&apos;m Ravi Yadav, a third-year Computer Science student with a
              passion for technology, problem-solving, and building things that
              make a difference.
            </p>
            <p>
              I enjoy understanding how things work, exploring new possibilities,
              and turning ideas into functional applications.
            </p>
          </div>
        </section>
      )
    }

    if (step === 1) {
      return (
        <section className="explore-chapter" aria-labelledby="explore-title">
          <p className="explore-eyebrow">CHAPTER 02 <span>/</span> MY JOURNEY</p>
          <h2 id="explore-title">MY JOURNEY</h2>
          <div className="explore-timeline" aria-label="Education timeline">
            <div className="explore-timeline-entry">
              <span className="explore-timeline-marker" aria-hidden="true" />
              <p className="explore-timeline-label">COMPLETED</p>
              <p className="explore-timeline-detail">
                Completed Second Year — 7.5 CGPA
              </p>
            </div>
            <div className="explore-timeline-entry">
              <span className="explore-timeline-marker" aria-hidden="true" />
              <p className="explore-timeline-label">CURRENTLY</p>
              <p className="explore-timeline-detail">
                Third-year Computer Science student
              </p>
              <span className="explore-timeline-meta">IN PROGRESS</span>
            </div>
          </div>
        </section>
      )
    }

    if (step === 2) {
      return (
        <section className="explore-chapter explore-chapter--mindset" aria-labelledby="explore-title">
          <p className="explore-eyebrow">CHAPTER 03 <span>/</span> HOW I THINK</p>
          <h2 id="explore-title">HOW I THINK</h2>
          <div className="explore-thinking-visual" aria-hidden="true">
            <span className="explore-thinking-node">OBSERVE</span>
            <span className="explore-thinking-node">BREAK DOWN</span>
            <span className="explore-thinking-node">UNDERSTAND</span>
            <span className="explore-thinking-node">BUILD</span>
            <i />
          </div>
          <div className="explore-chapter-body">
            <p>I believe in understanding before implementing.</p>
            <p>
              I approach complex challenges by breaking them into smaller
              problems, exploring different approaches, and learning through
              mistakes.
            </p>
            <p>
              For me, consistency, curiosity, and continuous improvement are
              essential parts of growth.
            </p>
          </div>
        </section>
      )
    }

    if (step === 3) {
      return (
        <section className="explore-chapter explore-chapter--interests" aria-labelledby="explore-title">
          <p className="explore-eyebrow">CHAPTER 04 <span>/</span> WHAT I BUILD &amp; EXPLORE</p>
          <h2 id="explore-title">WHAT I BUILD <span>&amp;</span> EXPLORE</h2>
          <div className="explore-interest-list">
            <article className="explore-interest">
              <span className="explore-interest-number">01</span>
              <div>
                <h3>FULL-STACK DEVELOPMENT</h3>
                <p>
                  Building applications and understanding how different parts
                  of a complete application work together.
                </p>
              </div>
            </article>
            <article className="explore-interest">
              <span className="explore-interest-number">02</span>
              <div>
                <h3>DATA STRUCTURES &amp; ALGORITHMS</h3>
                <p>
                  Strengthening problem-solving skills and learning to approach
                  programming challenges efficiently.
                </p>
              </div>
            </article>
            <article className="explore-interest">
              <span className="explore-interest-number">03</span>
              <div>
                <h3>AI-ASSISTED CODING</h3>
                <p>
                  Exploring how AI-assisted tools can support development,
                  improve workflows, and help turn ideas into applications.
                </p>
              </div>
            </article>
          </div>
        </section>
      )
    }

    if (step === 4) {
      return (
        <section className="explore-chapter explore-chapter--direction" aria-labelledby="explore-title">
          <p className="explore-eyebrow">CHAPTER 05 <span>/</span> WHERE I&apos;M HEADED</p>
          <h2 id="explore-title">WHERE I&apos;M HEADED</h2>
          <div className="explore-chapter-body">
            <p>My goal is to become an excellent full-stack software engineer.</p>
            <p>
              I want to understand problems deeply, design thoughtful solutions,
              and build complete, reliable applications that create meaningful
              impact.
            </p>
            <p>
              I&apos;m focused on learning, improving, and becoming better with
              every project and challenge.
            </p>
          </div>
          <span className="explore-direction-line" aria-hidden="true" />
        </section>
      )
    }

    return (
      <section className="explore-chapter explore-chapter--closing" aria-labelledby="explore-title">
        <p className="explore-eyebrow">THE JOURNEY CONTINUES</p>
        <h2 id="explore-title">
          THINK<span>.</span> LEARN<span>.</span>
          <br />
          BUILD<span>.</span> EVOLVE<span>.</span>
        </h2>
      </section>
    )
  }

  return (
    <>
      <button
        className="explore-orb"
        ref={triggerRef}
        type="button"
        aria-label="Explore Me"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={beginExperience}
      >
        <span className="explore-orb-label">EXPLORE ME</span>
        <svg className="explore-orb-arrow" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 8h10M8.5 4l4 4-4 4" />
        </svg>
      </button>
      {isOpen
        ? createPortal(
            <div
              className={`explore-screen${phase === 'opening' ? ' is-opening' : ''}${phase === 'closing' ? ' is-closing' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label="Explore Me personal introduction"
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) {
                  return
                }

                if (event.animationName === 'explore-panel-out') {
                  setPhase('closed')
                }
                if (event.animationName === 'explore-panel-in') {
                  setPhase('experience')
                }
              }}
            >
              {phase === 'experience' || phase === 'closing' ? (
                <div className="explore-interface">
                  <header className="explore-toolbar">
                    <span className="explore-wordmark">EXPLORE <i>ME</i></span>
                    <button
                      className="explore-exit"
                      ref={exitRef}
                      type="button"
                      onClick={exitExperience}
                      disabled={phase === 'closing'}
                    >
                      <span>RETURN TO ABOUT</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  </header>
                  <main className={`explore-stage explore-stage--chapter-${step}`}>
                    <div
                      className="explore-chapter-frame"
                      key={step}
                      onAnimationEnd={(event) => {
                        if (event.target === event.currentTarget) {
                          setIsTransitioning(false)
                        }
                      }}
                    >
                      {renderChapter()}
                    </div>
                    <ExploreGyroscope active={phase === 'experience'} />
                  </main>
                  <footer className="explore-navigation">
                    <button
                      type="button"
                      className="explore-nav-button"
                      onClick={() => moveChapter(-1)}
                      disabled={step === 0 || isTransitioning || phase === 'closing'}
                    >
                      <span aria-hidden="true">←</span> PREVIOUS
                    </button>
                    <div className="explore-progress" aria-live="polite">
                      <span>{String(Math.min(step + 1, 5)).padStart(2, '0')}</span>
                      <i />
                      <span>05</span>
                      <small>{step === 5 ? 'CLOSING STATEMENT' : `CHAPTER ${String(step + 1).padStart(2, '0')}`}</small>
                    </div>
                    <button
                      type="button"
                      className="explore-nav-button explore-nav-button--next"
                      onClick={() => moveChapter(1)}
                      disabled={step === 5 || isTransitioning || phase === 'closing'}
                    >
                      {step === 4 ? 'FINAL STATEMENT' : step === 5 ? 'COMPLETE' : 'NEXT'}
                      <span aria-hidden="true">→</span>
                    </button>
                  </footer>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

const introAssets = [
  '/assets/logo.svg',
  '/assets/portrait.png',
  '/assets/portrait-depth-map.png',
  '/assets/about-portrait.png',
  '/assets/social-icons.svg',
]

function PortfolioIntro({
  onStart,
  onComplete,
}: {
  onStart: () => void
  onComplete: () => void
}) {
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const loadRunRef = useRef(0)
  const [phase, setPhase] = useState<
    'loading' | 'fading' | 'ready' | 'exiting' | 'done'
  >('loading')
  const [progress, setProgress] = useState(1)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (phase === 'done') {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    const previousBodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      const currentPaddingRight =
        Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    setSmoothScrollLock('preloader', true)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
      document.body.style.paddingRight = previousBodyPaddingRight
      setSmoothScrollLock('preloader', false)
    }
  }, [phase])

  useEffect(() => {
    const loadRun = ++loadRunRef.current
    let completed = 0
    let failed = false
    let targetProgress = 0
    let displayedProgress = 0
    let allTasksComplete = false
    let animationFrame: number | null = null
    let completionTimeout: number | null = null
    const total = introAssets.length + 3
    const advanceProgress = () => {
      animationFrame = null
      displayedProgress += (targetProgress - displayedProgress) * 0.12
      if (targetProgress - displayedProgress < 0.12) {
        displayedProgress = targetProgress
      }
      setProgress(Math.max(1, Math.floor(displayedProgress)))

      if (displayedProgress < targetProgress) {
        animationFrame = requestAnimationFrame(advanceProgress)
      } else if (allTasksComplete && loadRunRef.current === loadRun) {
        completionTimeout = window.setTimeout(() => {
          completionTimeout = null
          if (loadRunRef.current === loadRun) {
            setPhase('fading')
          }
        }, 120)
      }
    }
    const scheduleProgress = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(advanceProgress)
      }
    }
    const imageLoads = introAssets.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image()
          let settled = false
          const finish = (error?: Error) => {
            if (settled) {
              return
            }
            settled = true
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          }
          const decode = () => {
            void image.decode().then(
              () => finish(),
              () => finish(new Error(`Unable to decode essential asset: ${src}`)),
            )
          }

          image.onload = decode
          image.onerror = () =>
            finish(new Error(`Unable to load essential asset: ${src}`))
          image.src = src
          if (image.complete && image.naturalWidth > 0) {
            decode()
          }
        }),
    )
    const fontLoads = [
      document.fonts.load('600 16px "Space Grotesk"'),
      document.fonts.load('500 16px Manrope'),
      document.fonts.ready,
    ]
    const tasks = [...imageLoads, ...fontLoads]

    void Promise.all(
      tasks.map((task) =>
        task.then(
          () => {
            if (loadRunRef.current === loadRun) {
              completed += 1
              targetProgress = (completed / total) * 100
              scheduleProgress()
            }
          },
          (error: unknown) => {
            failed = true
            console.error('Portfolio intro asset failed to load.', error)
          },
        ),
      ),
    ).then(() => {
      if (loadRunRef.current !== loadRun) {
        return
      }
      if (failed) {
        setLoadError(true)
        return
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setProgress(100)
        setPhase('ready')
        return
      }
      allTasksComplete = true
      targetProgress = 100
      scheduleProgress()
    })

    return () => {
      if (loadRunRef.current === loadRun) {
        loadRunRef.current += 1
      }
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
      }
      if (completionTimeout !== null) {
        window.clearTimeout(completionTimeout)
      }
    }
  }, [])

  useEffect(() => {
    if (phase === 'ready') {
      startButtonRef.current?.focus({ preventScroll: true })
    }
  }, [phase])

  const startPortfolio = () => {
    onStart()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done')
      onComplete()
      return
    }
    setPhase('exiting')
  }

  if (phase === 'done') {
    return null
  }

  const circumference = 2 * Math.PI * 97.5

  return (
    <div
      className={`portfolio-intro${phase === 'exiting' ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio introduction"
      onAnimationEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.animationName === 'portfolio-intro-exit'
        ) {
          setPhase('done')
          onComplete()
        }
      }}
    >
      <div
        className={`portfolio-intro-content${phase === 'ready' ? ' has-start' : ''}`}
      >
        <div
          className="intro-mark"
          role="progressbar"
          aria-label="Loading portfolio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className={`intro-progress-indicator${phase === 'fading' || phase === 'ready' ? ' is-fading' : ''}`}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === 'opacity' &&
                phase === 'fading'
              ) {
                setPhase('ready')
              }
            }}
          >
            <svg
              className="intro-progress-ring"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <circle className="intro-progress-track" cx="100" cy="100" r="97.5" />
              <circle
                className="intro-progress-value"
                cx="100"
                cy="100"
                r="97.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <span className="intro-percentage" aria-live="polite">
              {progress}%
            </span>
          </div>
          <svg
            className="intro-logo"
            viewBox="0 0 96 64"
            role="img"
            aria-label="Portfolio logo"
          >
            <path
              fill="currentColor"
              d="M8 32 28 8l12 16-12 16L8 32Zm20 0L48 8l12 16-12 16-20-8Z"
            />
            <path
              fill="currentColor"
              d="m48 40 12-16 28 8-28 24-12-16Z"
            />
            <path
              fill="currentColor"
              d="M28 40 48 32l12 16-12 8-20-16Z"
            />
          </svg>
        </div>
        {phase === 'ready' ? (
          <button
            ref={startButtonRef}
            className="intro-start"
            type="button"
            onClick={startPortfolio}
          >
            <span>START</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 8h10M8.5 4l4 4-4 4" />
            </svg>
          </button>
        ) : loadError ? (
          <p className="intro-error" role="alert">
            An essential asset could not be loaded. Refresh to try again.
          </p>
        ) : null}
      </div>
    </div>
  )
}

const maxBackgroundMusicVolume = 0.125

function BackgroundMusicControl({
  hasStarted,
  homeEntered,
}: {
  hasStarted: boolean
  homeEntered: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeFadeFrameRef = useRef<number | null>(null)
  const volumeFadeIdRef = useRef(0)
  const [isSoundOn, setIsSoundOn] = useState(false)
  const [textRoll, setTextRoll] = useState<{
    current: boolean
    next: boolean
    transitioning: boolean
  }>({ current: false, next: false, transitioning: false })

  const fadeVolume = useCallback(
    (
      audio: HTMLAudioElement,
      targetVolume: number,
      onComplete?: () => void,
    ) => {
      const fadeId = ++volumeFadeIdRef.current
      if (volumeFadeFrameRef.current !== null) {
        cancelAnimationFrame(volumeFadeFrameRef.current)
      }

      const startVolume = Math.min(
        maxBackgroundMusicVolume,
        Math.max(0, audio.volume),
      )
      const boundedTarget = Math.min(
        maxBackgroundMusicVolume,
        Math.max(0, targetVolume),
      )
      audio.volume = startVolume

      if (startVolume === boundedTarget) {
        volumeFadeFrameRef.current = null
        onComplete?.()
        return
      }

      const startTime = performance.now()
      const duration = 400
      const animate = (now: number) => {
        if (fadeId !== volumeFadeIdRef.current) {
          return
        }

        const progress = Math.min(1, (now - startTime) / duration)
        const easedProgress = progress * progress * (3 - 2 * progress)
        audio.volume = Math.min(
          maxBackgroundMusicVolume,
          Math.max(
            0,
            startVolume + (boundedTarget - startVolume) * easedProgress,
          ),
        )

        if (progress < 1) {
          volumeFadeFrameRef.current = requestAnimationFrame(animate)
          return
        }

        audio.volume = boundedTarget
        volumeFadeFrameRef.current = null
        onComplete?.()
      }

      volumeFadeFrameRef.current = requestAnimationFrame(animate)
    },
    [],
  )

  useEffect(() => {
    if (!homeEntered) {
      return
    }

    setTextRoll({ current: true, next: true, transitioning: false })
    setIsSoundOn(true)
  }, [homeEntered])

  useLayoutEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.loop = true
    audio.volume = 0

    return () => {
      volumeFadeIdRef.current += 1
      if (volumeFadeFrameRef.current !== null) {
        cancelAnimationFrame(volumeFadeFrameRef.current)
        volumeFadeFrameRef.current = null
      }
      audio.pause()
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !hasStarted || !homeEntered || !isSoundOn) {
      return
    }

    const resumePlayback = (event?: Event) => {
      if (
        event?.target instanceof Element &&
        event.target.closest('.sound-control')
      ) {
        return
      }

      if (!hasStarted || !homeEntered || !isSoundOn || !audio.paused) {
        return
      }

      void audio
        .play()
        .then(() => fadeVolume(audio, maxBackgroundMusicVolume))
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            (error.name === 'AbortError' || error.name === 'NotAllowedError')
          ) {
            return
          }

          console.error('Background music could not be played.', error)
        })
    }

    if (audio.paused) {
      resumePlayback()
    }
    window.addEventListener('pointerdown', resumePlayback)
    window.addEventListener('keydown', resumePlayback)

    return () => {
      window.removeEventListener('pointerdown', resumePlayback)
      window.removeEventListener('keydown', resumePlayback)
    }
  }, [fadeVolume, hasStarted, homeEntered, isSoundOn])

  const finishTextRoll = () => {
    setTextRoll((current) =>
      current.transitioning
        ? {
            current: current.next,
            next: current.next,
            transitioning: false,
          }
        : current,
    )
  }

  const toggleSound = async () => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (isSoundOn && audio.paused) {
      try {
        await audio.play()
        fadeVolume(audio, maxBackgroundMusicVolume)
      } catch (error) {
        if (
          error instanceof DOMException &&
          (error.name === 'NotAllowedError' || error.name === 'AbortError')
        ) {
          return
        }
        console.error('Background music could not be played.', error)
      }
      return
    }

    const nextIsSoundOn = !isSoundOn
    if (nextIsSoundOn) {
      try {
        await audio.play()
        fadeVolume(audio, maxBackgroundMusicVolume)
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'NotAllowedError'
        ) {
          setIsSoundOn(false)
          return
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        console.error('Background music could not be played.', error)
        return
      }
    } else if (!nextIsSoundOn) {
      fadeVolume(audio, 0, () => audio.pause())
    }

    setTextRoll({
      current: isSoundOn,
      next: nextIsSoundOn,
      transitioning: true,
    })
    setIsSoundOn(nextIsSoundOn)
  }

  const soundIcon = (enabled: boolean) => (
    <svg className="sound-control-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6v4h3l4 3V3L5 6H2Z" />
      {enabled ? (
        <path d="M11 5.25a4 4 0 0 1 0 5.5" />
      ) : (
        <path d="m11 6 4 4m0-4-4 4" />
      )}
    </svg>
  )

  return (
    <>
      <audio
        ref={audioRef}
        className="background-music"
        src={
          homeEntered
            ? '/assets/WhatsApp%20Audio%202026-11-12%20at%207.51.19%20PM.mpeg'
            : undefined
        }
        preload={homeEntered ? 'auto' : 'none'}
        loop
      />
      <button
        className={`sound-control${isSoundOn ? '' : ' is-off'}`}
        type="button"
        aria-label={`Turn sound ${isSoundOn ? 'off' : 'on'}`}
        aria-pressed={isSoundOn}
        onClick={toggleSound}
      >
        <span className="sound-control-label" aria-hidden="true">SOUND</span>
        <span
        className={`nav-roll sound-control-roll${textRoll.transitioning ? ' is-transitioning' : ''}`}
        aria-live="polite"
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget.querySelector('.sound-roll-out') &&
            event.propertyName === 'transform'
          ) {
            finishTextRoll()
          }
        }}
        >
        {textRoll.transitioning ? (
          <>
            <span className="sound-roll-out" aria-hidden="true">
              {textRoll.current ? 'ON' : 'OFF'}
              {soundIcon(textRoll.current)}
            </span>
            <span className="sound-roll-in">
              {textRoll.next ? 'ON' : 'OFF'}
              {soundIcon(textRoll.next)}
            </span>
          </>
        ) : (
          <span className="sound-roll-current">
            {textRoll.current ? 'ON' : 'OFF'}
            {soundIcon(textRoll.current)}
          </span>
        )}
        </span>
      </button>
    </>
  )
}

const resumeFilePath = '/resume.pdf'
const resumeDownloadName = 'Ravi_Yadav_Full_Stack_Developer_Resume.pdf'

type ResumeDownloadState = 'idle' | 'success'
type ResumeAvailability = 'checking' | 'ready' | 'missing' | 'error'

function ResumeDownloadButton() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const successRef = useRef<HTMLSpanElement>(null)
  const truckRef = useRef<SVGSVGElement>(null)
  const packageRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const resumeFileRef = useRef<Blob | null>(null)
  const downloadUrlRef = useRef<string | null>(null)
  const revokeTimerRef = useRef<number | null>(null)
  const isBusyRef = useRef(false)
  const isMountedRef = useRef(false)
  const [availability, setAvailability] =
    useState<ResumeAvailability>('checking')
  const [downloadState, setDownloadState] =
    useState<ResumeDownloadState>('idle')
  const [announcement, setAnnouncement] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    isMountedRef.current = true
    const controller = new AbortController()

    void (async () => {
      try {
        const response = await fetch(resumeFilePath, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!isMountedRef.current) return

        if (!response.ok) {
          if (response.status === 404) {
            setAvailability('missing')
            setAnnouncement(
              'Resume PDF unavailable. Add public/resume.pdf to enable downloads.',
            )
            return
          }

          setAvailability('error')
          setAnnouncement('Unable to verify the resume PDF.')
          return
        }

        const file = await response.blob()
        const signature = new TextDecoder().decode(
          await file.slice(0, 5).arrayBuffer(),
        )
        if (!isMountedRef.current) return

        if (signature !== '%PDF-') {
          setAvailability('missing')
          setAnnouncement(
            'Resume PDF unavailable. Add public/resume.pdf to enable downloads.',
          )
          return
        }

        resumeFileRef.current = file
        setAvailability('ready')
      } catch (error: unknown) {
        if (controller.signal.aborted || !isMountedRef.current) return

        setAvailability('error')
        setAnnouncement(
          error instanceof Error
            ? `Unable to verify the resume PDF: ${error.message}`
            : 'Unable to verify the resume PDF.',
        )
      }
    })()

    return () => {
      isMountedRef.current = false
      controller.abort()
      timelineRef.current?.kill()
      if (revokeTimerRef.current !== null) {
        window.clearTimeout(revokeTimerRef.current)
      }
      if (downloadUrlRef.current !== null) {
        URL.revokeObjectURL(downloadUrlRef.current)
      }
    }
  }, [])

  const downloadResume = () => {
    const file = resumeFileRef.current
    if (!file) {
      throw new Error('Resume PDF is unavailable at public/resume.pdf.')
    }

    const downloadUrl = URL.createObjectURL(file)
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadUrl
    downloadLink.download = resumeDownloadName

    try {
      document.body.appendChild(downloadLink)
      downloadLink.click()
    } catch (error: unknown) {
      URL.revokeObjectURL(downloadUrl)
      throw error
    } finally {
      downloadLink.remove()
    }

    if (revokeTimerRef.current !== null) {
      window.clearTimeout(revokeTimerRef.current)
    }
    if (downloadUrlRef.current !== null) {
      URL.revokeObjectURL(downloadUrlRef.current)
    }
    downloadUrlRef.current = downloadUrl
    revokeTimerRef.current = window.setTimeout(
      () => {
        URL.revokeObjectURL(downloadUrl)
        downloadUrlRef.current = null
        revokeTimerRef.current = null
      },
      1000,
    )
  }

  const finishDownload = async (
    downloadPromise: Promise<{ error?: unknown; success: boolean }>,
  ) => {
    const result = await downloadPromise
    if (!isMountedRef.current) return

    if (result.success) {
      setDownloadState('success')
      setAnnouncement('PDF download initiated.')
    } else {
      setDownloadState('idle')
      setAnnouncement(
        result.error instanceof Error
          ? result.error.message
          : 'Resume download failed.',
      )
    }

    isBusyRef.current = false
    setAvailability((current) =>
      result.error instanceof Error &&
      result.error.message.includes('not found')
        ? 'missing'
        : current,
    )
    setIsRunning(false)
  }

  const handleDownload = async () => {
    if (isBusyRef.current || availability !== 'ready') return

    isBusyRef.current = true
    setIsRunning(true)
    setDownloadState('idle')
    setAnnouncement('')

    let downloadPromise: Promise<{ error?: unknown; success: boolean }>
    try {
      downloadResume()
      downloadPromise = Promise.resolve({ success: true })
    } catch (error: unknown) {
      downloadPromise = Promise.resolve({ error, success: false })
    }

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !buttonRef.current ||
      !labelRef.current ||
      !successRef.current ||
      !truckRef.current ||
      !packageRef.current
    ) {
      await finishDownload(downloadPromise)
      return
    }

    const button = buttonRef.current
    const label = labelRef.current
    const truck = truckRef.current
    const packageElement = packageRef.current
    const buttonBounds = button.getBoundingClientRect()
    const truckWidth = truck.getBoundingClientRect().width
    const startX = Math.max(-145, 8 - buttonBounds.left)
    const exitX = Math.min(
      330,
      window.innerWidth - buttonBounds.left - truckWidth - 8,
    )

    gsap.set([truck, packageElement], { autoAlpha: 0 })
    gsap.set(label, { autoAlpha: 1, y: 0 })
    gsap.set(button, { rotation: 0, scale: 1 })
    gsap.set(packageElement, { x: 128, y: -8, rotation: 0 })

    const timeline = gsap.timeline({
      onComplete: () => {
        void finishDownload(downloadPromise)
      },
    })
    timelineRef.current = timeline
    timeline
      .to(button, { scale: 0.97, duration: 0.12, ease: 'power1.out' })
      .to(button, { rotation: -4, duration: 0.22, ease: 'power2.inOut' }, '<')
      .to(label, { autoAlpha: 0, y: -9, duration: 0.18 }, '<')
      .set(truck, { autoAlpha: 1 })
      .fromTo(
        truck,
        { x: startX },
        { x: -18, duration: 0.36, ease: 'power2.out' },
      )
      .to(truck, { x: 132, duration: 0.58, ease: 'power1.inOut' })
      .set(packageElement, { autoAlpha: 1 }, '-=0.08')
      .to(packageElement, {
        y: 28,
        rotation: 16,
        duration: 0.32,
        ease: 'power2.in',
      })
      .to(truck, { x: exitX, duration: 0.5, ease: 'power2.in' })
      .to(
        button,
        { rotation: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
        '-=0.25',
      )
      .to(truck, { autoAlpha: 0, duration: 0.12 }, '-=0.2')
      .to(packageElement, { autoAlpha: 0, duration: 0.15 }, '<')
  }

  const buttonDisabled = availability !== 'ready' || isRunning
  const buttonClassName = [
    'resume-download__button',
    downloadState === 'success' ? 'is-success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="resume-download">
      <button
        ref={buttonRef}
        className={buttonClassName}
        type="button"
        aria-label={
          availability === 'ready'
            ? 'Download resume PDF'
            : 'Download resume PDF currently unavailable'
        }
        aria-busy={isRunning}
        disabled={buttonDisabled}
        onClick={() => void handleDownload()}
      >
        <span ref={labelRef} className="resume-download__label" aria-hidden="true">
          DOWNLOAD RESUME <span className="resume-download__format">PDF ↗</span>
        </span>
        <span ref={successRef} className="resume-download__success" aria-hidden="true">
          Downloaded
          <svg className="resume-download__check" viewBox="0 0 20 20">
            <path d="m4 10 4 4 8-9" />
          </svg>
        </span>
        <span
          ref={packageRef}
          className="resume-download__package"
          aria-hidden="true"
        />
        <svg
          ref={truckRef}
          className="resume-download__truck"
          viewBox="0 0 112 58"
          aria-hidden="true"
        >
          <path
            className="resume-download__truck-body"
            d="M8 11h58v32H8z"
          />
          <path
            className="resume-download__headlight-beam"
            d="M101 36.5 123 33.5 123 45 101 42.5Z"
          />
          <path
            className="resume-download__truck-cab"
            d="M66 21h20l17 15v7H66z"
          />
          <path
            className="resume-download__truck-window"
            d="M72 25h11l11 10H72z"
          />
          <rect
            className="resume-download__truck-headlight"
            x="98"
            y="37"
            width="4"
            height="2.5"
            rx="0.7"
          />
          <rect
            className="resume-download__truck-headlight"
            x="98"
            y="40"
            width="4"
            height="2"
            rx="0.7"
          />
          <path className="resume-download__truck-line" d="M14 18h42" />
          <circle className="resume-download__wheel" cx="27" cy="44" r="7" />
          <circle className="resume-download__wheel-inner" cx="27" cy="44" r="2" />
          <circle className="resume-download__wheel" cx="83" cy="44" r="7" />
          <circle className="resume-download__wheel-inner" cx="83" cy="44" r="2" />
        </svg>
      </button>
      <span className="resume-download__joke">
        Warning: May contain excessive creativity.
      </span>
      <span className="resume-download__sr-only" aria-live="polite">
        {announcement}
      </span>
      {availability === 'missing' && (
        <span className="resume-download__note" aria-hidden="true">
          Add public/resume.pdf to enable downloads
        </span>
      )}
    </div>
  )
}

function App() {
  const [hasStarted, setHasStarted] = useState(false)
  const [homeEntered, setHomeEntered] = useState(false)
  const [introComplete, setIntroComplete] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <>
      <SmoothScroll />
      <PortfolioIntro
        onStart={() => setHasStarted(true)}
        onComplete={() => setHomeEntered(true)}
      />
      <CustomCursor />
      <main className="home">
        <header className="site-header">
          <a className="brand entrance-fade" href="/" aria-label="Portfolio home">
            <img src="/assets/logo.svg" alt="" />
          </a>

          <nav className="main-nav" aria-label="Primary navigation">
            <span className="nav-item-hit">
              <a className="entrance-fade" href="#about">
                <span className="nav-roll"><span>About</span><span aria-hidden="true">About</span></span>
              </a>
            </span>
            <span className="nav-item-hit">
              <a className="entrance-fade" href="#work">
                <span className="nav-roll"><span>Work</span><span aria-hidden="true">Work</span></span>
              </a>
            </span>
            <span className="nav-item-hit">
              <a className="entrance-fade" href="#contact">
                <span className="nav-roll"><span>Contact</span><span aria-hidden="true">Contact</span></span>
              </a>
            </span>
          </nav>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <figure className="portrait" aria-hidden="true">
            <img
              className="portrait-foreground"
              src="/assets/portrait.png"
              alt=""
            />
            <PortraitDepthCanvas />
          </figure>

          <div className="hero-copy">
            <Slogan isVisible={homeEntered} />
            <p
              className="intro entrance-fade"
              onAnimationEnd={(event) => {
                if (event.animationName === 'fade-up-offset') {
                  setIntroComplete(true)
                }
              }}
            >
              Turning ideas into meaningful digital experiences through technology.
            </p>
            <aside
              className={`socials${introComplete ? ' is-intro-complete' : ''}`}
              aria-label="Social profiles"
            >
              <span className="socials-label entrance-fade">Find me</span>
              <a
                className="social-link entrance-fade"
                href={configuredGithubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit GitHub profile"
              >
                <svg aria-hidden="true">
                  <use href="/assets/social-icons.svg#github" />
                </svg>
              </a>
              <a
                className="social-link entrance-fade"
                href={contactLinkedIn}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit LinkedIn profile"
              >
                <svg aria-hidden="true">
                  <use href="/assets/social-icons.svg#linkedin" />
                </svg>
              </a>
              <a
                className="social-link entrance-fade"
                href={contactInstagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Instagram profile"
              >
                <svg aria-hidden="true">
                  <use href="/assets/social-icons.svg#instagram" />
                </svg>
              </a>
              <a
                className="social-link entrance-fade"
                href="https://x.com/ClassMcg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Twitter X profile"
              >
                <svg aria-hidden="true">
                  <use href="/assets/social-icons.svg#x" />
                </svg>
              </a>
            </aside>
          </div>

          <ResumeDownloadButton />
          <BackgroundMusicControl
            hasStarted={hasStarted}
            homeEntered={homeEntered}
          />
          <div className="scroll-indicator entrance-fade" aria-hidden="true">
            <span>Scroll down</span>
            <i />
          </div>
        </section>
      </main>
      <div className="about-experience">
        <TransitionSequence />
        <section
          className="about-section"
          id="about"
          aria-labelledby="about-title"
        >
          <span className="about-curtain-circle" aria-hidden="true" />
          <div className="about-copy">
            <p className="about-label">01 — ABOUT ME</p>
            <AboutHeadline />
            <p className="about-introduction">
              Thoughtful ideas, carefully built into digital experiences.
            </p>
            <AboutStatement />
          </div>
          <ExploreMeExperience />
          <img
            className="about-portrait"
            src="/assets/about-portrait.png"
            alt="Full-body portrait of Ravi in black clothing"
          />
        </section>
      </div>
      <div className="about-skills-transition" aria-hidden="true" />
      <SkillsSection />
      <ContactSection />
    </>
  )
}

export default App
