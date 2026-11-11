(function () {
  const BOTTLE_ML = 575;
  const GOAL_ML = 3000;
  const SHOWN_BOTTLES = 5;
  const RED_MAX = 10;
  const SLOT_COUNT = 10;
  const STORAGE_KEY = "water-monster";
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const WIDTH = 384;
  const HEIGHT = 224;

  const canvas = document.querySelector("#scene");
  const sceneWrap = document.querySelector(".scene-wrap");
  const sceneStatus = document.querySelector("#scene-status");
  const sleepNote = document.querySelector("#sleep-note");
  const heatLabel = document.querySelector("#heat-label");
  const heatFill = document.querySelector("#heat-fill");
  const live = document.querySelector("#live");
  const addButton = document.querySelector("#add");
  const addLabel = document.querySelector("#add-label");
  const undoButton = document.querySelector("#undo");
  const resetButton = document.querySelector("#reset");
  const dateLabel = document.querySelector("#date-label");
  const mlTotal = document.querySelector("#ml-total");
  const progress = document.querySelector("#progress");
  const barFill = document.querySelector("#bar-fill");
  const remain = document.querySelector("#remain");
  const progressPercent = document.querySelector("#progress-percent");
  const bottleCount = document.querySelector("#bottle-count");
  const bottleGrid = document.querySelector("#bottle-grid");
  const bottleLabel = document.querySelector("#bottle-label");
  const mileFive = document.querySelector("#mile-five");
  const mileTen = document.querySelector("#mile-ten");
  const stepCharge = document.querySelector("#step-charge");
  const stepAwake = document.querySelector("#step-awake");
  const stepRage = document.querySelector("#step-rage");
  const stepFinalRange = document.querySelector("#step-final-range");
  const stepFinalTitle = document.querySelector("#step-final-title");
  const stepFinalCopy = document.querySelector("#step-final-copy");
  const weekTotal = document.querySelector("#week-total");
  const chart = document.querySelector("#chart");
  const todayLog = document.querySelector("#today-log");
  const logCount = document.querySelector("#log-count");

  const scene = {
    bottles: 0,
    phase: "idle",
    heat: 0,
    asleep: false,
    crackA: 0,
    crackB: 0,
    targetA: 0,
    targetB: 0,
    fallA: 0,
    fallB: 0,
  };
  let drinking = false;

  const skyline = [
    [0, 127, 22, 43, "a"],
    [25, 119, 19, 51, "a"],
    [47, 136, 18, 34, "a"],
    [69, 108, 22, 62, "a"],
    [95, 129, 24, 41, "a"],
    [122, 118, 18, 52, "a"],
    [218, 132, 18, 38, "b"],
    [239, 116, 24, 54, "b"],
    [267, 126, 20, 44, "b"],
    [291, 103, 21, 67, "b"],
    [315, 121, 28, 49, "b"],
    [347, 111, 21, 59, "b"],
    [371, 132, 14, 38, "b"],
  ];

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { days: {} };
      const data = JSON.parse(raw);
      if (!data || typeof data.days !== "object" || data.days === null) return { days: {} };
      const days = {};
      for (const [key, value] of Object.entries(data.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        const ml = Number(value);
        if (!Number.isFinite(ml) || ml < 0) continue;
        days[key] = Math.round(ml);
      }
      return { days };
    } catch {
      return { days: {} };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayMl(state) {
    return state.days[dateKey(new Date())] || 0;
  }

  function bottlesFrom(ml) {
    return Math.round(ml / BOTTLE_ML);
  }

  function bottleSvg(filled) {
    const glass = filled ? "#c7e985" : "#e9ece4";
    const edge = filled ? "#47673f" : "#c9cec5";
    const cap = filled ? "#486b49" : "#b7c1b3";
    const water = filled ? "#93c66b" : "#dce2d7";
    return (
      '<svg viewBox="0 0 27 48" aria-hidden="true">' +
      `<path d="M9 1h9v7h3v5h4v30h-3v4H5v-4H2V13h4V8h3V1Z" fill="${glass}" stroke="${edge}" stroke-width="2"></path>` +
      `<path d="M9 2h9v6H9z" fill="${cap}"></path>` +
      `<path d="M6 23h15v12H6z" fill="${water}"></path>` +
      '<path d="M7 14h3v7H7z" fill="white" fill-opacity=".75"></path></svg>'
    );
  }

  function renderBottles(bottles) {
    bottleGrid.replaceChildren();
    const shown = Math.min(bottles, SLOT_COUNT);
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      const slot = document.createElement("div");
      slot.className = index < shown ? "bottle-slot filled" : "bottle-slot";
      slot.innerHTML = `${bottleSvg(index < shown)}<span>${String(index + 1).padStart(2, "0")}</span>`;
      bottleGrid.append(slot);
    }
    bottleGrid.setAttribute("aria-label", `已記錄 ${shown} 格，共 10 格`);
  }

  function renderChart(state) {
    const today = dateKey(new Date());
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      days.push({
        key,
        date,
        ml: state.days[key] || 0,
        isToday: key === today,
      });
    }
    const max = Math.max(GOAL_ML, ...days.map((day) => day.ml));
    const total = days.reduce((sum, day) => sum + day.ml, 0);
    weekTotal.textContent = `合計 ${total.toLocaleString("en-US")} ml`;
    chart.replaceChildren();
    const reference = document.createElement("div");
    reference.className = "chart-reference";
    reference.style.bottom = `${(GOAL_ML / max) * 100}%`;
    reference.innerHTML = "<span>3,000 ml</span>";
    chart.append(reference);
    days.forEach((day) => {
      const column = document.createElement("div");
      column.className = "chart-column";
      const bar = document.createElement("div");
      bar.className = day.isToday ? "chart-bar today" : "chart-bar";
      bar.style.height = `${(day.ml / max) * 100}%`;
      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = day.ml > 0 ? String(day.ml) : "";
      const label = document.createElement("div");
      label.className = day.isToday ? "chart-day today" : "chart-day";
      label.innerHTML = `<span>${day.isToday ? "今天" : `週${WEEKDAYS[day.date.getDay()]}`}</span><small>${day.date.getMonth() + 1}/${day.date.getDate()}</small>`;
      column.append(value, bar, label);
      chart.append(column);
    });
  }

  function renderLog(bottles) {
    logCount.textContent = `${bottles} 筆`;
    if (bottles === 0) {
      todayLog.innerHTML = '<div class="empty-log"><p>今天的第一瓶，等你來記錄。</p><small>喝完水後，點一下「喝了一瓶」</small></div>';
      return;
    }
    const list = document.createElement("ol");
    list.className = "log-list";
    for (let index = bottles; index >= 1; index -= 1) {
      const item = document.createElement("li");
      item.innerHTML = `<strong>第 ${index} 瓶</strong><span class="log-amount">＋${BOTTLE_ML} ml</span>`;
      list.append(item);
    }
    todayLog.replaceChildren(list);
  }

  function describe(bottles, asleep) {
    if (scene.phase === "drink") return "咕嚕咕嚕…";
    if (asleep) return "冬眠";
    if (bottles === RED_MAX) return "紅蓮爆發";
    if (bottles === SHOWN_BOTTLES) return "火焰覺醒";
    if (bottles > SHOWN_BOTTLES) return "能量持續升溫";
    if (bottles > 0) return "慢慢蓄力";
    return "準備好補水了";
  }

  function render(state) {
    const ml = todayMl(state);
    const bottles = bottlesFrom(ml);
    const reached = ml >= GOAL_ML;
    const left = Math.max(GOAL_ML - ml, 0);
    const asleep = bottles > RED_MAX;
    const heat = bottles <= SHOWN_BOTTLES || asleep ? 0 : Math.min((bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES), 1);
    let crackA = 0;
    let crackB = 0;
    if (bottles > 0 && bottles < SHOWN_BOTTLES) crackA = bottles / (SHOWN_BOTTLES - 1);
    if (bottles >= SHOWN_BOTTLES) crackA = 1;
    if (bottles > SHOWN_BOTTLES && bottles < RED_MAX) crackB = (bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES - 1);
    if (bottles >= RED_MAX) crackB = 1;

    scene.bottles = bottles;
    scene.heat = heat;
    scene.asleep = asleep;
    scene.crackA = crackA;
    scene.crackB = crackB;
    scene.targetA = bottles >= SHOWN_BOTTLES ? 96 : 0;
    scene.targetB = bottles >= RED_MAX ? 96 : 0;

    const today = new Date();
    dateLabel.textContent = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`;
    mlTotal.textContent = ml.toLocaleString("en-US");
    const percent = Math.min(100, Math.floor((ml / GOAL_ML) * 100));
    barFill.style.width = `${percent}%`;
    progress.setAttribute("aria-valuenow", String(Math.min(ml, GOAL_ML)));
    remain.textContent = reached ? "已達每日參考量" : `距參考量還有 ${left.toLocaleString("en-US")} ml`;
    progressPercent.textContent = `${percent}%`;
    bottleCount.textContent = String(bottles);
    renderBottles(bottles);
    bottleLabel.textContent = asleep ? "超過 10 瓶，哥吉拉冬眠" : "10 格會隨瓶數填滿 · 超過 10 瓶進入冬眠";
    mileFive.classList.toggle("unlocked", bottles >= SHOWN_BOTTLES);
    mileTen.classList.toggle("unlocked", bottles >= RED_MAX);
    stepCharge.classList.toggle("current", bottles < SHOWN_BOTTLES);
    stepAwake.classList.toggle("current", bottles >= SHOWN_BOTTLES && bottles < RED_MAX);
    stepRage.classList.toggle("current", bottles >= RED_MAX);
    stepFinalRange.textContent = asleep ? "11 瓶以後" : "10 瓶";
    stepFinalTitle.textContent = asleep ? "冬眠" : "紅蓮爆發";
    stepFinalCopy.textContent = asleep ? "火焰熄滅，高樓保持倒下" : "高樓全倒，噴出紅火";

    const status = describe(bottles, asleep);
    sceneStatus.className = `scene-status${asleep ? " is-sleep" : bottles >= SHOWN_BOTTLES ? " is-hot" : ""}`;
    sceneStatus.textContent = status;
    sceneWrap.classList.toggle("is-sleep", asleep);
    sleepNote.hidden = !asleep;
    heatLabel.textContent = `${Math.round(heat * 100)}%`;
    heatFill.style.width = `${heat * 100}%`;
    addLabel.textContent = scene.phase === "drink" ? "哥吉拉正在喝水…" : "喝了一瓶";
    undoButton.disabled = ml < BOTTLE_ML || drinking;
    resetButton.disabled = ml <= 0 || drinking;
    addButton.disabled = drinking;
    live.textContent = asleep
      ? `今天 ${bottles} 瓶，${ml} cc，哥吉拉冬眠`
      : reached
        ? `今天 ${bottles} 瓶，${ml} cc，已達標`
        : `今天 ${bottles} 瓶，${ml} cc，還差 ${left} cc`;
    canvas.setAttribute("aria-label", `哥吉拉${status}，今天已喝 ${bottles} 瓶。`);
    renderChart(state);
    renderLog(bottles);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && canvas.getContext("2d")) {
      renderScene(canvas.getContext("2d"), 0, true);
    }
  }

  function changeToday(delta) {
    const state = loadState();
    const key = dateKey(new Date());
    state.days[key] = Math.max((state.days[key] || 0) + delta, 0);
    saveState(state);
    render(state);
  }

  addButton.addEventListener("click", () => {
    if (drinking) return;
    drinking = true;
    scene.phase = "drink";
    changeToday(BOTTLE_ML);
    window.setTimeout(() => {
      drinking = false;
      scene.phase = "idle";
      render(loadState());
    }, 680);
  });
  undoButton.addEventListener("click", () => {
    if (drinking) return;
    changeToday(-BOTTLE_ML);
  });
  resetButton.addEventListener("click", () => {
    if (drinking) return;
    const state = loadState();
    state.days[dateKey(new Date())] = 0;
    saveState(state);
    render(state);
  });

  function mix(from, to, amount) {
    const a = from.match(/\w\w/g).map((part) => parseInt(part, 16));
    const b = to.match(/\w\w/g).map((part) => parseInt(part, 16));
    return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(",")})`;
  }

  function renderScene(ctx, time, reduced) {
    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    const poly = (points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], index) => (index ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y))));
      ctx.closePath();
      ctx.fill();
    };
    const cloud = (x, y, scale = 1) => {
      ctx.save();
      ctx.translate(Math.round(x), y);
      ctx.scale(scale, scale);
      rect(0, 8, 46, 7, "#f0f1dc");
      rect(7, 4, 29, 8, "#f0f1dc");
      rect(17, 0, 12, 9, "#f0f1dc");
      rect(8, 14, 31, 2, "#c6d8c9");
      ctx.restore();
    };
    const stepFall = (current, target) => {
      if (reduced) return target;
      if (current < target) return Math.min(target, current + 8);
      if (current > target) return Math.max(target, current - 8);
      return current;
    };
    scene.fallA = stepFall(scene.fallA, scene.targetA);
    scene.fallB = stepFall(scene.fallB, scene.targetB);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, WIDTH, HEIGHT, "#afcfc4");
    rect(0, 43, WIDTH, 42, "#bad5c7");
    rect(0, 85, WIDTH, 40, "#ccddc8");
    rect(0, 125, WIDTH, 54, "#e2e7c9");
    for (let x = 0; x < WIDTH; x += 12) {
      rect(x + 4, 42, 2, 2, "#bad5c7");
      rect(x, 84, 2, 2, "#ccddc8");
    }
    rect(289, 32, 38, 34, "#d8dfb5");
    rect(283, 39, 50, 20, "#d8dfb5");
    rect(295, 32, 26, 34, "#f0ecc2");
    rect(289, 38, 38, 22, "#f0ecc2");
    rect(296, 37, 24, 24, "#f8efd0");
    const drift = reduced ? 0 : Math.floor(Math.sin(time * 0.11) * 5);
    cloud(25 + drift, 41, 0.9);
    cloud(227 - drift, 59, 0.7);
    cloud(335 + drift, 28, 0.6);
    cloud(104 - drift, 21, 0.58);
    [[73, 83], [85, 78], [254, 30]].forEach(([x, y]) => {
      rect(x, y, 3, 1, "#7b9e91");
      rect(x + 3, y + 1, 2, 1, "#7b9e91");
      rect(x + 5, y, 3, 1, "#7b9e91");
    });

    const drawSkyline = (side) => {
      ctx.save();
      ctx.translate(0, side === "a" ? scene.fallA : scene.fallB);
      skyline.filter((building) => building[4] === side).forEach(([x, y, w, h]) => {
        rect(x, y, w, h, "#8fac9d");
        rect(x + 4, y - 4, Math.max(5, w - 10), 4, "#8fac9d");
        rect(x, y, 3, h, "#7e9d91");
        for (let wx = x + 6; wx < x + w - 3; wx += 7) {
          for (let wy = y + 7; wy < 163; wy += 9) rect(wx, wy, 3, 4, (wx + wy) % 3 ? "#b9cead" : "#deddb0");
        }
        const crack = side === "a" ? scene.crackA : scene.crackB;
        if (crack > 0) {
          ctx.globalAlpha = crack;
          for (let i = 0; i < 5; i += 1) rect(x + 6 + (i % 2) * 5, y + 8 + i * 9, 3, 3, "#efe6c8");
          ctx.globalAlpha = 1;
        }
      });
      if (side === "a") rect(78, 95, 2, 13, "#8fac9d");
      if (side === "b") {
        rect(301, 87, 2, 16, "#8fac9d");
        rect(297, 93, 10, 2, "#8fac9d");
      }
      ctx.restore();
    };
    drawSkyline("a");
    drawSkyline("b");

    rect(0, 161, WIDTH, 26, "#738e85");
    rect(0, 165, WIDTH, 2, "#b5c9ad");
    [[6, 172, 30], [56, 180, 27], [226, 175, 45], [306, 180, 25], [346, 171, 20]].forEach(([x, y, w]) => rect(x, y, w, 1, "#9ab4a0"));

    const drawNear = (side) => {
      ctx.save();
      ctx.translate(0, side === "a" ? scene.fallA : scene.fallB);
      if (side === "a") {
        rect(0, 143, 31, 43, "#395952");
        rect(4, 138, 23, 5, "#4a6b5f");
        rect(30, 153, 28, 33, "#46675b");
        rect(35, 148, 16, 5, "#46675b");
        for (const x of [7, 18, 37, 47]) {
          for (const y of [153, 164, 175]) rect(x, y, 4, 5, (x + y) % 3 ? "#9db190" : "#dcd59a");
        }
      } else {
        rect(336, 142, 24, 44, "#3d5d53");
        rect(360, 129, 24, 57, "#304c47");
        rect(366, 123, 13, 6, "#304c47");
        for (const x of [342, 352, 366, 376]) {
          for (const y of [153, 164, 175]) rect(x, y, 4, 5, (x + y) % 3 ? "#9db190" : "#dcd59a");
        }
        rect(264, 139, 2, 24, "#59786b");
        rect(278, 139, 2, 24, "#59786b");
        rect(263, 151, 18, 2, "#59786b");
        rect(260, 126, 24, 17, "#739e91");
        rect(262, 122, 20, 4, "#9db8a3");
        rect(259, 130, 26, 2, "#517c70");
        rect(259, 139, 26, 3, "#517c70");
        rect(264, 128, 3, 10, "#b1d1b8");
      }
      const crack = side === "a" ? scene.crackA : scene.crackB;
      if (crack > 0) {
        ctx.globalAlpha = crack;
        const origin = side === "a" ? 12 : 344;
        for (let i = 0; i < 4; i += 1) rect(origin + (i % 2) * 6, 150 + i * 8, 3, 3, "#efe6c8");
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };
    drawNear("a");
    drawNear("b");

    rect(0, 186, WIDTH, 38, "#344b43");
    rect(0, 186, WIDTH, 4, "#829a78");
    rect(0, 190, WIDTH, 2, "#243b35");
    rect(0, 207, WIDTH, 1, "#425c4e");
    for (let x = 15; x < WIDTH; x += 45) {
      rect(x, 201, 13, 1, "#516753");
      rect(x + 9, 212, 2, 4, "#293f37");
      rect(x + 26, 217, 8, 1, "#516753");
    }
    [[17, 185], [63, 187], [312, 186]].forEach(([x, y]) => {
      rect(x, y - 3, 2, 5, "#b6c27b");
      rect(x + 3, y - 1, 2, 3, "#7f9c69");
    });
    rect(97, 188, 113, 4, "#273d35");
    rect(111, 192, 87, 3, "#2a4037");

    const heat = scene.heat;
    const outline = mix("203d36", "512b35", heat);
    const dark = mix("305c49", "993d43", heat);
    const body = mix("56805a", "c95748", heat);
    const light = mix("7c9c64", "e57c59", heat);
    const belly = mix("b9c486", "edac7c", heat);
    const spine = mix("cae3ae", "ffd48b", heat);
    const bright = mix("ecf2bc", "fff0ad", heat);
    const bob = reduced ? 0 : Math.round(Math.sin(time * 2.1));
    const drinkingNow = scene.phase === "drink";
    const blueFire = scene.bottles === SHOWN_BOTTLES;
    const redFire = scene.bottles === RED_MAX;
    ctx.save();
    ctx.translate(0, bob);

    poly([[145, 151], [111, 153], [91, 148], [78, 136], [65, 129], [65, 143], [75, 159], [96, 174], [126, 180], [157, 174]], outline);
    poly([[143, 156], [112, 158], [88, 149], [72, 136], [77, 150], [97, 168], [125, 175], [149, 170]], body);
    poly([[141, 164], [110, 165], [88, 153], [100, 168], [127, 173], [147, 169]], dark);
    poly([[104, 154], [99, 141], [111, 148], [115, 153]], outline);
    poly([[107, 151], [105, 146], [111, 151]], spine);
    poly([[119, 153], [119, 139], [132, 147], [133, 153]], outline);
    poly([[122, 150], [122, 144], [129, 150]], spine);
    poly([[155, 151], [176, 153], [187, 175], [199, 178], [199, 188], [169, 188], [163, 180], [151, 166]], outline);
    rect(171, 166, 13, 18, dark);
    rect(178, 180, 17, 5, body);
    rect(187, 182, 4, 4, belly);
    rect(193, 182, 4, 4, belly);
    poly([[134, 112], [126, 116], [123, 130], [130, 136], [140, 132], [143, 117]], outline);
    rect(128, 118, 11, 13, dark);
    rect(130, 130, 9, 3, belly);
    const plates = [
      [[142, 103], [136, 87], [151, 92], [158, 104]],
      [[136, 121], [122, 103], [140, 105], [150, 119]],
      [[132, 141], [115, 124], [136, 122], [146, 137]],
      [[132, 157], [117, 145], [136, 141], [144, 151]],
    ];
    plates.forEach((points) => poly(points, outline));
    poly([[144, 99], [142, 93], [151, 97], [154, 102]], spine);
    poly([[137, 116], [129, 108], [140, 110], [145, 117]], spine);
    poly([[133, 136], [123, 128], [136, 127], [142, 135]], spine);
    poly([[133, 151], [124, 146], [137, 145], [141, 149]], spine);
    poly([[151, 91], [181, 93], [195, 109], [200, 129], [195, 151], [183, 172], [158, 178], [139, 168], [131, 152], [131, 126], [137, 105]], outline);
    poly([[153, 96], [179, 98], [190, 110], [195, 130], [188, 153], [178, 168], [157, 173], [143, 164], [136, 150], [136, 126], [142, 109]], body);
    poly([[141, 114], [147, 104], [150, 130], [147, 155], [159, 169], [146, 162], [137, 148], [137, 126]], dark);
    poly([[173, 103], [185, 111], [189, 129], [184, 149], [174, 164], [158, 165], [155, 151], [160, 130]], light);
    poly([[179, 112], [186, 124], [185, 141], [176, 157], [164, 159], [163, 148], [169, 130]], belly);
    rect(170, 136, 13, 2, light);
    rect(166, 145, 14, 2, light);
    rect(165, 154, 10, 2, light);
    [[144, 121], [142, 135], [148, 146], [146, 156], [155, 117], [155, 132]].forEach(([x, y]) => {
      rect(x, y, 4, 3, light);
      rect(x + 1, y + 3, 4, 2, dark);
    });
    poly([[146, 150], [165, 151], [171, 167], [164, 179], [171, 181], [171, 190], [131, 190], [131, 181], [137, 174], [137, 158]], outline);
    poly([[147, 155], [161, 155], [166, 166], [158, 178], [165, 183], [165, 186], [136, 186], [137, 181], [144, 174], [142, 162]], body);
    rect(144, 160, 6, 10, light);
    rect(137, 181, 17, 4, dark);
    rect(153, 183, 4, 4, belly);
    rect(159, 183, 4, 4, belly);
    rect(165, 184, 4, 3, belly);
    poly([[156, 67], [180, 63], [194, 68], [200, 75], [214, 77], [219, 84], [219, 100], [208, 108], [177, 108], [164, 100], [151, 85]], outline);
    poly([[159, 71], [180, 68], [190, 72], [195, 81], [211, 81], [214, 86], [214, 97], [205, 103], [179, 103], [167, 97], [156, 84]], body);
    rect(164, 71, 16, 4, light);
    rect(159, 77, 4, 8, light);
    rect(167, 85, 8, 12, dark);
    rect(179, 77, 17, 4, outline);
    if (scene.asleep) {
      rect(183, 84, 12, 3, outline);
    } else {
      rect(183, 81, 10, 8, bright);
      rect(190, 81, 3, 7, outline);
      rect(183, 81, 3, 3, "#fff9dc");
    }
    rect(208, 84, 4, 3, outline);
    rect(180, 94, 34, blueFire || redFire ? 8 : 4, outline);
    rect(185, 94, 4, 3, "#ebedbe");
    rect(195, 94, 4, 3, "#ebedbe");
    rect(205, 94, 4, 3, "#ebedbe");
    rect(180, 101, 25, 3, light);

    if (drinkingNow) {
      poly([[183, 115], [193, 112], [204, 113], [211, 103], [222, 105], [219, 119], [206, 127], [190, 127]], outline);
      poly([[187, 117], [195, 117], [205, 119], [214, 108], [217, 111], [215, 117], [205, 123], [192, 122]], body);
      ctx.save();
      ctx.translate(220, 94);
      ctx.rotate(-0.65);
      rect(0, -9, 7, 5, "#264d57");
      rect(-2, -5, 11, 3, "#eff4d7");
      rect(-4, -2, 15, 28, "#2e6572");
      rect(-2, 0, 11, 23, "#83c6c6");
      rect(-2, 6, 11, 14, "#56a5bc");
      rect(-2, 9, 11, 7, "#edf0c9");
      rect(0, 10, 3, 5, "#74bdc1");
      rect(0, 1, 2, 7, "#d5ead7");
      ctx.restore();
      const drop = reduced ? 0 : Math.floor(time * 12) % 10;
      rect(217, 105 + drop, 2, 3, "#91dedb");
      rect(224, 112 + drop, 2, 2, "#d9f1df");
    } else {
      poly([[186, 113], [197, 116], [203, 124], [216, 123], [221, 130], [217, 138], [203, 139], [192, 131], [183, 125]], outline);
      poly([[189, 117], [195, 120], [200, 129], [215, 128], [216, 134], [204, 135], [194, 128], [187, 123]], body);
      rect(211, 128, 3, 4, belly);
      rect(216, 129, 3, 4, belly);
      rect(205, 133, 3, 3, light);
    }

    if (blueFire || redFire) {
      const big = redFire;
      const length = big ? 134 : 67;
      const height = big ? 23 : 12;
      const colors = blueFire ? ["#1d6ea8", "#3aa0e0", "#8fd8ff", "#e7f8ff"] : ["#bd4738", "#ef873b", "#f6c85d", "#fff0ab"];
      const flick = reduced ? 0 : Math.floor(time * 14) % 3;
      const start = 215;
      const end = Math.min(start + length, WIDTH - 4);
      poly([[start, 94], [start + 20, 91], [start + 38, 88 - height / 2], [end - 22, 90 - height], [end - 12, 94 - height / 2], [end + flick * 2, 90], [end - 8, 99], [end - 1, 104 + height / 2], [end - 24, 102 + height], [start + 35, 106 + height / 2], [start + 17, 102], [start, 101]], colors[0]);
      poly([[start + 2, 95], [start + 26, 94], [end - 25, 94 - height + 6], [end - 15, 92], [end - 4, 96], [end - 19, 100], [end - 12, 106 + height / 3], [end - 32, 101 + height - 4], [start + 27, 103], [start + 2, 100]], colors[1]);
      poly([[start + 1, 96], [start + 26, 96], [end - 31, 92 - height / 3], [end - 20, 98], [end - 35, 106 + height / 3], [start + 22, 101], [start + 1, 99]], colors[2]);
      poly([[start, 97], [start + 24, 97], [end - 36, 96], [end - 44, 102], [start + 21, 100], [start, 99]], colors[3]);
    }
    if (heat > 0 && !reduced) {
      const float = Math.floor(time * 7) % 12;
      rect(147, 58 - float, 2, 4, "#e7ba75");
      rect(174, 53 - ((float + 6) % 12), 2, 3, "#e7ba75");
    }
    ctx.restore();
  }

  const ctx = canvas.getContext("2d");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  const paint = () => {
    if (document.hidden) return;
    renderScene(ctx, media.matches ? 0 : performance.now() / 1000, media.matches);
    if (!media.matches) frame = requestAnimationFrame(paint);
  };
  paint();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) paint();
  });

  render(loadState());

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
})();
