if (!store("abra.theme")) {
  Theme.mode = "light";
  Theme.apply();
}

const Story = {
  current: null,
  init() {
    this.steps = [...document.querySelectorAll(".step")];
    this.screen = document.getElementById("screen");
    this.stage = document.querySelector(".story-stage");
    if (!this.steps.length || !this.screen) return;
    this.narrow = matchMedia("(max-width: 900px)");
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        this.update();
      });
    };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    this.update();
  },
  focusY() {
    const h = innerHeight;
    if (!this.narrow.matches) return h * 0.5;
    const b = Math.max(0, this.stage.getBoundingClientRect().bottom);
    return b + (h - b) * 0.4;
  },
  update() {
    const y = this.focusY();
    let best = this.steps[0];
    let dist = Infinity;
    for (const s of this.steps) {
      const r = s.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    if (best !== this.current) this.set(best);
  },
  set(step) {
    this.current = step;
    this.steps.forEach(s => s.classList.toggle("active", s === step));
    this.screen.dataset.scene = step.dataset.scene;
    Demo.scene(step.dataset.scene);
  }
};

const Demo = {
  modes: ["music", "timer", "download"],
  lines: ["m.ly1", "m.ly2", "m.ly3", "m.ly4", "m.ly5"],
  line: 0,
  tm: [],
  sq: [],
  init() {
    this.screen = document.getElementById("screen");
    if (!this.screen) return;
    this.visor = document.getElementById("visor");
    this.lyrics = this.screen.querySelector(".v-lyrics");
    this.calm = reduceMotion.matches;
    this.started = Date.now();
    this.visor.addEventListener("click", () => this.manual());
    this.deck();
    this.panel();
    this.clock();
    this.release();
    this.lyric(0);
    this.timer();
    setInterval(() => this.timer(), 1000);
    document.addEventListener("abra:lang", () => {
      this.lyric(this.line);
      this.calendar();
      this.release();
      this.timer();
    });
    const box = document.getElementById("latest-release");
    if (box) new MutationObserver(() => this.release()).observe(box, { childList: true });
  },
  wait(list, fn, ms) {
    list.push(setTimeout(fn, ms));
  },
  clear(list) {
    list.forEach(clearTimeout);
    list.length = 0;
  },
  scene(name) {
    this.clear(this.tm);
    this.clear(this.sq);
    this.mode("idle");
    this.resetSearch();
    if (name === "visor") this.autoplay(0);
    if (name === "search") this.type();
  },
  mode(m) {
    this.visor.dataset.mode = m;
  },
  autoplay(i) {
    if (this.calm) {
      this.mode("music");
      return;
    }
    const kind = this.modes[i % this.modes.length];
    const next = () => this.autoplay(i + 1);
    if (kind === "download") {
      this.mode("idle");
      const rel = typeof Releases !== "undefined" ? Releases.latest() : null;
      const exe = rel && Releases.exe(rel);
      Site.visor.download(exe ? exe.name : "ABRA-Setup.exe", exe ? fmt.size(exe.size) : "");
      this.wait(this.tm, next, 5600);
      return;
    }
    this.mode(kind);
    if (kind === "music") this.rotate();
    this.wait(this.tm, next, kind === "music" ? 4600 : 3400);
  },
  rotate() {
    this.wait(this.tm, () => {
      if (this.visor.dataset.mode !== "music") return;
      this.lyric(this.line + 1);
      this.rotate();
    }, 1500);
  },
  manual() {
    if (this.visor.classList.contains("is-dl")) return;
    this.clear(this.tm);
    const order = ["idle", "music", "timer"];
    const next = order[(order.indexOf(this.visor.dataset.mode) + 1) % order.length];
    this.mode(next);
    if (next === "music") this.rotate();
  },
  lyric(i) {
    const n = this.lines.length;
    this.line = ((i % n) + n) % n;
    const at = k => I18n.t(this.lines[(this.line + k + n) % n]);
    const set = (key, text) => {
      const el = this.lyrics.querySelector('[data-ly="' + key + '"]');
      if (el) el.textContent = text;
    };
    set("prev", at(-1));
    set("cur", at(0));
    set("next", at(1));
    this.lyrics.classList.remove("tick");
    void this.lyrics.offsetWidth;
    this.lyrics.classList.add("tick");
  },
  timer() {
    const total = 25 * 60;
    const left = total - 4 - Math.floor((Date.now() - this.started) / 1000) % total;
    const mm = String(Math.floor(left / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    const t = this.screen.querySelector("[data-timer]");
    const b = this.screen.querySelector("[data-timer-bar]");
    if (t) t.textContent = mm + (I18n.lang === "id" ? "." : ":") + ss;
    if (b) b.style.width = ((total - left) / total * 100).toFixed(1) + "%";
  },
  deck() {
    const deck = this.screen.querySelector(".m-deck");
    const tiles = [...deck.querySelectorAll(".mt")];
    if (!finePointer.matches) return;
    deck.addEventListener("pointermove", e => {
      deck.classList.add("hov");
      tiles.forEach(t => {
        const r = t.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const k = Math.max(0, 1 - d / (r.width * 2.6));
        t.style.setProperty("--s", (1 + 0.5 * k * k).toFixed(3));
      });
    });
    deck.addEventListener("pointerleave", () => {
      deck.classList.remove("hov");
      tiles.forEach(t => t.style.setProperty("--s", 1));
    });
  },
  panel() {
    const dark = this.screen.querySelector("[data-dark-toggle]");
    this.screen.querySelectorAll(".qp-t").forEach(b => {
      if (b === dark) return;
      b.addEventListener("click", () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")));
    });
    const sync = () => dark.setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "dark"));
    dark.addEventListener("click", () => Theme.set(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    this.screen.querySelectorAll(".qp-s input").forEach(r => {
      const paint = () => r.style.setProperty("--v", r.value + "%");
      r.addEventListener("input", paint);
      paint();
    });
  },
  resetSearch() {
    const s = this.screen.querySelector(".m-search");
    const q = this.screen.querySelector("[data-typed]");
    s.classList.remove("done");
    s.querySelector(".ms-bar").classList.remove("typing");
    q.textContent = "";
  },
  type() {
    const s = this.screen.querySelector(".m-search");
    const bar = s.querySelector(".ms-bar");
    const q = s.querySelector("[data-typed]");
    const text = "24 × 18";
    if (this.calm) {
      bar.classList.add("typing");
      q.textContent = text;
      s.classList.add("done");
      return;
    }
    const run = () => {
      this.resetSearch();
      this.wait(this.sq, () => {
        bar.classList.add("typing");
        [...text].forEach((ch, i) => this.wait(this.sq, () => { q.textContent = text.slice(0, i + 1); }, i * 150));
        this.wait(this.sq, () => s.classList.add("done"), text.length * 150 + 250);
        this.wait(this.sq, run, text.length * 150 + 4800);
      }, 700);
    };
    run();
  },
  clock() {
    const ticks = this.screen.querySelector("[data-clock-ticks]");
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i * 6 * Math.PI) / 180;
      const r = major ? 37 : 41;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (50 + r * Math.sin(a)).toFixed(2));
      line.setAttribute("y1", (50 - r * Math.cos(a)).toFixed(2));
      line.setAttribute("x2", (50 + 44 * Math.sin(a)).toFixed(2));
      line.setAttribute("y2", (50 - 44 * Math.cos(a)).toFixed(2));
      if (major) line.setAttribute("class", "major");
      ticks.append(line);
    }
    this.hands = {};
    this.screen.querySelectorAll("[data-hand]").forEach(el => { this.hands[el.dataset.hand] = el; });
    this.day = "";
    const tick = () => {
      const now = new Date();
      const s = now.getSeconds();
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      this.hands.s.style.transform = "rotate(" + s * 6 + "deg)";
      this.hands.m.style.transform = "rotate(" + (m * 6).toFixed(2) + "deg)";
      this.hands.h.style.transform = "rotate(" + (h * 30).toFixed(2) + "deg)";
      if (now.toDateString() !== this.day) {
        this.day = now.toDateString();
        this.calendar();
      }
    };
    tick();
    setInterval(tick, 1000);
  },
  calendar() {
    const month = this.screen.querySelector("[data-cal-month]");
    const day = this.screen.querySelector("[data-cal-day]");
    const wd = this.screen.querySelector("[data-cal-wd]");
    const grid = this.screen.querySelector("[data-cal-grid]");
    const now = new Date();
    const loc = I18n.locale();
    const first = I18n.lang === "id" ? 1 : 0;
    month.textContent = new Intl.DateTimeFormat(loc, { month: "long" }).format(now);
    day.textContent = String(now.getDate());
    wd.textContent = new Intl.DateTimeFormat(loc, { weekday: "long" }).format(now);
    const names = new Intl.DateTimeFormat(loc, { weekday: "narrow" });
    const back = (now.getDay() - first + 7) % 7;
    const cells = [];
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + i);
      cells.push(["wd", names.format(d)]);
      week.push([i === back ? "today" : "", String(d.getDate())]);
    }
    grid.replaceChildren(...cells.concat(week).map(([cls, text]) => {
      const el = document.createElement("span");
      if (cls) el.className = cls;
      el.textContent = text;
      return el;
    }));
  },
  release() {
    if (typeof Releases === "undefined") return;
    const rel = Releases.latest();
    const ver = this.screen.querySelector("[data-rel-ver]");
    const date = this.screen.querySelector("[data-rel-date]");
    if (ver) ver.textContent = rel ? "v" + Releases.version(rel) : "ABRA";
    if (date) date.textContent = rel ? fmt.date(rel.date) : "";
  }
};

Demo.init();
Story.init();
