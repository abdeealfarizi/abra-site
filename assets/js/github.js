const ABRA_REPO = "abdeealfarizi/abra";
const ABRA_GH = `https://github.com/${ABRA_REPO}`;
const CACHE_KEY = "abra.releases.v1";
const CACHE_MS = 10 * 60 * 1000;

const Releases = {
  data: null,
  failed: false,
  async load() {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.t < CACHE_MS && Array.isArray(c.d)) return (this.data = c.d);
    } catch (e) {}
    const r = await fetch(`https://api.github.com/repos/${ABRA_REPO}/releases?per_page=50`, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!r.ok) throw new Error("GitHub API " + r.status);
    const raw = await r.json();
    const d = raw
      .filter(x => !x.draft)
      .map(x => ({
        tag: x.tag_name,
        name: x.name,
        body: x.body || "",
        url: x.html_url,
        date: x.published_at,
        pre: !!x.prerelease,
        assets: (x.assets || []).map(a => ({
          name: a.name,
          size: a.size,
          count: a.download_count,
          url: a.browser_download_url
        }))
      }));
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
    return (this.data = d);
  },
  latest() {
    if (!this.data) return null;
    return this.data.find(r => !r.pre) || this.data[0] || null;
  },
  version(rel) { return rel.tag.replace(/^v/i, ""); },
  exe(rel) { return rel.assets.find(a => /setup.*\.exe$/i.test(a.name)) || rel.assets.find(a => /\.exe$/i.test(a.name)); },
  zip(rel) { return rel.assets.find(a => /\.zip$/i.test(a.name)); },
  total() {
    return (this.data || []).reduce((n, r) => n + r.assets.reduce((m, a) => m + (a.count || 0), 0), 0);
  }
};

