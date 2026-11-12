/**
 * Motion system (GSAP + ScrollTrigger + SplitText).
 *
 * Everything here is progressive enhancement: the page is fully readable
 * without it, and nothing runs under `prefers-reduced-motion: reduce`.
 * The `motion` class on <html> tells the CSS that GSAP has taken over the
 * initial "hidden" state of `.reveal` elements (see Layout.astro).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, ctx: ParentNode = document) =>
  Array.from(ctx.querySelectorAll<T>(sel));

/* ---------- text scramble ("decrypt"), used on small mono labels ---------- */
const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&01';
function scramble(el: HTMLElement, duration = 0.8) {
  const final = el.dataset.text || el.textContent || '';
  el.dataset.text = final;
  const state = { p: 0 };
  gsap.to(state, {
    p: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += ch === ' ' || state.p >= 0.25 + 0.75 * (i / final.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => { el.textContent = final; },
  });
}

function init() {
  /* ---------- generic reveals, batched so siblings stagger together ---------- */
  const reveals = $$('.reveal');
  // `rv-wait` switches the element's own CSS transitions off while GSAP drives it
  reveals.forEach((el) => el.classList.add('rv-wait'));
  gsap.set(reveals, { opacity: 0, y: 28 });
  root.classList.add('motion');

  ScrollTrigger.batch(reveals, {
    start: 'top 92%',
    once: true,
    onEnter: (els) => {
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.95,
        ease: 'expo.out',
        stagger: 0.07,
        overwrite: true,
        // hand the element back to CSS (hover transforms, transitions)
        clearProps: 'opacity,transform',
        onComplete: () => els.forEach((el) => el.classList.remove('rv-wait')),
      });
      els.forEach((el) => {
        const file = (el as HTMLElement).querySelector<HTMLElement>('.sh-file, .c-file');
        if (file) scramble(file);
      });
    },
  });

  /* ---------- section headings: masked per-character rise + rule draw ---------- */
  $$('.sh').forEach((sh) => {
    const title = sh.querySelector<HTMLElement>('.sh-title');
    const line = sh.querySelector<HTMLElement>('.sh-line');
    if (!title) return;
    const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines', linesClass: 'sh-l', charsClass: 'sh-c' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: sh, start: 'top 86%', once: true } });
    tl.from(split.chars, { yPercent: 115, rotate: 6, duration: 0.9, ease: 'expo.out', stagger: 0.028 }, 0);
    if (line) tl.from(line, { scaleX: 0, transformOrigin: '0 50%', duration: 1.3, ease: 'expo.out' }, 0.1);
  });

  /* ---------- count-up figures ---------- */
  $$('[data-count]').forEach((el) => {
    const m = (el.dataset.count || '').match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = parseInt(m[1], 10);
    const suffix = m[2];
    const state = { v: 0 };
    el.textContent = `0${suffix}`;
    gsap.to(state, {
      v: target,
      duration: 1.8,
      ease: 'power3.out',
      snap: { v: 1 },
      onUpdate: () => { el.textContent = `${state.v}${suffix}`; },
      scrollTrigger: { trigger: el, start: 'top 94%', once: true },
    });
  });

  /* ---------- hero: scroll parallax + pointer tilt on the photo ---------- */
  const hero = document.querySelector<HTMLElement>('.hero');
  if (hero) {
    const avatar = hero.querySelector<HTMLElement>('.avatar');
    const term = hero.querySelector<HTMLElement>('.term');
    const net = hero.querySelector<HTMLElement>('.net');
    const mm = gsap.matchMedia();

    mm.add('(min-width: 981px)', () => {
      const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 };
      if (avatar) gsap.to(avatar, { '--py': '-70px', ease: 'none', scrollTrigger: st });
      if (term) gsap.to(term, { y: 46, ease: 'none', scrollTrigger: st });
    });
    if (net) gsap.to(net, { opacity: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

    // tilt: only the custom properties change here, the CSS transition does the easing
    if (avatar && finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = avatar.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        avatar.style.setProperty('--ry', `${gsap.utils.clamp(-9, 9, dx * 16)}deg`);
        avatar.style.setProperty('--rx', `${gsap.utils.clamp(-9, 9, -dy * 16)}deg`);
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        avatar.style.setProperty('--ry', '0deg');
        avatar.style.setProperty('--rx', '0deg');
      });
    }
  }

  /* ---------- marquee: speed and direction follow the scroll velocity ---------- */
  const track = document.querySelector<HTMLElement>('.marquee-track');
  if (track) {
    const loop = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
    loop.totalTime(42 * 40); // head-room so the loop can also run backwards
    const speed = { v: 1 };
    const apply = () => loop.timeScale(speed.v);
    let hovering = false;
    ScrollTrigger.create({
      trigger: track,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        if (hovering) return;
        const boost = gsap.utils.clamp(-7, 7, self.getVelocity() / 260);
        gsap.killTweensOf(speed);
        speed.v = boost >= 0 ? 1 + boost : boost - 1;
        apply();
        gsap.to(speed, { v: boost >= 0 ? 1 : -1, duration: 1.1, ease: 'power2.out', onUpdate: apply });
      },
    });
    const marquee = track.parentElement!;
    // only tick while on screen, so the GSAP ticker can sleep the rest of the time
    loop.pause();
    new IntersectionObserver(([e]) => loop.paused(!e.isIntersecting)).observe(marquee);
    marquee.addEventListener('pointerenter', () => { hovering = true; gsap.killTweensOf(speed); gsap.to(speed, { v: 0, duration: 0.5, onUpdate: apply }); });
    marquee.addEventListener('pointerleave', () => { hovering = false; gsap.to(speed, { v: 1, duration: 0.5, onUpdate: apply }); });
  }

  /* ---------- experience: the two git lanes are drawn by the scroll ---------- */
  const log = document.querySelector<HTMLElement>('.log');
  if (log) {
    gsap.fromTo(log, { '--draw': 0 }, {
      '--draw': 1,
      ease: 'none',
      scrollTrigger: { trigger: log, start: 'top 72%', end: 'bottom 72%', scrub: 0.5 },
    });
    $$('.commit .node', log).forEach((node) => {
      node.classList.add('rv-wait');
      gsap.from(node, {
        scale: 0,
        duration: 0.6,
        ease: 'back.out(3)',
        clearProps: 'transform',
        onComplete: () => node.classList.remove('rv-wait'),
        scrollTrigger: { trigger: node, start: 'top 72%', once: true },
      });
    });
  }

  /* ---------- contact: the dimmed heading lights up as it scrolls in ---------- */
  const heading = document.querySelector<HTMLElement>('.c-heading');
  if (heading) {
    gsap.fromTo(heading, { '--fill': '0%' }, {
      '--fill': '100%',
      ease: 'none',
      scrollTrigger: { trigger: heading, start: 'top 90%', end: 'top 40%', scrub: 0.5 },
    });
  }

  /* ---------- pointer niceties ---------- */
  if (finePointer) {
    // magnetic buttons
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.28);
        yTo((e.clientY - r.top - r.height / 2) * 0.38);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // ambient glow that trails the cursor
    const glow = document.getElementById('cursor-glow');
    if (glow) {
      const gx = gsap.quickTo(glow, 'x', { duration: 0.7, ease: 'power3' });
      const gy = gsap.quickTo(glow, 'y', { duration: 0.7, ease: 'power3' });
      window.addEventListener('pointermove', (e) => { gx(e.clientX); gy(e.clientY); glow.classList.add('on'); }, { passive: true });
      document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    }
  }

  // web fonts change text metrics: re-measure once they are in
  // A full refresh snaps the scroll position and would cut a native smooth scroll
  // (anchor links, command palette) short, so it waits until scrolling has settled.
  let scrolling = false;
  let pending = false;
  let timer = 0;
  window.addEventListener('scroll', () => {
    scrolling = true;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      scrolling = false;
      if (pending) { pending = false; ScrollTrigger.refresh(); }
    }, 180);
  }, { passive: true });
  document.fonts?.ready.then(() => { if (scrolling) pending = true; else ScrollTrigger.refresh(); });
}

// Boot right away (module scripts already run after parsing): ScrollTrigger's own
// initial refresh then happens around `load`, before anyone can start a smooth scroll.
if (reduced) {
  root.classList.add('motion');
} else {
  ScrollTrigger.config({ ignoreMobileResize: true });
  init();
}
