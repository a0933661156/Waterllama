(function () {
  const BOTTLE_ML = 575;
  const GOAL_ML = 3000;
  const SHOWN_BOTTLES = 5;
  const RED_MAX = 10;
  const MECHA_AT = 11;
  const MECHA_BEAT = 15;
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
    sweepA: 0,
    sweepB: 0,
    sweepM: 0,
    mechaIn: 0,
    blastAt: 0,
    frontA: null,
    frontB: null,
    snap: false,
    ready: false,
  };
  const falls = {};
  const struck = {};
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

  function describe(bottles) {
    if (scene.phase === "drink") return "咕嚕咕嚕…";
    if (bottles >= MECHA_BEAT) return "機械哥吉拉消失";
    if (bottles >= MECHA_AT) return "機械哥吉拉來襲";
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
    const heat = bottles <= SHOWN_BOTTLES || bottles > RED_MAX ? 0 : Math.min((bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES), 1);
    let crackA = 0;
    let crackB = 0;
    if (bottles > 0 && bottles < SHOWN_BOTTLES) crackA = bottles / (SHOWN_BOTTLES - 1);
    if (bottles >= SHOWN_BOTTLES) crackA = 1;
    if (bottles > SHOWN_BOTTLES && bottles < RED_MAX) crackB = (bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES - 1);
    if (bottles >= RED_MAX) crackB = 1;

    const previous = scene.ready ? scene.bottles : null;
    scene.bottles = bottles;
    scene.heat = heat;
    scene.asleep = false;
    scene.crackA = crackA;
    scene.crackB = crackB;
    scene.targetA = bottles >= SHOWN_BOTTLES ? 110 : 0;
    scene.targetB = bottles >= RED_MAX ? 110 : 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (previous === null || motion) scene.snap = true;
    else {
      const windup = scene.phase === "drink" ? 740 : 0;
      if (previous < SHOWN_BOTTLES && bottles >= SHOWN_BOTTLES) scene.sweepA = performance.now() + windup;
      if (previous < RED_MAX && bottles >= RED_MAX) scene.sweepB = performance.now() + windup;
      if (previous < MECHA_AT && bottles >= MECHA_AT) scene.mechaIn = performance.now();
      if (previous < MECHA_BEAT && bottles >= MECHA_BEAT) scene.sweepM = performance.now() + windup;
    }
    if (bottles < SHOWN_BOTTLES) scene.sweepA = 0;
    if (bottles < RED_MAX) scene.sweepB = 0;
    if (bottles < MECHA_AT) scene.mechaIn = 0;
    if (bottles < MECHA_BEAT) {
      scene.sweepM = 0;
      scene.blastAt = 0;
      delete struck.mecha;
    }
    scene.ready = true;

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
    bottleLabel.textContent = bottles >= MECHA_BEAT
      ? "嘴巴射出粉紅光線，爆炸後消失"
      : bottles >= MECHA_AT
        ? "對面站著機械哥吉拉"
        : "10 格會隨瓶數填滿 · 超過 10 瓶會出現機械哥吉拉";
    mileFive.classList.toggle("unlocked", bottles >= SHOWN_BOTTLES);
    mileTen.classList.toggle("unlocked", bottles >= RED_MAX);
    stepCharge.classList.toggle("current", bottles < SHOWN_BOTTLES);
    stepAwake.classList.toggle("current", bottles >= SHOWN_BOTTLES && bottles < RED_MAX);
    stepRage.classList.toggle("current", bottles >= RED_MAX);
    if (bottles >= MECHA_BEAT) {
      stepFinalRange.textContent = "15 瓶";
      stepFinalTitle.textContent = "粉紅光線";
      stepFinalCopy.textContent = "眼睛變粉紅，嘴巴射出粉紅光線";
    } else if (bottles >= MECHA_AT) {
      stepFinalRange.textContent = "11 瓶以後";
      stepFinalTitle.textContent = "對決";
      stepFinalCopy.textContent = "尾巴背鰭先變粉紅，背上的再由下往上";
    } else {
      stepFinalRange.textContent = "10 瓶";
      stepFinalTitle.textContent = "紅蓮爆發";
      stepFinalCopy.textContent = "高樓全倒，噴出紅火";
    }

    const status = describe(bottles);
    sceneStatus.className = `scene-status${bottles > SHOWN_BOTTLES && bottles <= RED_MAX ? " is-hot" : ""}`;
    sceneStatus.textContent = status;
    sceneWrap.classList.toggle("is-sleep", false);
    sceneWrap.classList.toggle("is-mecha", bottles >= MECHA_AT);
    sleepNote.hidden = bottles < MECHA_AT;
    sleepNote.textContent = bottles >= MECHA_BEAT ? "消失" : "對決";
    heatLabel.textContent = `${Math.round(heat * 100)}%`;
    heatFill.style.width = `${heat * 100}%`;
    addLabel.textContent = scene.phase === "drink" ? "哥吉拉正在喝水…" : "喝了一瓶";
    undoButton.disabled = ml < BOTTLE_ML || drinking;
    resetButton.disabled = ml <= 0 || drinking;
    addButton.disabled = drinking;
    live.textContent = bottles >= MECHA_BEAT
      ? `今天 ${bottles} 瓶，${ml} cc，機械哥吉拉被打爆`
      : bottles >= MECHA_AT
        ? `今天 ${bottles} 瓶，${ml} cc，對面出現機械哥吉拉`
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
    const BODY_X = 168;
    const BODY_Y = 150;
    const MOUTH_X = 219;
    const MOUTH_Y = 92;
    const SWEEP_MS = 2400;
    const poseOf = (facing, tilt, shift) => {
      const c = Math.cos(tilt);
      const s = Math.sin(tilt);
      const dx = facing * (MOUTH_X - BODY_X);
      const dy = MOUTH_Y - BODY_Y;
      return {
        mx: BODY_X + shift + dx * c - dy * s,
        my: BODY_Y + dx * s + dy * c,
        fx: facing * c,
        fy: facing * s,
      };
    };
    const clearStruck = (side) => {
      Object.keys(struck).forEach((key) => {
        if (key.startsWith(side) || key === `near-${side}`) delete struck[key];
      });
    };
    if (!scene.targetA) clearStruck("a");
    if (!scene.targetB) clearStruck("b");
    const attackOf = (side) => {
      const start = side === "a" ? scene.sweepA : scene.sweepB;
      if (!start) return null;
      const t = (performance.now() - start) / SWEEP_MS;
      if (t >= 1) {
        if (side === "a") scene.sweepA = 0;
        else scene.sweepB = 0;
        return null;
      }
      if (t < 0) return { waiting: true, facing: 1, tilt: 0, shift: 0, length: 0, returning: false };
      const ease = (v) => v * v * (3 - 2 * v);
      const turnEnd = 0.34;
      const fireEnd = 0.82;
      const from = side === "a" ? -0.47 : 0.58;
      const to = side === "a" ? -0.23 : 0.23;
      let facing = 1;
      let tilt = 0;
      let shift = 0;
      let length = 0;
      let returning = false;
      if (t < turnEnd) {
        const turn = ease(t / turnEnd);
        if (side === "a") {
          facing = Math.cos(turn * Math.PI);
          shift = turn > 0.55 ? 70 * ease((turn - 0.55) / 0.45) : 0;
        } else tilt = from * turn;
      } else if (t < fireEnd) {
        const sweep = ease((t - turnEnd) / (fireEnd - turnEnd));
        tilt = from + (to - from) * sweep;
        if (side === "a") {
          facing = -1;
          shift = 70;
        }
        const pose = poseOf(facing, tilt, shift);
        let best = 36;
        let bestGap = 99;
        skyline.forEach(([x, y, w, h, buildingSide]) => {
          if (buildingSide !== side) return;
          const vx = x + w / 2 - pose.mx;
          const vy = y + h * 0.4 - pose.my;
          const proj = vx * pose.fx + vy * pose.fy;
          const dist = Math.hypot(vx - pose.fx * proj, vy - pose.fy * proj);
          if (proj > 12 && dist < bestGap) {
            bestGap = dist;
            best = proj;
          }
        });
        const reach = 52 + sweep * (side === "a" ? 150 : 130);
        length = Math.max(32, Math.min(best + 16, reach));
      } else {
        returning = true;
        const back = ease((t - fireEnd) / (1 - fireEnd));
        if (side === "a") {
          facing = Math.cos((1 - back) * Math.PI);
          shift = 70 * (1 - back);
          tilt = to * (1 - back);
        } else tilt = to * (1 - back);
      }
      return { waiting: false, facing, tilt, shift, length, returning };
    };
    const attackA = attackOf("a");
    const attackB = attackOf("b");
    const attackM = (() => {
      if (!scene.sweepM || scene.bottles < MECHA_BEAT) return null;
      const t = (performance.now() - scene.sweepM) / 1700;
      if (t >= 1) {
        scene.sweepM = 0;
        struck.mecha = true;
        return null;
      }
      if (t < 0) return { waiting: true, facing: 1, tilt: 0, shift: 0, length: 0, returning: false };
      const ease = (v) => v * v * (3 - 2 * v);
      if (t < 0.24) return { waiting: false, facing: 1, tilt: 0, shift: 0, length: 0, returning: false };
      if (t < 0.7) {
        const length = 20 + ease((t - 0.24) / 0.46) * 140;
        if (length > 110) {
          if (!struck.mecha) scene.blastAt = performance.now();
          struck.mecha = true;
        }
        return { waiting: false, facing: 1, tilt: 0, shift: 0, length, returning: false };
      }
      struck.mecha = true;
      return { waiting: false, facing: 1, tilt: 0, shift: 0, length: 0, returning: true };
    })();
    const markRay = (side, attack) => {
      if (!attack || attack.waiting) return;
      if (attack.returning) {
        skyline.forEach(([x, , , , buildingSide]) => {
          if (buildingSide === side) struck[`${side}${x}`] = true;
        });
        struck[`near-${side}`] = true;
        return;
      }
      if (attack.length < 8) return;
      const pose = poseOf(attack.facing, attack.tilt, attack.shift);
      const hitBox = (key, cx, cy) => {
        const vx = cx - pose.mx;
        const vy = cy - pose.my;
        const proj = vx * pose.fx + vy * pose.fy;
        const ox = vx - pose.fx * proj;
        const oy = vy - pose.fy * proj;
        const dist2 = ox * ox + oy * oy;
        const alongBeam = proj >= -20 && proj <= attack.length + 10 && dist2 < 34 * 34;
        const inMouth = vx * vx + vy * vy < 30 * 30;
        if (alongBeam || inMouth) struck[key] = true;
      };
      skyline.forEach(([x, y, w, h, buildingSide]) => {
        if (buildingSide === side) hitBox(`${side}${x}`, x + w / 2, y + h * 0.45);
      });
      hitBox(`near-${side}`, side === "a" ? 28 : 350, 150);
    };
    markRay("a", attackA);
    markRay("b", attackB);
    const passed = (side, key) => {
      const target = side === "a" ? scene.targetA : scene.targetB;
      if (!target) return false;
      const attack = side === "a" ? attackA : attackB;
      if (attack) return Boolean(struck[key]);
      return true;
    };
    const fallOf = (key, hit, target) => {
      const dest = hit ? target : 0;
      if (reduced || scene.snap) {
        falls[key] = dest;
        return dest;
      }
      const current = falls[key] || 0;
      const next = current < dest ? Math.min(dest, current + 8) : current > dest ? Math.max(dest, current - 8) : current;
      falls[key] = next;
      return next;
    };
    const place = (x, y, w, h, fall, lean) => {
      ctx.translate(x + w / 2, y + h);
      ctx.translate(0, fall);
      ctx.rotate(lean);
      ctx.translate(-(x + w / 2), -(y + h));
    };

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
      skyline.filter((building) => building[4] === side).forEach(([x, y, w, h]) => {
        const fall = fallOf(`${side}${x}`, passed(side, `${side}${x}`), side === "a" ? scene.targetA : scene.targetB);
        const lean = (side === "a" ? -1 : 1) * (fall / 110) * 0.55;
        ctx.save();
        place(x, y, w, h, fall, lean);
        rect(x, y, w, h, "#8fac9d");
        rect(x + 4, y - 4, Math.max(5, w - 10), 4, "#8fac9d");
        rect(x, y, 3, h, "#7e9d91");
        for (let wx = x + 6; wx < x + w - 3; wx += 7) {
          for (let wy = y + 7; wy < y + h - 6; wy += 9) rect(wx, wy, 3, 4, (wx + wy) % 3 ? "#b9cead" : "#deddb0");
        }
        const crack = side === "a" ? scene.crackA : scene.crackB;
        if (crack > 0 && fall < 20) {
          ctx.globalAlpha = crack;
          for (let i = 0; i < 5; i += 1) rect(x + 6 + (i % 2) * 5, y + 8 + i * 9, 3, 3, "#efe6c8");
          ctx.globalAlpha = 1;
        }
        if (side === "a" && x === 69) rect(78, 95, 2, 13, "#8fac9d");
        if (side === "b" && x === 291) {
          rect(301, 87, 2, 16, "#8fac9d");
          rect(297, 93, 10, 2, "#8fac9d");
        }
        if (fall > 6 && fall < 80) {
          rect(x + 2, y + h - 4, w - 4, 3, "#d7c48a");
          rect(x + w - 4, y + 6, 3, 3, side === "a" ? "#7fd4ff" : "#ffb15a");
        }
        ctx.restore();
      });
    };
    drawSkyline("a");
    drawSkyline("b");

    rect(0, 161, WIDTH, 26, "#738e85");
    rect(0, 165, WIDTH, 2, "#b5c9ad");
    [[6, 172, 30], [56, 180, 27], [226, 175, 45], [306, 180, 25], [346, 171, 20]].forEach(([x, y, w]) => rect(x, y, w, 1, "#9ab4a0"));

    const drawNear = (side) => {
      const cluster = side === "a" ? [0, 58] : [260, 120];
      const fall = fallOf(`near-${side}`, passed(side, `near-${side}`), side === "a" ? scene.targetA : scene.targetB);
      const lean = (side === "a" ? -1 : 1) * (fall / 110) * 0.35;
      ctx.save();
      place(cluster[0], 129, cluster[1], 70, fall, lean);
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

    const heat = scene.bottles >= RED_MAX && !scene.sweepB ? 0 : scene.heat;
    const outline = mix("203d36", "512b35", heat);
    const dark = mix("305c49", "993d43", heat);
    const body = mix("56805a", "c95748", heat);
    const light = mix("7c9c64", "e57c59", heat);
    const belly = mix("b9c486", "edac7c", heat);
    const spine = mix("cae3ae", "ffd48b", heat);
    const bright = mix("ecf2bc", "fff0ad", heat);
    const bob = reduced ? 0 : Math.round(Math.sin(time * 2.1));
    const drinkingNow = scene.phase === "drink";
    const attack = attackA || attackB || attackM;
    const facing = attack && !attack.waiting ? attack.facing : 1;
    const tilt = attack && !attack.waiting ? attack.tilt : 0;
    const shift = attack && !attack.waiting ? attack.shift : 0;
    const firing = Boolean((attackA && attackA.length > 0) || (attackB && attackB.length > 0));
    const mouthBeam = Boolean(attackM && attackM.length > 0);
    const drawLizard = (palette, mechanical, drinkingArm, mouthOpen) => {
      const { outline, dark, body, light, belly, spine, bright } = palette;
      poly([[145, 151], [111, 153], [91, 148], [78, 136], [65, 129], [65, 143], [75, 159], [96, 174], [126, 180], [157, 174]], outline);
      poly([[143, 156], [112, 158], [88, 149], [72, 136], [77, 150], [97, 168], [125, 175], [149, 170]], body);
      poly([[141, 164], [110, 165], [88, 153], [100, 168], [127, 173], [147, 169]], dark);
      const tailPink = !mechanical && scene.bottles >= MECHA_AT;
      poly([[104, 154], [99, 141], [111, 148], [115, 153]], tailPink ? "#f48fb8" : outline);
      poly([[107, 151], [105, 146], [111, 151]], tailPink ? "#ffd4e8" : spine);
      poly([[119, 153], [119, 139], [132, 147], [133, 153]], tailPink ? "#f48fb8" : outline);
      poly([[122, 150], [122, 144], [129, 150]], tailPink ? "#ffd4e8" : spine);
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
      const spines = [
        [[144, 99], [142, 93], [151, 97], [154, 102]],
        [[137, 116], [129, 108], [140, 110], [145, 117]],
        [[133, 136], [123, 128], [136, 127], [142, 135]],
        [[133, 151], [124, 146], [137, 145], [141, 149]],
      ];
      const pinkCount = mechanical ? 0 : Math.max(0, Math.min(plates.length, scene.bottles - MECHA_AT));
      plates.forEach((points, index) => poly(points, plates.length - 1 - index < pinkCount ? "#f48fb8" : outline));
      spines.forEach((points, index) => poly(points, plates.length - 1 - index < pinkCount ? "#ffd4e8" : spine));
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
      if (mechanical) {
        rect(183, 80, 12, 8, "#c4322c");
        rect(190, 80, 3, 8, outline);
        rect(183, 80, 4, 3, "#ffe7a3");
        rect(206, 86, 8, 3, dark);
      } else if (scene.bottles >= MECHA_BEAT) {
        rect(183, 80, 12, 8, "#ff7eb8");
        rect(190, 80, 3, 8, "#a83b6a");
        rect(183, 80, 4, 3, "#fff0f7");
      } else if (scene.asleep) {
        rect(183, 84, 12, 3, outline);
      } else {
        rect(183, 81, 10, 8, bright);
        rect(190, 81, 3, 7, outline);
        rect(183, 81, 3, 3, "#fff9dc");
      }
      rect(208, 84, 4, 3, outline);
      rect(180, 94, 34, mouthOpen ? 8 : 4, outline);
      rect(185, 94, 4, 3, "#ebedbe");
      rect(195, 94, 4, 3, "#ebedbe");
      rect(205, 94, 4, 3, "#ebedbe");
      rect(180, 101, 25, 3, light);
      if (drinkingArm) {
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
      if (mechanical) {
        rect(156, 116, 30, 2, dark);
        rect(154, 134, 32, 2, dark);
        rect(150, 152, 22, 2, dark);
        rect(166, 124, 12, 10, "#24343c");
        rect(168, 126, 8, 6, "#7fd0ea");
        [[148, 108], [178, 112], [160, 148], [96, 158], [124, 162], [72, 148], [188, 96]].forEach(([x, y]) => rect(x, y, 2, 2, outline));
        rect(200, 74, 2, 10, light);
      }
    };
    const defeated = scene.bottles >= MECHA_BEAT && (!attackM || Boolean(struck.mecha));
    const blastAge = scene.blastAt ? (performance.now() - scene.blastAt) / 1100 : 1;
    if (scene.bottles >= MECHA_AT && (!defeated || (scene.blastAt && blastAge < 0.5))) {
      let enter = 0;
      if (scene.mechaIn && !defeated) {
        const arrived = (performance.now() - scene.mechaIn) / 480;
        if (arrived < 1) enter = (1 - arrived) * (1 - arrived) * 52;
      }
      ctx.save();
      ctx.translate(114 + enter, 0);
      ctx.translate(168, 0);
      ctx.scale(-1, 1);
      ctx.translate(-168, 0);
      if (defeated) ctx.globalAlpha = Math.max(0, 1 - blastAge / 0.5);
      drawLizard({
        outline: "#2a3540",
        dark: "#52616c",
        body: "#8d9aa6",
        light: "#d5dee6",
        belly: "#e7eef3",
        spine: "#f4f7f8",
        bright: "#e23b32",
      }, true, false, false);
      ctx.restore();
    }
    let retreat = 0;
    if (scene.bottles >= MECHA_AT) {
      const step = scene.mechaIn ? Math.min(1, (performance.now() - scene.mechaIn) / 480) : 1;
      const eased = step * step * (3 - 2 * step);
      retreat = -52 * eased;
    }
    ctx.save();
    ctx.translate(retreat, bob);
    ctx.save();
    ctx.translate(BODY_X + shift, BODY_Y);
    ctx.rotate(tilt);
    ctx.scale(facing, 1);
    ctx.translate(-BODY_X, -BODY_Y);
    drawLizard({ outline, dark, body, light, belly, spine, bright }, false, drinkingNow, firing || mouthBeam);
    if (firing) {
      const colors = attackA && attackA.length > 0 ? ["#1d6ea8", "#3aa0e0", "#e7f8ff"] : ["#bd4738", "#ef873b", "#fff0ab"];
      const tipX = MOUTH_X + attack.length;
      poly([[MOUTH_X, MOUTH_Y - 8], [tipX, MOUTH_Y - 3], [tipX, MOUTH_Y + 3], [MOUTH_X, MOUTH_Y + 8]], colors[0]);
      poly([[MOUTH_X, MOUTH_Y - 4], [tipX, MOUTH_Y - 1], [tipX, MOUTH_Y + 1], [MOUTH_X, MOUTH_Y + 4]], colors[2]);
      rect(tipX - 4, MOUTH_Y - 4, 8, 8, colors[1]);
    }
    if (mouthBeam) {
      const tipX = MOUTH_X + attackM.length;
      poly([[MOUTH_X, MOUTH_Y - 8], [tipX, MOUTH_Y - 3], [tipX, MOUTH_Y + 3], [MOUTH_X, MOUTH_Y + 8]], "#e85a9b");
      poly([[MOUTH_X, MOUTH_Y - 4], [tipX, MOUTH_Y - 1], [tipX, MOUTH_Y + 1], [MOUTH_X, MOUTH_Y + 4]], "#fff0f7");
      rect(tipX - 4, MOUTH_Y - 4, 8, 8, "#ff8dc4");
    }
    ctx.restore();

    if (scene.blastAt && blastAge < 1) {
      ctx.save();
      ctx.globalAlpha = blastAge < 0.62 ? 1 : Math.max(0, 1 - (blastAge - 0.62) / 0.38);
      const boom = (x, y, size, color) => rect(x, y, size, size, color);
      const spots = [[250, 96], [278, 124], [312, 150]];
      spots.forEach(([x, y], index) => {
        const local = Math.max(0, blastAge - index * 0.08);
        const reach = 4 + local * 42;
        boom(x - 6, y - 6, 12 + local * 10, "#fff4c2");
        boom(x - 10, y - 4, 18, "#ffb03a");
        for (let i = 0; i < 6; i += 1) {
          boom(x + Math.cos(i + index) * reach, y + Math.sin(i * 1.3 + index) * reach * 0.7, i % 2 ? 6 : 4, i % 3 ? "#e25a28" : "#ffd36a");
        }
      });
      ctx.restore();
    }

    scene.snap = false;
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
