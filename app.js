(function () {
  const BOTTLE_ML = 575;
  const GOAL_ML = 3000;
  const SHOWN_BOTTLES = 5;
  const RED_MAX = 10;
  const STORAGE_KEY = "water-monster";
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const BELLY_SCALE = [
    [0.92, 0.84],
    [0.94, 0.8],
    [1.02, 0.98],
    [1.08, 1.14],
    [1.14, 1.3],
    [1.18, 1.44],
    [1.24, 1.58],
  ];

  const monster = document.querySelector("#monster");
  const stageSet = document.querySelector("#set");
  const belly = document.querySelector("#belly");
  const bottleCount = document.querySelector("#bottle-count");
  const mlLine = document.querySelector("#ml-line");
  const remain = document.querySelector("#remain");
  const live = document.querySelector("#live");
  const progress = document.querySelector("#progress");
  const barFill = document.querySelector("#bar-fill");
  const week = document.querySelector("#week");
  const bottleRow = document.querySelector("#bottle-row");
  const bottleLabel = document.querySelector("#bottle-label");
  const addButton = document.querySelector("#add");
  const undoButton = document.querySelector("#undo");
  const resetButton = document.querySelector("#reset");
  let drinking = false;

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

  function renderWeek(state) {
    const today = dateKey(new Date());
    week.replaceChildren();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const ml = state.days[key] || 0;
      const bottles = bottlesFrom(ml);
      const item = document.createElement("li");
      if (key === today) item.classList.add("is-today");
      if (ml >= GOAL_ML) item.classList.add("is-goal");

      const name = document.createElement("span");
      name.className = "day-name";
      name.textContent =
        key === today ? "今天" : `${date.getMonth() + 1}/${date.getDate()} 週${WEEKDAYS[date.getDay()]}`;

      const amount = document.createElement("span");
      amount.className = "day-amount";
      amount.textContent = ml >= GOAL_ML ? `${ml} cc · 達標` : `${ml} cc · ${bottles} 瓶`;

      item.append(name, amount);
      week.append(item);
    }
  }

  function createBottle() {
    const item = document.createElement("li");
    item.className = "bottle";
    item.innerHTML =
      '<svg viewBox="0 0 48 78" aria-hidden="true">' +
      '<rect class="cap" x="16" y="2" width="16" height="8" rx="2"></rect>' +
      '<path class="glass" d="M14 14h20l5 10v34a10 10 0 0 1-10 10h-10a10 10 0 0 1-10-10V24z"></path>' +
      '<path class="water" d="M17 38h14l3 8v10a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6V46z"></path>' +
      '<rect class="glint" x="18" y="28" width="3" height="22" rx="1.5"></rect>' +
      "</svg>";
    return item;
  }

  function renderBottles(drunk, animateDrink) {
    const remaining = Math.max(SHOWN_BOTTLES - drunk, 0);
    bottleRow.replaceChildren();
    for (let index = 0; index < remaining; index += 1) bottleRow.append(createBottle());
    if (animateDrink && drunk > 0 && drunk <= SHOWN_BOTTLES) {
      const leaving = createBottle();
      leaving.classList.add("is-drinking");
      bottleRow.append(leaving);
      leaving.addEventListener("animationend", () => leaving.remove());
    }
    if (remaining === SHOWN_BOTTLES) bottleLabel.textContent = "今天的五瓶";
    else if (remaining > 0) bottleLabel.textContent = `還有 ${remaining} 瓶`;
    else bottleLabel.textContent = "五瓶都喝完了";
  }

  function renderCity(bottles) {
    let crackA = 0;
    let crackB = 0;
    if (bottles > 0 && bottles < SHOWN_BOTTLES) crackA = bottles / (SHOWN_BOTTLES - 1);
    if (bottles >= SHOWN_BOTTLES) crackA = 1;
    if (bottles > SHOWN_BOTTLES && bottles < RED_MAX) crackB = (bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES - 1);
    if (bottles >= RED_MAX) crackB = 1;
    stageSet.style.setProperty("--crack-a", String(crackA));
    stageSet.style.setProperty("--crack-b", String(crackB));
    stageSet.classList.toggle("is-half", bottles >= SHOWN_BOTTLES && bottles < RED_MAX);
    stageSet.classList.toggle("is-down", bottles >= RED_MAX);
    stageSet.classList.toggle("is-sleep", bottles > RED_MAX);
  }

  function render(state, options) {
    const ml = todayMl(state);
    const bottles = bottlesFrom(ml);
    const step = Math.min(bottles, BELLY_SCALE.length - 1);
    const [scaleX, scaleY] = BELLY_SCALE[step];
    const reached = ml >= GOAL_ML;
    const left = Math.max(GOAL_ML - ml, 0);

    const asleep = bottles > RED_MAX;
    const heat = bottles <= SHOWN_BOTTLES || asleep ? 0 : Math.min((bottles - SHOWN_BOTTLES) / (RED_MAX - SHOWN_BOTTLES), 1);
    belly.style.transform = `scale(${scaleX}, ${scaleY})`;
    monster.style.setProperty("--heat", String(heat));
    monster.classList.toggle("is-full", reached && !asleep);
    monster.classList.toggle("is-charged", bottles === SHOWN_BOTTLES);
    monster.classList.toggle("is-rage", bottles === RED_MAX);
    monster.classList.toggle("is-sleep", asleep);
    renderCity(bottles);
    if (options && options.gulp) {
      monster.classList.remove("gulp");
      void monster.offsetWidth;
      monster.classList.add("gulp");
    }

    bottleCount.textContent = String(bottles);
    renderBottles(bottles, Boolean(options && options.gulp));
    mlLine.textContent = `${ml} / ${GOAL_ML} cc`;
    remain.textContent = reached ? "已達標" : `還差 ${left} cc`;
    remain.classList.toggle("is-goal", reached);
    barFill.style.width = `${Math.min(ml / GOAL_ML, 1) * 100}%`;
    barFill.classList.toggle("is-goal", reached);
    progress.setAttribute("aria-valuenow", String(Math.min(ml, GOAL_ML)));
    undoButton.disabled = ml < BOTTLE_ML;
    resetButton.disabled = ml <= 0;
    live.textContent = asleep
      ? `今天 ${bottles} 瓶，${ml} cc，哥吉拉冬眠`
      : reached
        ? `今天 ${bottles} 瓶，${ml} cc，已達標`
        : `今天 ${bottles} 瓶，${ml} cc，還差 ${left} cc`;
    renderWeek(state);
  }

  function changeToday(delta, gulp) {
    const state = loadState();
    const key = dateKey(new Date());
    const next = Math.max((state.days[key] || 0) + delta, 0);
    state.days[key] = next;
    saveState(state);
    render(state, { gulp });
  }

  addButton.addEventListener("click", () => {
    if (drinking) return;
    drinking = true;
    changeToday(BOTTLE_ML, true);
    window.setTimeout(() => {
      drinking = false;
    }, 680);
  });
  undoButton.addEventListener("click", () => {
    if (drinking) return;
    changeToday(-BOTTLE_ML, false);
  });
  resetButton.addEventListener("click", () => {
    if (drinking) return;
    const state = loadState();
    state.days[dateKey(new Date())] = 0;
    saveState(state);
    render(state);
  });
  monster.addEventListener("animationend", () => monster.classList.remove("gulp"));

  render(loadState());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
})();
