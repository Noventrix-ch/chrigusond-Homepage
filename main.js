import * as THREE from "three";

/* Kontaktadresse für das Formular (mailto-Fallback ohne Backend).
   TODO: echte Adresse von chrigusound eintragen. */
const CONTACT_EMAIL = "info@chrigusound.ch";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) document.documentElement.classList.add("no-motion");

/* =========================================================
   Three.js: Klangfeld im Hero
   Ein Partikel-Teppich aus überlagerten Sinuswellen, wie eine
   Klanglandschaft unter dem Titel. Reagiert dezent auf die Maus,
   pausiert ausserhalb des Viewports.
   ========================================================= */
function initSoundfield() {
  const canvas = document.getElementById("soundfield");
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf7f5ef, 0.055);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.set(0, 2.1, 9.5);
  camera.lookAt(0, 0.4, 0);

  const isMobile = window.innerWidth < 768;
  const COLS = isMobile ? 90 : 150;
  const ROWS = isMobile ? 48 : 70;
  const SPREAD_X = 30;
  const SPREAD_Z = 16;

  const count = COLS * ROWS;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(0xb9c2ab);
  const glow = new THREE.Color(0xc07c2e);

  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      positions[i * 3] = (c / (COLS - 1) - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (r / (ROWS - 1) - 0.5) * SPREAD_Z;
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.position.y = -1.4;
  scene.add(points);

  /* Wellenfunktion: zwei laufende Wellen plus ein "Waveform"-Puls
     entlang der Mitte, wie ein ruhiger Equalizer. */
  const tmp = new THREE.Color();
  function updateWave(t) {
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    let j = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = pos[j * 3];
        const z = pos[j * 3 + 2];
        const centerFade = Math.exp(-(z * z) / 30);
        const y =
          Math.sin(x * 0.55 + t * 0.8) * 0.35 +
          Math.sin(x * 0.22 - t * 0.45 + z * 0.35) * 0.45 +
          Math.sin(z * 0.8 + t * 0.6) * 0.18 +
          Math.sin(x * 1.7 + t * 2.0) * 0.10 * centerFade;
        pos[j * 3 + 1] = y;

        const h = THREE.MathUtils.clamp((y + 0.9) / 1.9, 0, 1);
        tmp.copy(base).lerp(glow, h * h);
        col[j * 3] = tmp.r;
        col[j * 3 + 1] = tmp.g;
        col[j * 3 + 2] = tmp.b;
        j++;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* Maus-Parallaxe (sanft nachgeführt) */
  let targetX = 0;
  let targetY = 0;
  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* Nur rendern, wenn der Hero sichtbar ist */
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; },
    { threshold: 0.01 }).observe(canvas);

  const clock = new THREE.Clock();
  let smX = 0;
  let smY = 0;

  if (reduceMotion) {
    updateWave(1.5);
    renderer.render(scene, camera);
    return;
  }

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    smX += (targetX - smX) * 0.04;
    smY += (targetY - smY) * 0.04;
    camera.position.x = smX * 0.7;
    camera.position.y = 2.1 - smY * 0.3;
    camera.lookAt(0, 0.4, 0);
    updateWave(t);
    renderer.render(scene, camera);
  });

  /* Scroll-Parallaxe: Feld sinkt beim Scrollen weg (Übergang zum Inhalt) */
  gsap.to(points.position, {
    y: -3.2,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

/* =========================================================
   GSAP: Intro und Scroll-Reveals
   ========================================================= */
function initMotion() {
  gsap.registerPlugin(ScrollTrigger);

  /* Nav-Zustand beim Scrollen */
  ScrollTrigger.create({
    start: 40,
    onToggle: (self) => document.getElementById("nav").classList.toggle("is-scrolled", self.isActive),
  });

  if (reduceMotion) return;

  /* Hero-Intro: Titelzeilen steigen aus der Maske, dann Subtext und CTAs */
  const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
  intro
    .from(".line__inner", { yPercent: 110, duration: 1.1, stagger: 0.12 }, 0.15)
    .from(".hero__sub", { opacity: 0, y: 24, duration: 0.9 }, 0.7)
    .from(".hero__actions", { opacity: 0, y: 24, duration: 0.9 }, 0.85)
    .from(".nav", { opacity: 0, y: -16, duration: 0.8 }, 0.9);

  /* Sektions-Reveals: Inhalte treten gestaffelt ein, sobald sie
     in den Viewport kommen (Hierarchie und Lesefluss) */
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}

/* =========================================================
   Mobile-Menü
   ========================================================= */
function initMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  if (!burger || !menu) return;

  function setOpen(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
    menu.hidden = !open;
  }
  burger.addEventListener("click", () => setOpen(menu.hidden));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
}

/* =========================================================
   Kontaktformular: validieren, mailto zusammenbauen
   ========================================================= */
function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fields = [
      { el: document.getElementById("f-name"), check: (v) => v.trim().length > 1 },
      { el: document.getElementById("f-email"), check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
      { el: document.getElementById("f-msg"), check: (v) => v.trim().length > 5 },
    ];

    let valid = true;
    fields.forEach(({ el, check }) => {
      const wrap = el.closest(".field");
      const error = wrap.querySelector(".field__error");
      const ok = check(el.value);
      wrap.classList.toggle("has-error", !ok);
      if (error) error.hidden = ok;
      if (!ok) valid = false;
    });
    if (!valid) return;

    const name = document.getElementById("f-name").value.trim();
    const email = document.getElementById("f-email").value.trim();
    const anlass = document.getElementById("f-anlass").value;
    const datum = document.getElementById("f-datum").value;
    const msg = document.getElementById("f-msg").value.trim();

    const subject = `Anfrage ${anlass}${datum ? " am " + datum : ""}`;
    const body = [
      `Name: ${name}`,
      `E-Mail: ${email}`,
      `Anlass: ${anlass}`,
      datum ? `Datum: ${datum}` : null,
      "",
      msg,
    ].filter(Boolean).join("\n");

    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById("sentNote").hidden = false;
  });
}

initMotion();
initSoundfield();
initMenu();
initForm();
