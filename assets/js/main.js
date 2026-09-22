/* ==========================================================================
   ANA Office & Admin Consultant — motion layer
   GSAP 3 + ScrollTrigger (+ Lenis smooth scroll when available)
   Everything degrades: no GSAP / no JS / reduced-motion all render fine.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GS = window.gsap;
  var ST = window.ScrollTrigger;
  if (GS && ST) GS.registerPlugin(ST);
  var MOTION = !!(GS && ST) && !REDUCED;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- split */
  /* Wraps every word in <span><i>word</i></span> so it can be masked-revealed.
     Walks text nodes so inline tags inside a heading survive.               */
  function splitWords(el) {
    if (el.dataset.split) return $$('span > i', el);
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            var i = document.createElement('i');
            i.textContent = p;
            s.appendChild(i); frag.appendChild(s); out.push(i);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    el.dataset.split = '1';
    el.classList.add('swords');
    return out;
  }

  /* --------------------------------------------------------------- loader */
  /* Deliberately plain: mark, a hairline meter, out in about a second. */
  function loader(done) {
    var ld = $('#loader');
    if (!ld) { done(); return; }
    document.body.classList.add('is-locked');

    var finish = function () {
      ld.remove();
      document.body.classList.remove('is-locked');
      done();
    };
    if (!MOTION) { finish(); return; }

    GS.timeline({ onComplete: finish })
      .from($('.ld-in img', ld), { y: 10, opacity: 0, duration: .5, ease: 'power2.out' }, 0)
      .from($('.ld-word', ld), { opacity: 0, duration: .35, ease: 'none' }, .15)
      .to($('.ld-track i', ld), { width: '100%', duration: .8, ease: 'power2.inOut' }, .05)
      .to(ld, { opacity: 0, duration: .4, ease: 'power2.inOut' }, '+=.08');
  }

  /* --------------------------------------------------------------- cursor */
  function cursor() {
    if (!MOTION || window.matchMedia('(pointer: coarse)').matches) return;
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(ring);

    var x = GS.quickTo(ring, 'x', { duration: .4, ease: 'power3' });
    var y = GS.quickTo(ring, 'y', { duration: .4, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { x(e.clientX); y(e.clientY); }, { passive: true });

    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('a, button, .card, .svc__i, .vrow, .chip, input, select, textarea');
      document.body.classList.toggle('cur-hot', !!hot);
    });
  }

  /* ---------------------------------------------------- smooth scrolling */
  var lenis = null;
  function smooth() {
    if (!MOTION || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: .95 });
    lenis.on('scroll', ST.update);
    GS.ticker.add(function (t) { lenis.raf(t * 1000); });
    GS.ticker.lagSmoothing(0);
  }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -80 });
    else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }

  /* --------------------------------------------------- header / nav / bar */
  function shell() {
    var hdr = $('.hdr');
    var bar = $('.progress');
    var burger = $('.burger');
    var drawer = $('.drawer');
    var last = 0;

    function onScroll() {
      var y = window.scrollY || 0;
      if (hdr) {
        hdr.classList.toggle('is-stuck', y > 40);
        hdr.classList.toggle('is-hidden', y > 420 && y > last && !document.body.classList.contains('is-locked'));
      }
      if (bar) {
        var max = document.body.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (burger && drawer) {
      var open = false;
      var links = $$('.dl, .dsub a, .drawer__foot > *', drawer);
      var tl = null;
      if (MOTION) {
        tl = GS.timeline({ paused: true })
          .set(drawer, { visibility: 'visible' })
          .to(drawer, { clipPath: 'inset(0% 0% 0% 0%)', duration: .75, ease: 'expo.inOut' })
          .from(links, { yPercent: 115, opacity: 0, duration: .65, stagger: .045, ease: 'expo.out' }, '-=.4');
      }
      burger.addEventListener('click', function () {
        open = !open;
        burger.classList.toggle('is-on', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('is-locked', open);
        if (lenis) { open ? lenis.stop() : lenis.start(); }
        if (tl) { open ? tl.play() : tl.reverse(); }
        else {
          drawer.style.visibility = open ? 'visible' : 'hidden';
          drawer.style.clipPath = open ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)';
        }
      });
      $$('a', drawer).forEach(function (a) {
        a.addEventListener('click', function () { if (open) burger.click(); });
      });
    }

    /* in-page anchors go through the smooth scroller */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var t = $(id);
        if (!t) return;
        e.preventDefault();
        scrollToEl(t);
      });
    });
  }

  /* ------------------------------------------------------------- reveals */
  function reveals() {
    if (!MOTION) return;

    /* headline word masks */
    $$('[data-words]').forEach(function (el) {
      if (el.closest('.hero, .phead')) return;   /* intro() owns these */
      var words = splitWords(el);
      GS.set(words, { yPercent: 118, rotate: 2 });
      GS.to(words, {
        yPercent: 0, rotate: 0, duration: 1.05, ease: 'expo.out', stagger: .045,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* simple lifts */
    $$('.r-up').forEach(function (el) {
      GS.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'expo.out',
        delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        startAt: { y: 34 }
      });
    });
    $$('.r-fade').forEach(function (el) {
      GS.to(el, {
        opacity: 1, duration: 1.2, ease: 'power2.out',
        delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    /* staggered children */
    $$('.r-stagger').forEach(function (el) {
      GS.to(el.children, {
        opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .085,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        startAt: { y: 42 }
      });
    });
  }

  /* ------------------------------------------------------------ parallax */
  function parallax() {
    if (!MOTION) return;

    /* the blueprint plan-grid layers drift at three different depths */
    $$('.plan').forEach(function (plan) {
      var layers = $$('.plan__layer', plan);
      layers.forEach(function (l, i) {
        var depth = parseFloat(l.dataset.depth || (0.04 + i * 0.05));
        GS.fromTo(l, { yPercent: -depth * 100 }, {
          yPercent: depth * 100, ease: 'none',
          scrollTrigger: { trigger: plan.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    /* ambient orbs drift slower still */
    $$('.orb').forEach(function (o, i) {
      GS.fromTo(o, { yPercent: -14 - i * 5 }, {
        yPercent: 16 + i * 6, ease: 'none',
        scrollTrigger: { trigger: o.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* anything opted in: data-par="-0.2" (negative = moves up faster) */
    $$('[data-par]').forEach(function (el) {
      var amt = parseFloat(el.dataset.par) || -.15;
      GS.fromTo(el, { y: -amt * 120 }, {
        y: amt * 120, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* hero: a touch of pointer-driven depth, nothing more */
    var hero = $('.hero');
    if (hero && !window.matchMedia('(pointer: coarse)').matches) {
      var targets = $$('.hero [data-tilt]');
      if (targets.length) {
        var setters = targets.map(function (t) {
          return {
            x: GS.quickTo(t, 'x', { duration: .9, ease: 'power3' }),
            y: GS.quickTo(t, 'y', { duration: .9, ease: 'power3' }),
            k: parseFloat(t.dataset.tilt) || 10
          };
        });
        hero.addEventListener('mousemove', function (e) {
          var r = hero.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - .5;
          var ny = (e.clientY - r.top) / r.height - .5;
          setters.forEach(function (s) { s.x(nx * s.k); s.y(ny * s.k); });
        }, { passive: true });
      }
    }
  }

  /* ------------------------------------------------------------- marquee */
  /* Fill the viewport with the strip, then duplicate the whole thing exactly
     once. A -50% shift then lands precisely on the seam, which is what makes
     the loop invisible. Scroll velocity bends the speed; direction flips it. */
  function marquee() {
    $$('[data-marq]').forEach(function (wrap) {
      var track = $('.marq__t', wrap);
      if (!track) return;

      var base = track.innerHTML;
      var guard = 0;
      while (track.scrollWidth < wrap.offsetWidth + 240 && guard++ < 12) {
        track.innerHTML += base;
      }
      track.innerHTML += track.innerHTML;

      if (!MOTION) return;

      var reverse = wrap.dataset.marq === 'reverse';
      var span = track.scrollWidth / 2;
      var tween = GS.fromTo(track,
        { xPercent: reverse ? -50 : 0 },
        {
          xPercent: reverse ? 0 : -50,
          duration: Math.max(span / 70, 12),
          ease: 'none',
          repeat: -1
        });

      ST.create({
        trigger: wrap, start: 'top bottom', end: 'bottom top',
        onUpdate: function (self) {
          var boost = Math.min(Math.abs(self.getVelocity()) / 1000, 2.4);
          GS.to(tween, { timeScale: self.direction * (1 + boost), duration: .4, overwrite: true });
        }
      });
    });
  }

  /* ------------------------------------------------------------ counters */
  function counters() {
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      var prefix = el.dataset.prefix || '';
      var dec = parseInt(el.dataset.dec || 0, 10);
      if (!MOTION) { el.textContent = prefix + target.toFixed(dec) + suffix; return; }
      var o = { v: 0 };
      el.textContent = prefix + (0).toFixed(dec) + suffix;
      GS.to(o, {
        v: target, duration: 1.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = prefix + o.v.toFixed(dec) + suffix; }
      });
    });
  }

  /* -------------------------------------------------------------- images */
  /* A photo that is not in place yet becomes a designed frame, never a broken
     icon. Drop the file in at the path in the markup and it simply appears.   */
  function images() {
    var mark = function (img) {
      var frame = img.closest('.ph');
      if (frame) { frame.classList.add('is-empty'); img.remove(); }
    };
    $$('.ph img').forEach(function (img) {
      if (img.complete) {
        if (!img.naturalWidth) mark(img);
        return;
      }
      img.addEventListener('error', function () { mark(img); });
      img.addEventListener('load', function () { if (!img.naturalWidth) mark(img); });
    });
  }

  /* Slow drift inside a fixed frame — the calm version of a parallax photo. */
  function imageParallax() {
    if (!MOTION) return;
    $$('.ph[data-drift] img').forEach(function (img) {
      GS.fromTo(img, { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: img.closest('.ph'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ------------------------------------------------------------ timeline */
  function timeline() {
    var tl = $('.tl');
    if (!tl) return;
    var fill = $('.tl__spine i', tl);
    var items = $$('.tl__i', tl);
    if (!MOTION) { items.forEach(function (i) { i.classList.add('is-in'); }); if (fill) fill.style.transform = 'scaleY(1)'; return; }

    if (fill) {
      GS.to(fill, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top 72%', end: 'bottom 72%', scrub: .6 }
      });
    }
    items.forEach(function (it) {
      GS.fromTo(it, { x: 36, opacity: 0 }, {
        x: 0, opacity: 1, duration: 1, ease: 'expo.out',
        scrollTrigger: {
          trigger: it, start: 'top 80%', once: true,
          onEnter: function () { it.classList.add('is-in'); }
        }
      });
    });
  }

  /* ----------------------------------------------------------- accordion */
  function accordion() {
    $$('.acc__i').forEach(function (item) {
      var btn = $('.acc__b', item);
      var panel = $('.acc__p', item);
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        var h = open ? panel.firstElementChild.offsetHeight : 0;
        if (MOTION) GS.to(panel, { height: h, duration: .6, ease: 'expo.out', onComplete: function () { ST.refresh(); } });
        else panel.style.height = h + 'px';
      });
    });
  }

  /* ------------------------------------------------- ribbon divider draw */
  function ribbons() {
    $$('.ribbon-div path').forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      if (!MOTION) { p.style.strokeDashoffset = 0; return; }
      p.style.strokeDashoffset = len;
      GS.to(p, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: p.closest('.ribbon-div'), start: 'top 95%', end: 'bottom 35%', scrub: .7 }
      });
    });
  }

  /* --------------------------------------------------------- tier meters */
  function tierBars() {
    $$('.tier__bar i').forEach(function (b) {
      var w = (b.dataset.w || '50') + '%';
      if (!MOTION) { b.style.width = w; return; }
      GS.to(b, {
        width: w, duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: b.closest('.tier'), start: 'top 88%', once: true }
      });
    });
  }

  /* ------------------------------------------------------------ magnetic */
  function magnetic() {
    if (!MOTION || window.matchMedia('(pointer: coarse)').matches) return;
    $$('.btn, .burger').forEach(function (el) {
      var xT = GS.quickTo(el, 'x', { duration: .5, ease: 'power3' });
      var yT = GS.quickTo(el, 'y', { duration: .5, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xT((e.clientX - r.left - r.width / 2) * .3);
        yT((e.clientY - r.top - r.height / 2) * .45);
      });
      el.addEventListener('mouseleave', function () { xT(0); yT(0); });
    });
  }

  /* -------------------------------------------- optional real-logo swap */
  /* Drop the official artwork at assets/img/logo.png and it is picked up
     everywhere automatically — no markup edits needed.                    */
  function logoUpgrade() {
    var probe = new Image();
    probe.onload = function () {
      $$('img.brand__mark').forEach(function (img) { img.src = 'assets/img/logo.png'; });
    };
    probe.src = 'assets/img/logo.png';
  }

  /* ---------------------------------------------------------------- forms */
  function forms() {
    /* Quote form: the service sub-list depends on the category chosen. */
    var cat = $('#category');
    if (cat) {
      var groups = $$('[data-cat-group]');
      var sync = function () {
        groups.forEach(function (g) {
          var on = g.dataset.catGroup === cat.value;
          g.hidden = !on;
          $$('select, input', g).forEach(function (f) { f.disabled = !on; });
        });
        if (MOTION) ST.refresh();
      };
      cat.addEventListener('change', sync);
      sync();
    }

    /* Server-side validation feedback. The PHP endpoint answers 422 with
       {message, errors:{field:reason}}; paint those onto the matching fields. */
    function clearErrors(form) {
      $$('.fld.is-err', form).forEach(function (f) { f.classList.remove('is-err'); });
      $$('.fld__err', form).forEach(function (e) { e.remove(); });
      var sum = $('.form__err', form);
      if (sum) sum.remove();
    }

    function fieldFor(form, name) {
      var input = form.querySelector('[name="' + name + '"], [name="' + name + '[]"]');
      return input ? input.closest('.fld') : null;
    }

    function showErrors(form, errors, message) {
      var first = null;

      if (errors) {
        Object.keys(errors).forEach(function (name) {
          var fld = fieldFor(form, name);
          if (!fld) return;
          fld.classList.add('is-err');
          var msg = document.createElement('span');
          msg.className = 'fld__err';
          msg.setAttribute('role', 'alert');
          msg.textContent = errors[name];
          fld.appendChild(msg);
          if (!first) first = fld;
        });
      }

      if (message) {
        var sum = document.createElement('p');
        sum.className = 'form__err';
        sum.setAttribute('role', 'alert');
        sum.textContent = message;
        form.insertBefore(sum, form.firstChild);
        if (!first) first = sum;
      }

      if (first) {
        scrollToEl(first);
        var focusable = $('input, select, textarea', first);
        if (focusable) focusable.focus({ preventScroll: true });
      }
    }

    $$('form[data-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        var btn = $('button[type="submit"]', form);
        var ok = $('.form__ok', form.parentNode) || $('.form__ok');
        var endpoint = form.dataset.endpoint || '';
        var data = new FormData(form);

        var succeed = function () {
          form.style.display = 'none';
          if (ok) {
            ok.classList.add('is-on');
            if (MOTION) GS.from(ok, { y: 24, opacity: 0, duration: .8, ease: 'expo.out' });
            scrollToEl(ok);
          }
        };

        if (endpoint) {
          var label = btn ? $('span', btn).textContent : '';
          if (btn) { btn.disabled = true; $('span', btn).textContent = 'Sending…'; }
          clearErrors(form);

          fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
            .then(function (r) {
              return r.json()
                .catch(function () { return {}; })
                .then(function (j) { return { ok: r.ok, body: j }; });
            })
            .then(function (res) {
              if (res.ok) { succeed(); return; }
              if (btn) { btn.disabled = false; $('span', btn).textContent = label || 'Try again'; }
              showErrors(form, res.body.errors, res.body.message);
            })
            .catch(function () {
              if (btn) { btn.disabled = false; $('span', btn).textContent = label || 'Try again'; }
              showErrors(form, null,
                'We could not reach the server. Please email admin@anasupport.biz instead.');
            });
          return;
        }

        /* No backend wired yet: hand the enquiry to the visitor's mail client
           so the form is never a dead end. Swap in data-endpoint to change. */
        var lines = [];
        data.forEach(function (v, k) {
          if (typeof v === 'string' && v.trim()) lines.push(k.replace(/_/g, ' ') + ': ' + v);
        });
        var to = form.dataset.mailto || 'admin@anasupport.biz';
        var subj = form.dataset.subject || 'Website enquiry';
        window.location.href = 'mailto:' + to +
          '?subject=' + encodeURIComponent(subj) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        succeed();
      });
    });
  }

  /* ----------------------------------------------------------- intro page */
  function intro() {
    if (!MOTION) return;
    var hero = $('.hero') || $('.phead');
    if (!hero) return;
    var tl = GS.timeline({ defaults: { ease: 'expo.out' } });

    var h = $('h1[data-words]', hero);
    if (h) {
      var words = splitWords(h);
      GS.set(words, { yPercent: 115 });
      tl.to(words, { yPercent: 0, duration: 1, stagger: .045 }, .05);
    }
    tl.from($$('.crumb, .hero .eyebrow, .phead .eyebrow', hero), { y: 14, opacity: 0, duration: .7 }, 0)
      .from($$('.hero > .wrap .lead, .phead .lead', hero), { y: 20, opacity: 0, duration: .8 }, .35)
      .from($$('.hero__cta > *', hero), { y: 16, opacity: 0, duration: .7, stagger: .07 }, .48)
      .from($$('.hero__stats div', hero), { y: 16, opacity: 0, duration: .7, stagger: .06 }, .58)
      .from($$('.hero__art'), { y: 34, opacity: 0, duration: 1.1 }, .2)
      .from($$('.hero__chip'), { y: 18, opacity: 0, duration: .8 }, .8)
      .from($$('.hdr__in > *'), { y: -14, opacity: 0, duration: .6, stagger: .07, clearProps: 'transform' }, .1);
  }

  /* ------------------------------------------------------------- kickoff */
  function boot() {
    smooth();
    cursor();
    shell();
    reveals();
    parallax();
    marquee();
    counters();
    images();
    imageParallax();
    timeline();
    accordion();
    ribbons();
    tierBars();
    magnetic();
    forms();
    logoUpgrade();

    if (MOTION) {
      ST.refresh();
      window.addEventListener('load', function () { ST.refresh(); });
      var t;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () { ST.refresh(); }, 220);
      });
    }
    intro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { images(); loader(boot); });
  } else {
    images();
    loader(boot);
  }
})();
