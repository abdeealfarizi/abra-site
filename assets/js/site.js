const ACCENTS = [
  ["Blue", "#0A84FF"],
  ["Purple", "#AF52DE"],
  ["Pink", "#FF375F"],
  ["Red", "#FF453A"],
  ["Orange", "#FF950A"],
  ["Yellow", "#FFCC00"],
  ["Green", "#30D158"],
  ["Graphite", "#8E8E93"]
];

const ICONS = "assets/img/icons.svg";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

function icon(name) {
  return `<svg class="ic" aria-hidden="true"><use href="${ICONS}#i-${name}"/></svg>`;
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) {}
  return null;
}

const Theme = {
  mode: "auto",
  media: matchMedia("(prefers-color-scheme: dark)"),
  init() {
    const saved = store("abra.theme");
    this.mode = ["auto", "light", "dark"].includes(saved) ? saved : "auto";
    this.media.addEventListener("change", () => this.apply());
    document.querySelectorAll("[data-theme-cycle]").forEach(b => b.addEventListener("click", () => this.cycle()));
    document.querySelectorAll("[data-theme-set]").forEach(b => b.addEventListener("click", () => this.set(b.dataset.themeSet)));
    this.apply();
  },
  cycle() {
    const order = ["auto", "light", "dark"];
    this.set(order[(order.indexOf(this.mode) + 1) % order.length]);
  },
  set(mode) {
    this.mode = mode;
    store("abra.theme", mode);
    this.apply();
  },
  apply() {
    const dark = this.mode === "dark" || (this.mode === "auto" && this.media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const ic = { auto: "auto", light: "sun", dark: "moon" }[this.mode];
    document.querySelectorAll("[data-theme-cycle]").forEach(b => {
      b.innerHTML = icon(ic);
      b.setAttribute("aria-label", I18n.t("nav.theme") + ": " + I18n.t("look." + this.mode));
    });
    document.querySelectorAll("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === this.mode)));
  }
};

const Accent = {
  index: 0,
  init() {
    const saved = parseInt(store("abra.accent"), 10);
    this.index = saved >= 0 && saved < ACCENTS.length ? saved : 0;
    document.querySelectorAll("[data-swatches]").forEach(box => {
      ACCENTS.forEach(([name, hex], i) => {
        const b = document.createElement("button");
        b.className = "swatch";
        b.type = "button";
        b.style.setProperty("--c", hex);
        b.title = name;
        b.setAttribute("aria-label", name);
        b.addEventListener("click", () => this.set(i));
        box.append(b);
      });
    });
    this.apply();
  },
  set(i) {
    this.index = i;
    store("abra.accent", String(i));
    this.apply();
  },
  apply() {
    const hex = ACCENTS[this.index][1];
    const rgb = [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16));
    const lum = rgb.map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    const root = document.documentElement.style;
    root.setProperty("--accent", hex);
    root.setProperty("--accent-rgb", rgb.join(", "));
    root.setProperty("--on-accent", L > 0.4 ? "#18181c" : "#ffffff");
    document.querySelectorAll("[data-swatches] .swatch").forEach((b, i) => b.setAttribute("aria-pressed", String(i === this.index)));
  }
};

const Lang = {
  init() {
    document.querySelectorAll("[data-lang-toggle]").forEach(b => b.addEventListener("click", () => I18n.set(I18n.lang === "en" ? "id" : "en")));
    document.addEventListener("abra:lang", () => this.paint());
    this.paint();
  },
  paint() {
    document.querySelectorAll("[data-lang-toggle]").forEach(b => {
      b.innerHTML = icon("globe") + `<span>${I18n.lang.toUpperCase()}</span>`;
      b.setAttribute("aria-label", I18n.t("nav.lang"));
      b.title = I18n.t("nav.lang");
    });
    Theme.apply();
    Clock.tick(true);
  }
};

const Clock = {
  last: "",
  init() {
    this.el = document.querySelector("[data-clock]");
    if (!this.el) return;
    this.tick(true);
    setInterval(() => this.tick(), 1000);
  },
  tick(force) {
    if (!this.el) return;
    const now = new Date();
    const loc = I18n.locale();
    const wd = new Intl.DateTimeFormat(loc, { weekday: "short" }).format(now).replace(".", "");
    const mo = new Intl.DateTimeFormat(loc, { month: "short" }).format(now).replace(".", "");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const sep = I18n.lang === "id" ? "." : ":";
    const text = I18n.lang === "id"
      ? `${wd} ${now.getDate()} ${mo}  ${hh}${sep}${mm}`
      : `${wd} ${mo} ${now.getDate()}  ${hh}${sep}${mm}`;
    if (force || text !== this.last) {
      this.last = text;
      this.el.textContent = text;
      this.el.dateTime = now.toISOString();
    }
  }
};

const Visor = {
  timers: [],
  init() {
    this.el = document.getElementById("visor");
    if (!this.el) return;
    this.idle = this.el.querySelector("[data-visor-idle]");
    this.name = this.el.querySelector("[data-visor-name]");
    this.status = this.el.querySelector("[data-visor-status]");
    this.size = this.el.querySelector("[data-visor-size]");
    this.version = null;
    document.addEventListener("abra:lang", () => this.paintIdle());
    document.addEventListener("click", e => {
      const a = e.target.closest("a[data-dl]");
      if (a && a.dataset.file) this.download(a.dataset.file, a.dataset.size || "");
    });
    this.paintIdle();
  },
  setVersion(v) {
    this.version = v;
    this.paintIdle();
  },
  paintIdle() {
    if (!this.idle) return;
    this.idle.textContent = this.version ? I18n.t("visor.idle", { v: this.version }) : I18n.t("visor.idleNoVer");
  },
  download(file, size) {
    this.timers.forEach(clearTimeout);
    this.el.classList.remove("is-dl");
    void this.el.offsetWidth;
    this.name.textContent = file;
    this.size.textContent = size;
    this.status.textContent = I18n.t("visor.dl");
    this.el.classList.add("is-dl");
    this.timers = [
      setTimeout(() => { this.status.textContent = I18n.t("visor.done"); }, 1900),
      setTimeout(() => this.el.classList.remove("is-dl"), 5200)
    ];
  }
};

const Deck = {
  init() {
    this.el = document.querySelector(".deck");
    if (!this.el) return;
    this.links = [...this.el.querySelectorAll("a")];
    this.el.addEventListener("mousemove", e => this.magnify(e.clientX));
    this.el.addEventListener("mouseleave", () => this.links.forEach(a => a.style.setProperty("--s", 1)));
    const targets = this.links
      .map(a => {
        const h = a.getAttribute("href") || "";
        const id = h.includes("#") ? h.split("#")[1] : "";
        const sec = id && document.getElementById(id);
        return sec && sec !== document.body ? [sec, a.closest("li")] : null;
      })
      .filter(Boolean);
    if (!targets.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const pair = targets.find(([s]) => s === en.target);
        if (pair) pair[1].classList.toggle("active", en.isIntersecting);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    targets.forEach(([s]) => io.observe(s));
  },
  magnify(x) {
    if (reduceMotion.matches || !finePointer.matches || innerWidth <= 720) return;
    this.links.forEach(a => {
      const r = a.getBoundingClientRect();
      const d = Math.abs(x - (r.left + r.width / 2));
      const k = Math.max(0, 1 - d / 150);
      a.style.setProperty("--s", (1 + 0.42 * k * k).toFixed(3));
    });
  }
};

const Reveal = {
  init() {
    if (!("IntersectionObserver" in window)) {
      document.documentElement.classList.remove("js");
      return;
    }
    this.io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        this.io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(el => this.observe(el));
  },
  observe(el) {
    const sib = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("reveal")) : [];
    el.style.setProperty("--d", Math.min(sib.indexOf(el), 10) * 22 + "ms");
    if (this.io) this.io.observe(el);
    else el.classList.add("in");
  }
};

const Site = { icon, observe: el => Reveal.observe(el), visor: Visor };

I18n.init();
Theme.init();
Accent.init();
Lang.init();
Clock.init();
Visor.init();
Deck.init();
Reveal.init();
