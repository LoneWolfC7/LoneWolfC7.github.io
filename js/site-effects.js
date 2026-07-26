(function () {
  "use strict";

  if (window.__siteEffectsInitialized) return;
  window.__siteEffectsInitialized = true;

  const TENCENT_LOCATION_URL = "https://apis.map.qq.com/ws/location/v1/ip";
  const TENCENT_LOCATION_KEY = "Z2ABZ-SKCWW-VVNR2-YCFGT-NSOL6-YUB7Y";
  const LOCATION_CACHE_KEY = "site-effects:tencent-location:v1";
  const CAT_IMAGE = "/img/cat-neko.png";
  const HOME_LOCATION = { lng: 113.34499552, lat: 23.15537143 };

  const nationMessages = {
    日本: "よろしく，一起去看樱花吗",
    美国: "Let us live in peace!",
    英国: "想同你一起夜乘伦敦眼",
    俄罗斯: "干了这瓶伏特加！",
    法国: "C'est La Vie",
    德国: "Die Zeit verging im Fluge.",
    澳大利亚: "一起去大堡礁吧！",
    加拿大: "拾起一片枫叶赠予你"
  };

  const provinceMessages = {
    北京市: "北——京——欢迎你~~~",
    天津市: "讲段相声吧。",
    河北省: "山势巍巍成壁垒，天下雄关。铁马金戈由此向，无限江山。",
    山西省: "展开坐具长三尺，已占山河五百余。",
    内蒙古自治区: "天苍苍，野茫茫，风吹草低见牛羊。",
    辽宁省: "我想吃烤鸡架！",
    吉林省: "状元阁就是东北烧烤之王。",
    黑龙江省: "很喜欢哈尔滨大剧院。",
    上海市: "众所周知，中国只有两个城市。",
    浙江省: "东风渐绿西湖柳，雁已还人未南归。",
    安徽省: "蚌埠住了，芜湖起飞。",
    福建省: "井邑白云间，岩城远带山。",
    江西省: "落霞与孤鹜齐飞，秋水共长天一色。",
    山东省: "遥望齐州九点烟，一泓海水杯中泻。",
    湖北省: "来碗热干面！",
    湖南省: "74751，长沙斯塔克。",
    广东省: "老板来两斤福建人。",
    广西壮族自治区: "桂林山水甲天下。",
    海南省: "朝观日出逐白浪，夕看云起收霞光。",
    四川省: "康康川妹子。",
    贵州省: "茅台，学生，再塞200。",
    云南省: "玉龙飞舞云缠绕，万仞冰川直耸天。",
    西藏自治区: "躺在茫茫草原上，仰望蓝天。",
    陕西省: "来份臊子面加馍。",
    甘肃省: "羌笛何须怨杨柳，春风不度玉门关。",
    青海省: "牛肉干和老酸奶都好好吃。",
    宁夏回族自治区: "大漠孤烟直，长河落日圆。",
    新疆维吾尔自治区: "驼铃古道丝绸路，胡马犹闻唐汉风。",
    台湾省: "我在这头，大陆在那头。",
    香港特别行政区: "永定贼有残留地鬼嚎，迎击光非岁玉。",
    澳门特别行政区: "性感荷官，在线发牌。"
  };

  const state = {
    canvas: null,
    context: null,
    stars: [],
    starWidth: 0,
    starHeight: 0,
    starsStartedAt: 0,
    wasDark: false,
    cursor: null,
    cursorCurrent: null,
    cursorPrevious: null,
    rope: null,
    cat: null,
    scrollDirty: true,
    resizeDirty: true,
    frameQueued: false,
    emojiImage: null,
    emojiTimer: 0,
    titleTimer: 0,
    baseTitle: document.title,
    locationPromise: null
  };

  function ensureUniqueElement(id, tagName, parent) {
    const matches = Array.from(document.querySelectorAll(`#${id}`));
    const expectedTag = tagName.toLowerCase();
    let element = matches.find(item => item.localName === expectedTag) || null;

    for (const match of matches) {
      if (match !== element) match.remove();
    }

    if (!element) {
      element = document.createElement(tagName);
      element.id = id;
    }

    if (!element.isConnected) parent.appendChild(element);
    return element;
  }

  function ensureCursorStyle() {
    const id = "site-effects-cursor-style";
    const matches = Array.from(document.querySelectorAll(`#${id}`));
    let style = matches.find(item => item.localName === "style") || null;

    for (const match of matches) {
      if (match !== style) match.remove();
    }

    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.textContent =
        '* { cursor: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 8 8\' width=\'8\' height=\'8\'%3E%3Ccircle cx=\'4\' cy=\'4\' r=\'4\' fill=\'rgb(57%2C197%2C187)\'/%3E%3C/svg%3E") 4 4, auto; }';
      document.head.appendChild(style);
    }
  }

  function ensureEffectElements() {
    const body = document.body;
    if (!body) return;

    state.canvas = ensureUniqueElement("universe", "canvas", body);
    state.canvas.setAttribute("aria-hidden", "true");

    state.rope = ensureUniqueElement("myscoll", "div", body);
    state.rope.setAttribute("role", "button");
    state.rope.setAttribute("tabindex", "0");
    state.rope.setAttribute("aria-label", "返回页面顶部");

    state.cat = ensureUniqueElement("neko1", "div", body);
    for (const duplicate of document.querySelectorAll(".neko")) {
      if (duplicate !== state.cat) duplicate.remove();
    }
    state.cat.className = "neko";
    state.cat.dataset.msg = "你好~喵";
    state.cat.setAttribute("role", "button");
    state.cat.setAttribute("tabindex", "0");
    state.cat.setAttribute("aria-label", "返回页面顶部");

    state.cursor = ensureUniqueElement("cursor", "div", body);
    state.cursor.classList.toggle("hidden", !state.cursorCurrent);
    state.cursor.setAttribute("aria-hidden", "true");

    const owo = ensureUniqueElement("owo-big", "div", body);
    owo.setAttribute("aria-hidden", "true");

    ensureCursorStyle();
  }

  function chance(percent) {
    return Math.floor(Math.random() * 1000) + 1 < 10 * percent;
  }

  function between(min, max) {
    return Math.random() * (max - min) + min;
  }

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      const speed = 0.05;
      this.giant = chance(3);
      this.comet = !this.giant && performance.now() - state.starsStartedAt > 50 && chance(10);
      this.x = between(0, Math.max(1, state.starWidth - 10));
      this.y = between(0, Math.max(1, state.starHeight));
      this.radius = between(1.1, 2.6);
      this.dx = between(speed, 6 * speed) + (this.comet ? speed * between(50, 120) : 0) + 2 * speed;
      this.dy = -between(speed, 6 * speed) - (this.comet ? speed * between(50, 120) : 0);
      this.fadingOut = false;
      this.fadingIn = true;
      this.opacity = 0;
      this.opacityThreshold = between(0.2, 1 - (this.comet ? 0.4 : 0));
      this.opacityDelta = between(0.0005, 0.002) + (this.comet ? 0.001 : 0);
    }

    update() {
      this.x += this.dx;
      this.y += this.dy;

      if (this.fadingIn) {
        this.opacity += this.opacityDelta;
        if (this.opacity > this.opacityThreshold) this.fadingIn = false;
      }

      if (this.x > state.starWidth - state.starWidth / 4 || this.y < 0) this.fadingOut = true;

      if (this.fadingOut) {
        this.opacity -= this.opacityDelta / 2;
        if (this.opacity < 0 || this.x > state.starWidth || this.y < 0) this.reset();
      }
    }

    draw(context) {
      context.beginPath();

      if (this.giant) {
        context.fillStyle = `rgba(180,184,240,${this.opacity})`;
        context.arc(this.x, this.y, 2, 0, Math.PI * 2, false);
      } else if (this.comet) {
        context.fillStyle = `rgba(226,225,224,${this.opacity})`;
        context.arc(this.x, this.y, 1.5, 0, Math.PI * 2, false);
        context.fill();

        for (let tail = 0; tail < 30; tail += 1) {
          context.fillStyle = `rgba(226,225,224,${Math.max(0, this.opacity - (this.opacity / 20) * tail)})`;
          context.fillRect(this.x - (this.dx / 4) * tail, this.y - (this.dy / 4) * tail - 2, 2, 2);
        }
      } else {
        context.fillStyle = `rgba(226,225,142,${this.opacity})`;
        context.rect(this.x, this.y, this.radius, this.radius);
      }

      context.closePath();
      context.fill();
    }
  }

  function resizeUniverse() {
    if (!state.canvas) return;

    state.starWidth = window.innerWidth;
    state.starHeight = window.innerHeight;
    state.canvas.width = state.starWidth;
    state.canvas.height = state.starHeight;
    state.context = state.canvas.getContext("2d");

    const starCount = Math.max(1, Math.floor(0.216 * state.starWidth));
    state.stars = Array.from({ length: starCount }, () => new Star());
  }

  function drawUniverse() {
    if (!state.context) return false;

    const dark = document.documentElement.dataset.theme === "dark";
    if (!dark || document.hidden) {
      if (state.wasDark || state.resizeDirty) {
        state.context.clearRect(0, 0, state.starWidth, state.starHeight);
      }
      state.wasDark = false;
      return false;
    }

    state.context.clearRect(0, 0, state.starWidth, state.starHeight);
    for (const star of state.stars) {
      star.update();
      star.draw(state.context);
    }
    state.wasDark = true;
    return true;
  }

  function getScrollInfo() {
    const root = document.documentElement;
    const body = document.body;
    const scrollTop = root.scrollTop || window.pageYOffset || 0;
    const documentHeight = Math.max(
      body ? body.scrollHeight : 0,
      root.scrollHeight,
      body ? body.offsetHeight : 0,
      root.offsetHeight,
      body ? body.clientHeight : 0,
      root.clientHeight
    );
    const scrollable = Math.max(0, documentHeight - root.clientHeight);
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;
    return { scrollTop, scrollable, ratio };
  }

  function updateReadPercent(info) {
    const button = document.getElementById("go-up");
    if (!button) return;

    const icon = button.querySelector("i");
    const percent = button.querySelector("#percent") || button.querySelector("span");
    if (!percent) return;

    const result = Math.round(info.ratio * 100);
    if (result <= 95) {
      if (icon) icon.style.display = "none";
      percent.style.display = "block";
      percent.textContent = String(result);
    } else {
      percent.style.display = "none";
      if (icon) icon.style.display = "block";
    }
  }

  function updateCat(info) {
    if (!state.rope || !state.cat) return;

    const desktop = document.body.clientWidth > 992;
    if (!desktop) {
      state.rope.style.display = "none";
      state.cat.style.display = "none";
      return;
    }

    const ropeHeight = info.ratio * 0.9 * window.innerHeight;
    Object.assign(state.rope.style, {
      display: "block",
      position: "fixed",
      width: "8px",
      top: "0",
      height: `${ropeHeight}px`,
      zIndex: "100",
      backgroundColor: "#1e90ff",
      borderRadius: "2em",
      right: "100px",
      backgroundImage:
        "-webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.1) 75%, transparent 75%, transparent)",
      backgroundSize: "contain"
    });

    Object.assign(state.cat.style, {
      display: info.scrollTop > 0.001 ? "block" : "none",
      position: "fixed",
      top: `${ropeHeight - 50}px`,
      zIndex: "1000",
      right: "100px",
      backgroundImage: `url("${CAT_IMAGE}")`
    });

    state.cat.classList.toggle("showMsg", info.scrollable > 0 && info.scrollTop >= info.scrollable - 1);
  }

  function updateScrollEffects() {
    const info = getScrollInfo();
    updateReadPercent(info);
    updateCat(info);
  }

  function updateCursor() {
    if (!state.cursor || !state.cursorCurrent) return false;

    if (!state.cursorPrevious) {
      state.cursorPrevious = { ...state.cursorCurrent };
    } else {
      state.cursorPrevious.x += (state.cursorCurrent.x - state.cursorPrevious.x) * 0.15;
      state.cursorPrevious.y += (state.cursorCurrent.y - state.cursorPrevious.y) * 0.15;
    }

    const settled =
      Math.abs(state.cursorCurrent.x - state.cursorPrevious.x) < 0.5 &&
      Math.abs(state.cursorCurrent.y - state.cursorPrevious.y) < 0.5;
    if (settled) {
      state.cursorPrevious.x = state.cursorCurrent.x;
      state.cursorPrevious.y = state.cursorCurrent.y;
    }

    state.cursor.style.left = `${state.cursorPrevious.x}px`;
    state.cursor.style.top = `${state.cursorPrevious.y}px`;
    return !settled;
  }

  // The frame loop only runs while something is actually animating (dark-mode
  // starfield, cursor catch-up, or a pending scroll/resize update). When
  // everything is settled it stops entirely instead of burning CPU at 60 fps.
  function scheduleFrame() {
    if (state.frameQueued) return;
    state.frameQueued = true;
    window.requestAnimationFrame(animationFrame);
  }

  function animationFrame() {
    state.frameQueued = false;

    if (state.resizeDirty) {
      resizeUniverse();
      state.resizeDirty = false;
      state.scrollDirty = true;
    }

    if (state.scrollDirty) {
      updateScrollEffects();
      state.scrollDirty = false;
    }

    const starsActive = drawUniverse();
    const cursorActive = updateCursor();
    if (starsActive || cursorActive || state.resizeDirty || state.scrollDirty) {
      scheduleFrame();
    }
  }

  function isPointerTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest("a, button, summary, label, [role='button'], input, select, textarea")) return true;

    try {
      return window.getComputedStyle(target).cursor === "pointer";
    } catch (_error) {
      return false;
    }
  }

  function isEmojiImage(target) {
    if (!(target instanceof Element)) return null;
    const image = target.closest("img");
    if (!image) return null;
    return image.closest(".OwO-body") || image.matches(".tk-owo-emotion") ? image : null;
  }

  function hideEmojiPreview() {
    window.clearTimeout(state.emojiTimer);
    state.emojiTimer = 0;
    state.emojiImage = null;
    const preview = document.getElementById("owo-big");
    if (preview) {
      preview.style.display = "none";
      preview.replaceChildren();
    }
  }

  function showEmojiPreview(image) {
    if (!image.isConnected || state.emojiImage !== image) return;

    const preview = document.getElementById("owo-big");
    if (!preview) return;

    const rect = image.getBoundingClientRect();
    const width = rect.width * 3;
    const height = rect.height * 3;
    let left = rect.left - (width - rect.width) / 2;

    if (left + width > document.body.clientWidth) {
      left -= left + width - document.body.clientWidth + 10;
    }
    if (left < 0) left = 10;

    const clone = document.createElement("img");
    clone.src = image.currentSrc || image.src;
    clone.alt = "";
    preview.replaceChildren(clone);
    Object.assign(preview.style, {
      display: "flex",
      height: `${height}px`,
      width: `${width}px`,
      left: `${left}px`,
      top: `${rect.top}px`
    });
  }

  function scrollToTop() {
    if (window.btf && typeof window.btf.scrollToDest === "function") {
      window.btf.scrollToDest(0, 500);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function onPointerOver(event) {
    if (state.cursor) state.cursor.classList.toggle("hover", isPointerTarget(event.target));

    const image = isEmojiImage(event.target);
    if (!image || image === state.emojiImage) return;

    hideEmojiPreview();
    state.emojiImage = image;
    state.emojiTimer = window.setTimeout(() => showEmojiPreview(image), 300);
  }

  function onPointerOut(event) {
    if (state.cursor) state.cursor.classList.toggle("hover", isPointerTarget(event.relatedTarget));

    const image = isEmojiImage(event.target);
    const remainsInside = event.relatedTarget instanceof Node && image && image.contains(event.relatedTarget);
    if (image && event.relatedTarget !== image && !remainsInside) hideEmojiPreview();
  }

  function onVisibilityChange() {
    window.clearTimeout(state.titleTimer);
    if (document.hidden) {
      document.title = "👀跑哪里去了~";
    } else {
      document.title = "🐖抓到你啦～";
      state.titleTimer = window.setTimeout(() => {
        document.title = state.baseTitle;
      }, 2000);
      scheduleFrame();
    }
  }

  function getDistance(lng1, lat1, lng2, lat2) {
    const toPoint = (lng, lat) => {
      const longitude = (lng * Math.PI) / 180;
      const latitude = (lat * Math.PI) / 180;
      return {
        x: Math.cos(latitude) * Math.cos(longitude),
        y: Math.cos(latitude) * Math.sin(longitude),
        z: Math.sin(latitude)
      };
    };

    const first = toPoint(lng1, lat1);
    const second = toPoint(lng2, lat2);
    const chord = Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
    return Math.round(Math.asin(Math.min(1, chord / 2)) * 2 * 6371);
  }

  function getChinaMessage(province, city) {
    if (province === "江苏省") {
      if (city === "南京市") return "这是我挺想去的城市啦。";
      if (city === "苏州市") return "上有天堂，下有苏杭。";
      return "散装是必须要散装的。";
    }

    if (province === "河南省") {
      const cityMessages = {
        郑州市: "豫州之域，天地之中。",
        南阳市: "臣本布衣，躬耕于南阳。此南阳非彼南阳！",
        驻马店市: "峰峰有奇石，石石挟仙气。嵖岈山的花很美哦！",
        开封市: "刚正不阿包青天。",
        洛阳市: "洛阳牡丹甲天下。"
      };
      return cityMessages[city] || "可否带我品尝河南烩面啦？";
    }

    return provinceMessages[province] || "带我去你的城市逛逛吧！";
  }

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { accent: "上午好", suffix: "，一日之计在于晨！" };
    if (hour >= 11 && hour < 13) return { accent: "中午好", suffix: "，该摸鱼吃午饭了。" };
    if (hour >= 13 && hour < 15) return { accent: "下午好", suffix: "，懒懒地睡个午觉吧！" };
    if (hour >= 15 && hour < 16) return { accent: "三点几啦", suffix: "，一起饮茶呀！" };
    if (hour >= 16 && hour < 19) return { accent: "夕阳无限好！", suffix: "" };
    if (hour >= 19 && hour < 24) return { accent: "晚上好", suffix: "，夜生活嗨起来！" };
    return { accent: "", suffix: "夜深了，早点休息，少熬夜。" };
  }

  function appendTimeGreeting(parent) {
    const greeting = getTimeGreeting();
    if (greeting.accent) {
      const span = document.createElement("span");
      span.textContent = greeting.accent;
      parent.appendChild(span);
    }
    parent.appendChild(document.createTextNode(greeting.suffix));
  }

  function appendThemeSpan(parent, value) {
    const span = document.createElement("span");
    span.style.color = "var(--theme-color)";
    span.textContent = value;
    parent.appendChild(span);
  }

  function createWelcomeHeading(parent) {
    const heading = document.createElement("center");
    heading.textContent = "🎉 欢迎信息 🎉";
    parent.appendChild(heading);
  }

  function renderWelcomeFallback() {
    const welcome = document.getElementById("welcome-info");
    if (!welcome) return;

    const strong = document.createElement("b");
    createWelcomeHeading(strong);
    strong.appendChild(document.createTextNode("  "));
    appendTimeGreeting(strong);
    strong.appendChild(document.createTextNode("欢迎来到本站，愿你浏览愉快。"));
    welcome.replaceChildren(strong);
  }

  function renderWelcome(response) {
    const welcome = document.getElementById("welcome-info");
    if (!welcome) return;

    const result = response && response.result;
    const location = result && result.location;
    const address = result && result.ad_info;
    if (!location || !address) {
      renderWelcomeFallback();
      return;
    }

    const nation = address.nation || "未知地区";
    const isChina = nation === "中国";
    const position = isChina
      ? [address.province, address.city, address.district].filter(Boolean).join(" ") || nation
      : nation;
    const message = isChina
      ? getChinaMessage(address.province, address.city)
      : nationMessages[nation] || "带我去你的国家逛逛吧。";
    const distance = getDistance(HOME_LOCATION.lng, HOME_LOCATION.lat, Number(location.lng), Number(location.lat));
    const rawIp = isChina ? result.ip : "";
    const ip = rawIp ? (rawIp.includes(":") ? "太复杂啦，咱看不懂~(ipv6)" : rawIp) : "未知";

    const strong = document.createElement("b");
    createWelcomeHeading(strong);
    strong.appendChild(document.createTextNode("  欢迎来自 "));
    appendThemeSpan(strong, position);
    strong.appendChild(document.createTextNode(" 的小伙伴，"));
    appendTimeGreeting(strong);
    strong.appendChild(document.createTextNode("您现在距离站长约 "));
    appendThemeSpan(strong, Number.isFinite(distance) ? String(distance) : "未知");
    strong.appendChild(document.createTextNode(" 公里，当前的IP地址为： "));
    appendThemeSpan(strong, ip);
    strong.appendChild(document.createTextNode(`， ${message}`));
    welcome.replaceChildren(strong);
  }

  function readLocationCache() {
    try {
      const raw = window.sessionStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return undefined;
      const cached = JSON.parse(raw);
      return cached && cached.ok ? cached.data : null;
    } catch (_error) {
      return undefined;
    }
  }

  function writeLocationCache(data) {
    try {
      window.sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data ? { ok: true, data } : { ok: false }));
    } catch (_error) {
      // Storage can be unavailable in privacy modes; the in-memory promise still prevents duplicate requests.
    }
  }

  function requestTencentLocation() {
    return new Promise(resolve => {
      const callbackName = "__siteEffectsTencentLocation";
      const script = document.createElement("script");
      let settled = false;
      let timeout = 0;

      const finish = response => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        script.remove();
        script.onerror = null;
        window[callbackName] = function () {};

        const valid = response && Number(response.status) === 0 && response.result && response.result.location;
        const data = valid ? response : null;
        writeLocationCache(data);
        resolve(data);
      };

      window[callbackName] = finish;
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.src = `${TENCENT_LOCATION_URL}?key=${encodeURIComponent(TENCENT_LOCATION_KEY)}&output=jsonp&callback=${callbackName}`;
      script.onerror = () => finish(null);
      timeout = window.setTimeout(() => finish(null), 8000);
      document.head.appendChild(script);
    });
  }

  function getLocation() {
    const cached = readLocationCache();
    if (cached !== undefined) return Promise.resolve(cached);
    if (!state.locationPromise) state.locationPromise = requestTencentLocation();
    return state.locationPromise;
  }

  function refreshWelcome() {
    if (!document.getElementById("welcome-info")) return;
    getLocation().then(response => {
      if (response) renderWelcome(response);
      else renderWelcomeFallback();
    });
  }

  function refreshPage() {
    hideEmojiPreview();
    ensureEffectElements();
    if (document.title !== "👀跑哪里去了~" && document.title !== "🐖抓到你啦～") {
      state.baseTitle = document.title;
    }
    state.resizeDirty = true;
    state.scrollDirty = true;
    scheduleFrame();
    refreshWelcome();
  }

  function bindEvents() {
    window.addEventListener("resize", () => {
      state.resizeDirty = true;
      scheduleFrame();
    }, { passive: true });

    window.addEventListener("scroll", () => {
      state.scrollDirty = true;
      scheduleFrame();
    }, { passive: true });

    // Restart the starfield when the theme flips to dark (and clear it once
    // when it flips back to light).
    new MutationObserver(scheduleFrame).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    document.addEventListener("pjax:complete", refreshPage);
    document.addEventListener("copy", () => {
      if (window.btf && typeof window.btf.snackbarShow === "function") {
        window.btf.snackbarShow("复制成功🍬 若要转载请保留原文链接哦！");
      }
    });
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("contextmenu", event => {
      if (document.body.clientWidth <= 768 && isEmojiImage(event.target)) event.preventDefault();
    });
    document.addEventListener("mousemove", event => {
      const next = { x: event.clientX - 8, y: event.clientY - 8 };
      if (!state.cursorCurrent && state.cursor) {
        state.cursor.style.left = `${next.x}px`;
        state.cursor.style.top = `${next.y}px`;
      }
      state.cursorCurrent = next;
      if (state.cursor) state.cursor.classList.remove("hidden");
      scheduleFrame();
    }, { passive: true });
    document.addEventListener("mouseenter", () => {
      if (state.cursor) state.cursor.classList.remove("hidden");
    }, true);
    document.addEventListener("mouseleave", () => {
      if (state.cursor) state.cursor.classList.add("hidden");
    }, true);
    document.addEventListener("mousedown", () => {
      if (state.cursor) state.cursor.classList.add("active");
    });
    document.addEventListener("mouseup", () => {
      if (state.cursor) state.cursor.classList.remove("active");
    });
    document.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("#myscoll, #neko1")) scrollToTop();
    });
    document.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target instanceof Element && event.target.closest("#myscoll, #neko1")) {
        event.preventDefault();
        scrollToTop();
      }
    });
  }

  function initialize() {
    state.starsStartedAt = performance.now();
    ensureEffectElements();
    bindEvents();
    refreshPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
