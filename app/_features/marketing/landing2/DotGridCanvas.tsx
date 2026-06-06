"use client";

/**
 * WebGL2 interactive dot-grid background.
 * Physics: spring + mouse repulsion + click ripples, all running on GPU.
 * Technique: ping-pong framebuffers (sim pass writes state, render pass draws dots).
 * Falls back to a static CSS dot grid if WebGL2 / EXT_color_buffer_float is absent.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// ─── WebGL helpers ────────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader compile error");
  return s;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) ?? "program link error");
  return p;
}

function createFBO(gl: WebGL2RenderingContext, w: number, h: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb };
}

function hasWebGL2Float(): boolean {
  try {
    const ctx = document.createElement("canvas").getContext("webgl2");
    if (!ctx) return false;
    const ok = !!ctx.getExtension("EXT_color_buffer_float");
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** Foreground tint — opacity in the shader keeps it subtle */
function parseCSSVarColor(varName: string, fallback: [number, number, number]): [number, number, number] {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return fallback;
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 1;
    const ctx = tmp.getContext("2d")!;
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  } catch {
    return fallback;
  }
}

function getSubtleDotRGB(): [number, number, number] {
  return parseCSSVarColor("--foreground", [0.16, 0.13, 0.12]);
}

// ─── GLSL shaders (exact Ramp physics) ────────────────────────────────────────

const SIM_VS = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const SIM_FS = `#version 300 es
precision highp float;
uniform vec2 u_gridSize;
uniform vec2 u_gridOrigin;
uniform float u_spacing;
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_radius;
uniform float u_force;
uniform float u_spring;
uniform float u_damping;
uniform int u_rippleCount;
uniform vec3 u_ripples[6];
uniform float u_rippleSpeed;
uniform float u_rippleWidth;
uniform float u_rippleF;
uniform float u_rippleDecay;
uniform sampler2D u_prevState;
out vec4 fragColor;
const float TAU = 6.28318530718;
float hash11(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 home = u_gridOrigin + vec2(cell) * u_spacing;
  vec4 state = texelFetch(u_prevState, cell, 0);
  vec2 offset = state.xy;
  vec2 vel = state.zw;
  vec2 pos = home + offset;
  float idHash = hash11(float(cell.x) * 1.7 + float(cell.y) * 73.0);
  float springK = u_spring * (0.8 + idHash * 0.4);
  vel += -offset * springK;
  if (u_mouseActive > 0.001) {
    vec2 c = pos - u_mouse;
    float dist2 = dot(c, c);
    float r2 = u_radius * u_radius;
    if (dist2 < r2 && dist2 > 0.01) {
      float dist = sqrt(dist2);
      float t01 = 1.0 - dist / u_radius;
      float f = t01 * t01 * u_force * u_mouseActive;
      vel += (c / dist) * f;
    }
  }
  for (int i = 0; i < 6; i++) {
    if (i >= u_rippleCount) break;
    vec3 rip = u_ripples[i];
    float age = rip.z;
    if (age < 0.0) continue;
    vec2 r = pos - rip.xy;
    float dist = length(r);
    float wave = age * u_rippleSpeed;
    float diff = dist - wave;
    float ring = exp(-(diff * diff) / u_rippleWidth);
    float ampBase = exp(-age * u_rippleDecay) * u_rippleF;
    float amp = ring * ampBase;
    if (dist > 0.01) {
      vel += (r / dist) * amp;
    } else {
      float ang = hash11(idHash + float(i) * 7.0) * TAU;
      vel += vec2(cos(ang), sin(ang)) * amp;
    }
  }
  vel *= u_damping;
  offset += vel;
  fragColor = vec4(offset, vel);
}`;