const fmt = {
  size(bytes) {
    const nf = new Intl.NumberFormat(I18n.locale(), { maximumFractionDigits: 1, minimumFractionDigits: bytes >= 1048576 ? 1 : 0 });
    return bytes >= 1048576 ? nf.format(bytes / 1048576) + " MB" : nf.format(Math.max(1, Math.round(bytes / 1024))) + " KB";
  },
  num(n) { return new Intl.NumberFormat(I18n.locale()).format(n); },
  date(iso) {
    if (!iso) return "";
    return new Intl.DateTimeFormat(I18n.locale(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  }
};

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function renderMarkdown(md) {
  const box = h("div", "prose");
  if (window.marked && window.DOMPurify) {
    const html = DOMPurify.sanitize(marked.parse(md, { gfm: true, breaks: true }));
    box.innerHTML = html;
    box.querySelectorAll("a[href]").forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
  } else {
    md.split(/\n{2,}/).forEach(p => box.append(h("p", null, p.replace(/[#*_`>]/g, "").trim())));
  }
  return box;
}

function assetLink(a) {
  const kind = /\.exe$/i.test(a.name) ? "exe" : /\.zip$/i.test(a.name) ? "zip" : "file";
  const link = h("a", "asset");
  link.href = a.url;
  link.rel = "noopener";
  if (kind !== "file") {
    link.dataset.dl = kind;
    link.dataset.file = a.name;
    link.dataset.size = fmt.size(a.size);
  }
  link.innerHTML = Site.icon(kind === "exe" ? "windows" : kind === "zip" ? "zip" : "download");
  const text = h("span");
  text.append(
    h("b", null, I18n.t(kind === "exe" ? "rel.installer" : kind === "zip" ? "rel.portable" : "rel.file") + " · " + fmt.size(a.size)),
    h("small", null, a.name + " · " + I18n.t("rel.downloads", { n: fmt.num(a.count || 0) }))
  );
  link.append(text);
  return link;
}

function releaseCard(rel, isLatest) {
  const card = h("article", "rel reveal");
  card.id = rel.tag;
  const meta = h("div", "rel-meta");
  const head = h("div", "rel-head");
  const title = h("h3");
  const a = h("a", null, rel.name || "ABRA " + Releases.version(rel));
  a.href = rel.url;
  a.target = "_blank";
  a.rel = "noopener";
  title.append(a);
  head.append(title);
  if (isLatest) head.append(h("span", "badge", I18n.t("rel.latest")));
  if (rel.pre) head.append(h("span", "badge pre", I18n.t("rel.pre")));
  const date = h("time", "rel-date", fmt.date(rel.date));
  if (rel.date) date.dateTime = rel.date;
  head.append(date);
  meta.append(head);
  if (rel.assets.length) {
    const row = h("div", "rel-assets");
    rel.assets
      .slice()
      .sort((x, y) => (/\.exe$/i.test(y.name) ? 1 : 0) - (/\.exe$/i.test(x.name) ? 1 : 0))
      .forEach(asset => row.append(assetLink(asset)));
    meta.append(row);
  }
  card.append(meta, renderMarkdown(rel.body));
  return card;
}

function failCard() {
  const box = h("div", "rel-fail");
  box.append(h("p", null, I18n.t("rel.fail")));
  const a = h("a", "btn btn-ghost");
  a.href = ABRA_GH + "/releases";
  a.target = "_blank";
  a.rel = "noopener";
  a.innerHTML = Site.icon("github");
  a.append(h("span", null, I18n.t("rel.onGithub")));
  box.append(a);
  return box;
}

const Download = {
  paint() {
    const rel = Releases.latest();
    const exe = rel && Releases.exe(rel);
    const zip = rel && Releases.zip(rel);
    document.querySelectorAll('a[data-dl="exe"][data-main]').forEach(a => {
      a.href = exe ? exe.url : ABRA_GH + "/releases/latest";
      if (exe) {
        a.dataset.file = exe.name;
        a.dataset.size = fmt.size(exe.size);
      }
    });
    document.querySelectorAll("[data-dl-sub]").forEach(el => {
      el.textContent = exe ? I18n.t("dl.sub", { v: Releases.version(rel), size: fmt.size(exe.size) }) : I18n.t("dl.subDefault");
    });
    document.querySelectorAll('a[data-dl="zip"][data-main]').forEach(a => {
      a.href = zip ? zip.url : ABRA_GH + "/releases/latest";
      const label = a.querySelector("span");
      if (zip) {
        a.dataset.file = zip.name;
        a.dataset.size = fmt.size(zip.size);
      }
      if (label) label.textContent = zip ? I18n.t("dl.portableSize", { size: fmt.size(zip.size) }) : I18n.t("dl.portable");
    });
    if (rel) Site.visor.setVersion(Releases.version(rel));
    document.querySelectorAll("[data-total]").forEach(el => {
      const n = Releases.total();
      el.hidden = !n;
      const label = el.querySelector("span");
      if (label) label.textContent = I18n.t("rel.total", { n: fmt.num(n) });
    });
  }
};

const ReleaseViews = {
  render() {
    const latestBox = document.getElementById("latest-release");
    const listBox = document.getElementById("release-list");
    if (latestBox) {
      latestBox.replaceChildren();
      const rel = Releases.latest();
      if (rel) {
        const card = releaseCard(rel, true);
        latestBox.append(card);
        Site.observe(card);
      } else if (Releases.failed) latestBox.append(failCard());
    }
    if (listBox) {
      listBox.replaceChildren();
      const latest = Releases.latest();
      if (Releases.data && Releases.data.length) {
        Releases.data.forEach(rel => {
          const card = releaseCard(rel, rel === latest);
          listBox.append(card);
          Site.observe(card);
        });
        if (location.hash && !this.scrolled) {
          this.scrolled = true;
          const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (target) target.scrollIntoView();
        }
      } else if (Releases.failed) listBox.append(failCard());
    }
  }
};

function paintAll() {
  Download.paint();
  ReleaseViews.render();
}

document.addEventListener("abra:lang", () => {
  if (Releases.data || Releases.failed) paintAll();
  else Download.paint();
});

Download.paint();
Releases.load()
  .catch(() => { Releases.failed = true; })
  .finally(paintAll);