const RENDER_VS = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_gridSize;
uniform vec2 u_gridOrigin;
uniform float u_spacing;
uniform float u_time;
uniform float u_dotSize;
uniform float u_reducedMotion;
uniform sampler2D u_state;
out float v_alpha;
const vec3 WAVE_KX = vec3(0.018, -0.012, 0.006);
const vec3 WAVE_KY = vec3(0.009, 0.016, -0.014);
const vec3 WAVE_SPEED = vec3(0.55, 0.38, 0.22);
void main() {
  int id = gl_VertexID;
  int cols = int(u_gridSize.x);
  int row = id / cols;
  int col = id - row * cols;
  vec2 home = u_gridOrigin + vec2(float(col), float(row)) * u_spacing;
  vec4 state = texelFetch(u_state, ivec2(col, row), 0);
  vec2 pos = home + state.xy;
  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = u_dotSize;
  if (u_reducedMotion > 0.5) {
    v_alpha = 0.14;
  } else {
    vec3 phase = vec3(
      home.x * WAVE_KX.x + home.y * WAVE_KY.x,
      home.x * WAVE_KX.y + home.y * WAVE_KY.y,
      home.x * WAVE_KX.z + home.y * WAVE_KY.z
    ) + u_time * WAVE_SPEED;
    float flick = (sin(phase.x) + sin(phase.y) + sin(phase.z)) / 3.0;
    v_alpha = 0.07 + 0.09 * (0.5 + 0.5 * flick);
  }
}`;

const RENDER_FS = `#version 300 es
precision highp float;
uniform vec3 u_color;
in float v_alpha;
out vec4 fragColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float dist2 = dot(c, c);
  float mask = 1.0 - smoothstep(0.1225, 0.25, dist2);
  if (mask <= 0.0) discard;
  float a = v_alpha * mask;
  fragColor = vec4(u_color * a, a);
}`;

// ─── Component ────────────────────────────────────────────────────────────────

export function DotGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (!hasWebGL2Float()) {
      setWebglFailed(true);
      return;
    }

    const glContext = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!glContext || !glContext.getExtension("EXT_color_buffer_float")) {
      setWebglFailed(true);
      return;
    }
    const gl: WebGL2RenderingContext = glContext;
    const canvasEl: HTMLCanvasElement = canvas;
    const containerEl: HTMLDivElement = container;

    const dotColor = getSubtleDotRGB();

    let simVS: WebGLShader;
    let simFS: WebGLShader;
    let renderVS: WebGLShader;
    let renderFS: WebGLShader;
    let simProg: WebGLProgram;
    let renderProg: WebGLProgram;

    try {
    // Compile
    simVS = compileShader(gl, gl.VERTEX_SHADER, SIM_VS);
    simFS = compileShader(gl, gl.FRAGMENT_SHADER, SIM_FS);
    renderVS = compileShader(gl, gl.VERTEX_SHADER, RENDER_VS);
    renderFS = compileShader(gl, gl.FRAGMENT_SHADER, RENDER_FS);
    simProg = linkProgram(gl, simVS, simFS);
    renderProg = linkProgram(gl, renderVS, renderFS);
    } catch {
      setWebglFailed(true);
      return;
    }

    gl.disable(gl.DEPTH_TEST);

    // Uniform locations
    const simU = {
      gridSize: gl.getUniformLocation(simProg, "u_gridSize"),
      gridOrigin: gl.getUniformLocation(simProg, "u_gridOrigin"),
      spacing: gl.getUniformLocation(simProg, "u_spacing"),
      mouse: gl.getUniformLocation(simProg, "u_mouse"),
      mouseActive: gl.getUniformLocation(simProg, "u_mouseActive"),
      radius: gl.getUniformLocation(simProg, "u_radius"),
      force: gl.getUniformLocation(simProg, "u_force"),
      spring: gl.getUniformLocation(simProg, "u_spring"),
      damping: gl.getUniformLocation(simProg, "u_damping"),
      rippleCount: gl.getUniformLocation(simProg, "u_rippleCount"),
      ripples: gl.getUniformLocation(simProg, "u_ripples"),
      rippleSpeed: gl.getUniformLocation(simProg, "u_rippleSpeed"),
      rippleWidth: gl.getUniformLocation(simProg, "u_rippleWidth"),
      rippleF: gl.getUniformLocation(simProg, "u_rippleF"),
      rippleDecay: gl.getUniformLocation(simProg, "u_rippleDecay"),
      prevState: gl.getUniformLocation(simProg, "u_prevState"),
    };
    const renderU = {
      resolution: gl.getUniformLocation(renderProg, "u_resolution"),
      gridSize: gl.getUniformLocation(renderProg, "u_gridSize"),
      gridOrigin: gl.getUniformLocation(renderProg, "u_gridOrigin"),
      spacing: gl.getUniformLocation(renderProg, "u_spacing"),
      time: gl.getUniformLocation(renderProg, "u_time"),
      dotSize: gl.getUniformLocation(renderProg, "u_dotSize"),
      reducedMotion: gl.getUniformLocation(renderProg, "u_reducedMotion"),
      state: gl.getUniformLocation(renderProg, "u_state"),
      color: gl.getUniformLocation(renderProg, "u_color"),
    };

    // Full-screen quad for the sim pass
    const quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const simVAO = gl.createVertexArray()!;
    gl.bindVertexArray(simVAO);
    const posLoc = gl.getAttribLocation(simProg, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Empty VAO for render pass — uses gl_VertexID instancing
    const renderVAO = gl.createVertexArray()!;

    // Set constant uniforms
    gl.useProgram(simProg);
    gl.uniform1i(simU.prevState, 0);
    gl.uniform1f(simU.spacing, 12);
    gl.uniform1f(simU.radius, 150);
    gl.uniform1f(simU.force, 10);
    gl.uniform1f(simU.spring, 0.018);
    gl.uniform1f(simU.damping, 0.8);
    gl.uniform1f(simU.rippleSpeed, 280);
    gl.uniform1f(simU.rippleWidth, 720);
    gl.uniform1f(simU.rippleF, 3.5);
    gl.uniform1f(simU.rippleDecay, 4.2);

    gl.useProgram(renderProg);
    gl.uniform1i(renderU.state, 0);
    gl.uniform1f(renderU.spacing, 12);
    gl.uniform3f(renderU.color, dotColor[0], dotColor[1], dotColor[2]);
    gl.uniform1f(renderU.reducedMotion, reduce ? 1 : 0);

    // Grid / FBO state
    let dpr = 1;
    let W = 0, H = 0;
    let cols = 0, rows = 0;
    let ox = 0, oy = 0;
    let fbos: Array<{ fb: WebGLFramebuffer; tex: WebGLTexture }> | null = null;
    let ping = 0;
    let rect = { left: 0, top: 0, width: 0, height: 0 };

    function syncRect() {
      const r = containerEl.getBoundingClientRect();
      rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = containerEl.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvasEl.width = Math.max(1, Math.floor(W * dpr));
      canvasEl.height = Math.max(1, Math.floor(H * dpr));
      ox = 6;
      oy = 6;
      cols = Math.max(1, Math.ceil((W - ox + 12) / 12));
      rows = Math.max(1, Math.ceil((H - oy + 12) / 12));

      if (fbos) {
        gl.deleteFramebuffer(fbos[0].fb); gl.deleteTexture(fbos[0].tex);
        gl.deleteFramebuffer(fbos[1].fb); gl.deleteTexture(fbos[1].tex);
      }
      fbos = [createFBO(gl, cols, rows), createFBO(gl, cols, rows)];
      ping = 0;

      gl.useProgram(simProg);
      gl.uniform2f(simU.gridSize, cols, rows);
      gl.uniform2f(simU.gridOrigin, ox, oy);

      gl.useProgram(renderProg);
      gl.uniform2f(renderU.resolution, W, H);
      gl.uniform2f(renderU.gridSize, cols, rows);
      gl.uniform2f(renderU.gridOrigin, ox, oy);
      gl.uniform1f(renderU.dotSize, 2 * dpr + 0.5);

      syncRect();
    }

    resize();

    // Intersection observer — pause animation when off-screen
    let visible = true;
    let resetPending = false;
    const io = new IntersectionObserver(
      ([e]) => {
        const was = visible;
        visible = e?.isIntersecting ?? false;
        if (visible && !was) resetPending = true;
      },
      { threshold: 0 },
    );
    io.observe(containerEl);

    // Pointer state
    const mouse = { x: -9999, y: -9999 };
    const smooth = { x: -9999, y: -9999 };
    let mouseDown = false;
    let overInteractive = false;
    let lastInteractiveTs = 0;
    let lastMouseTime = -10;
    let time = 0;

    interface Ripple { x: number; y: number; born: number }
    const ripples: Ripple[] = [];
    const ripData = new Float32Array(18);

    const onMove = (e: PointerEvent) => {
      if (reduce) return;
      if (
        e.clientY < rect.top - 150 ||
        e.clientY > rect.top + rect.height + 150
      ) {
        if (mouseDown) { mouse.x = -9999; mouse.y = -9999; mouseDown = false; overInteractive = false; }
        return;
      }
      if (e.timeStamp - lastInteractiveTs > 100) {
        const t = e.target as HTMLElement;
        overInteractive =
          t instanceof HTMLElement &&
          !!t.closest("a, button, input, select, textarea, label, [role=button], form, video");
        lastInteractiveTs = e.timeStamp;
      }
      if (overInteractive) { mouse.x = -9999; mouse.y = -9999; mouseDown = false; return; }
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouseDown = true;
      if (smooth.x < -9000) { smooth.x = mouse.x; smooth.y = mouse.y; }
      lastMouseTime = time;
    };

    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouseDown = false; overInteractive = false; };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || overInteractive || reduce) return;
      const rx = e.clientX - rect.left;
      const ry = e.clientY - rect.top;
      if (rx < 0 || ry < 0 || rx > rect.width || ry > rect.height) return;
      ripples.push({ x: rx, y: ry, born: time });
      if (ripples.length > 6) ripples.shift();
    };

    const onVis = () => { if (document.hidden) lastMouseTime = -10; };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("visibilitychange", onVis);

    // Static render for reduced motion
    function renderStatic() {
      if (!fbos) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(renderProg);
      gl.uniform1f(renderU.time, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbos[ping].tex);
      gl.bindVertexArray(renderVAO);
      gl.drawArrays(gl.POINTS, 0, cols * rows);
      gl.bindVertexArray(null);
    }

    let rafId = 0;
    let t0 = 0;

    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (!visible || !fbos) return;
      if (t0 === 0) t0 = ts;
      const dt = Math.min((ts - t0) / 1000, 0.05);
      t0 = ts;
      time += dt;
      syncRect();

      // Lerp smooth mouse
      if (mouseDown) {
        smooth.x += (mouse.x - smooth.x) * 0.8;
        smooth.y += (mouse.y - smooth.y) * 0.8;
      } else {
        smooth.x += (-9999 - smooth.x) * 0.08;
        smooth.y += (-9999 - smooth.y) * 0.08;
      }

      const elapsed = time - lastMouseTime;
      const mouseActiveFactor = mouseDown && elapsed < 1 ? Math.exp(-7 * elapsed) : 0;

      // Compact ripples
      let rc = 0;
      for (let i = 0; i < ripples.length; i++) {
        const age = time - ripples[i].born;
        if (age >= 1.2) continue;
        ripples[rc] = ripples[i];
        if (rc < 6) { ripData[rc * 3] = ripples[i].x; ripData[rc * 3 + 1] = ripples[i].y; ripData[rc * 3 + 2] = age; }
        rc++;
      }
      ripples.length = rc;
      const ripCount = Math.min(rc, 6);
      for (let i = ripCount * 3; i < 18; i++) ripData[i] = 0;

      // ── Simulation pass ────────────────────────────────────────────────────
      const src = fbos[ping];
      const dst = fbos[1 - ping];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, cols, rows);
      gl.disable(gl.BLEND);
      gl.useProgram(simProg);
      gl.uniform2f(simU.mouse, smooth.x, smooth.y);
      gl.uniform1f(simU.mouseActive, mouseActiveFactor);
      gl.uniform1i(simU.rippleCount, ripCount);
      gl.uniform3fv(simU.ripples, ripData);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.bindVertexArray(simVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      ping = 1 - ping;

      // ── Render pass ────────────────────────────────────────────────────────
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(renderProg);
      gl.uniform1f(renderU.time, time);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbos[ping].tex);
      gl.bindVertexArray(renderVAO);
      gl.drawArrays(gl.POINTS, 0, cols * rows);
      gl.bindVertexArray(null);
    }

    if (reduce) {
      renderStatic();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    // Resize observer
    let roPending = false;
    const ro = new ResizeObserver(() => {
      if (!roPending) {
        roPending = true;
        requestAnimationFrame(() => {
          roPending = false;
          resize();
          if (reduce) renderStatic();
        });
      }
    });
    ro.observe(container);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
      gl.deleteProgram(simProg);
      gl.deleteProgram(renderProg);
      gl.deleteShader(simVS); gl.deleteShader(simFS);
      gl.deleteShader(renderVS); gl.deleteShader(renderFS);
      gl.deleteBuffer(quadBuf);
      gl.deleteVertexArray(simVAO);
      gl.deleteVertexArray(renderVAO);
      if (fbos) {
        gl.deleteFramebuffer(fbos[0].fb); gl.deleteTexture(fbos[0].tex);
        gl.deleteFramebuffer(fbos[1].fb); gl.deleteTexture(fbos[1].tex);
      }
    };
  }, [reduce]);

  if (webglFailed) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 landing2-dotgrid-fallback"
      />
    );
  }

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: "none", willChange: "transform" }}
      />
    </div>
  );
}
