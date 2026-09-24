// Настройки
const MY_EMAIL = "bogdanrandomaizzer@gmail.com";
const DEFAULT_CENTER = [44.0486, 43.0594];

const state = {
  where: new Set(),
  walkTime: "",
  date: "", time: "18:00",
  msg: "",
  lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1],
  address: "центр Пятигорска",
  dodges: 0,
};

// Экраны
function goTo(n) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById("screen-" + n);
  el.classList.add("active");
  // перезапуск reveal-анимаций
  el.querySelectorAll(".reveal").forEach(r => { r.style.animation = "none"; void r.offsetWidth; r.style.animation = ""; });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (n === 3) setTimeout(initMap, 300);
}

// Убегающая кнопка: рандом + плавность (десктоп + мобайл)
const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
let runawayActive = false;
let lastMove = 0;

function clampSpot(x, y, w, h) {
  const pad = 10;
  return [
    Math.min(Math.max(pad, x), Math.max(pad, window.innerWidth - w - pad)),
    Math.min(Math.max(pad, y), Math.max(pad, window.innerHeight - h - pad))
  ];
}
function moveNoButton(px, py) {
  const now = performance.now();
  if (now - lastMove < 120) return; // анти-дребезг
  lastMove = now;
  state.dodges++;
  const r = noBtn.getBoundingClientRect();
  if (!runawayActive) {
    runawayActive = true;
    noBtn.classList.add("runaway");
    noBtn.style.left = r.left + "px";
    noBtn.style.top = r.top + "px";
  }
  const w = r.width, h = r.height;
  const cx = (px ?? r.left + w / 2), cy = (py ?? r.top + h / 2);
  const mode = Math.random();
  let x, y;
  if (mode < 0.45) {
    // телепорт подальше от курсора
    let best = null, bestD = -1;
    for (let i = 0; i < 12; i++) {
      const tx = Math.random() * (window.innerWidth - w);
      const ty = Math.random() * (window.innerHeight - h);
      const d = Math.hypot(tx + w / 2 - cx, ty + h / 2 - cy);
      if (d > bestD) { bestD = d; best = [tx, ty]; }
    }
    [x, y] = best;
  } else if (mode < 0.75) {
    // шаг в сторону
    const ang = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 220;
    x = r.left + Math.cos(ang) * dist;
    y = r.top + Math.sin(ang) * dist;
  } else {
    // к краю
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = 10 + Math.random() * 40; y = Math.random() * (window.innerHeight - h); }
    else if (edge === 1) { x = window.innerWidth - w - 10 - Math.random() * 40; y = Math.random() * (window.innerHeight - h); }
    else if (edge === 2) { y = 10 + Math.random() * 40; x = Math.random() * (window.innerWidth - w); }
    else { y = window.innerHeight - h - 10 - Math.random() * 40; x = Math.random() * (window.innerWidth - w); }
  }
  [x, y] = clampSpot(x, y, w, h);
  noBtn.style.left = x + "px";
  noBtn.style.top = y + "px";
  // вариативность: наклон + уменьшение
  noBtn.style.transform = `rotate(${(Math.random() * 24 - 12).toFixed(0)}deg) scale(${Math.max(0.7, 1 - state.dodges * 0.04).toFixed(2)})`;
  yesBtn.style.transform = `scale(${Math.min(1 + state.dodges * 0.1, 1.8).toFixed(2)})`;
  spawnDots(4);
}
// близость курсора — убегает заранее (только мышь)
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || !runawayActive && state.dodges > 6) return;
  if (!document.getElementById("screen-1").classList.contains("active")) return;
  const r = noBtn.getBoundingClientRect();
  const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
  if (d < 150) moveNoButton(e.clientX, e.clientY);
}, { passive: true });
["pointerenter", "mouseenter", "touchstart", "mousedown", "focus"].forEach(ev => {
  noBtn.addEventListener(ev, (e) => { if (e.cancelable && ev === "touchstart") e.preventDefault(); moveNoButton(e.clientX, e.clientY); }, { passive: false });
});
noBtn.addEventListener("click", (e) => { e.preventDefault(); moveNoButton(e.clientX, e.clientY); });
noBtn.addEventListener("touchend", (e) => { e.preventDefault(); }, { passive: false });
noBtn.addEventListener("touchmove", (e) => { e.preventDefault(); const t = e.touches[0]; if (t) moveNoButton(t.clientX, t.clientY); }, { passive: false });
yesBtn.addEventListener("click", () => { spawnDots(24); setTimeout(() => goTo(2), 350); });

// Выбор
document.querySelectorAll("#whereGrid .pick").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("sel");
    const v = btn.dataset.value;
    if (btn.classList.contains("sel")) state.where.add(v); else state.where.delete(v);
  });
});
document.querySelectorAll(".time-row .t").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".time-row .t").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    state.walkTime = b.dataset.t;
    document.getElementById("timeInput").value = b.dataset.t.includes("Днём") ? "14:00" : b.dataset.t.includes("Закат") ? "19:30" : "18:00";
  });
});

// Tilt-эффект открыток
document.querySelectorAll("[data-tilt]").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});

// Карта
let myMap = null, myPlacemark = null, mapInited = false;
function initMap() {
  if (mapInited || typeof ymaps === "undefined") return;
  ymaps.ready(() => {
    myMap = new ymaps.Map("map", { center: DEFAULT_CENTER, zoom: 13, controls: ["zoomControl", "searchControl"] });
    myPlacemark = new ymaps.Placemark(DEFAULT_CENTER, { balloonContent: "Наше место" }, { preset: "islands#brownDotIcon", draggable: true });
    myMap.geoObjects.add(myPlacemark);
    myMap.events.add("click", (e) => setPlacemark(e.get("coords")));
    myPlacemark.events.add("dragend", () => setPlacemark(myPlacemark.geometry.getCoordinates()));
    mapInited = true;
    setPlacemark(DEFAULT_CENTER);
  });
}
function setPlacemark(coords) {
  state.lat = coords[0].toFixed(6); state.lon = coords[1].toFixed(6);
  myPlacemark.geometry.setCoordinates(coords);
  const info = document.getElementById("mapInfo");
  info.textContent = `${state.lat}, ${state.lon}…`;
  if (ymaps.geocode) {
    ymaps.geocode(coords).then((res) => {
      const obj = res.geoObjects.get(0);
      state.address = obj ? obj.getAddressLine() : `${state.lat}, ${state.lon}`;
      info.textContent = state.address;
    }).catch(() => { state.address = `${state.lat}, ${state.lon}`; });
  }
}
document.querySelectorAll(".preset-row .mini").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".preset-row .mini").forEach(x => x.classList.remove("sel"));
    b.classList.add("sel");
    const c = [parseFloat(b.dataset.lat), parseFloat(b.dataset.lon)];
    if (myMap) { myMap.setCenter(c, 15); setPlacemark(c); } else { state.lat = c[0]; state.lon = c[1]; }
  });
});

// Отправка
function buildMessage() {
  state.date = document.getElementById("dateInput").value;
  state.time = document.getElementById("timeInput").value;
  state.msg = document.getElementById("msgInput").value.trim();
  const custom = document.getElementById("whereCustom").value.trim();
  const whereList = [...state.where].join(", ") || "на ваш вкус";
  const mapUrl = `https://yandex.ru/maps/?pt=${state.lon},${state.lat}&z=17&l=map`;
  return { whereList, custom, mapUrl };
}
async function sendInvite() {
  const { whereList, custom, mapUrl } = buildMessage();
  const btn = document.getElementById("sendBtn");
  btn.textContent = "Отправляю…"; btn.disabled = true;
  const text = `Ответ с сайта-приглашения\nКуда: ${whereList}\nСвой вариант: ${custom || "—"}\nГде: ${state.address}\nКоординаты: ${state.lat}, ${state.lon}\nКарта: ${mapUrl}\nКогда: ${state.date || "—"} в ${state.time} (${state.walkTime || "—"})\nКомментарий: ${state.msg || "—"}`;
  document.getElementById("resultText").innerHTML =
    `${escapeHtml(whereList)} · ${escapeHtml(state.address)} · ${escapeHtml(state.date || "—")} ${escapeHtml(state.time)}`;
  document.getElementById("mapLink").href = mapUrl;
  document.getElementById("mailtoBtn").href = `mailto:${MY_EMAIL}?subject=${encodeURIComponent("Ответ с сайта: " + whereList)}&body=${encodeURIComponent(text)}`;
  goTo(5); spawnDots(40);
  const status = document.getElementById("mailStatus");
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${MY_EMAIL}`, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: `Ответ с сайта: ${whereList}`,
        _template: "table", _captcha: "false",
        "Куда": whereList, "Свой вариант": custom,
        "Адрес": state.address, "Координаты": `${state.lat}, ${state.lon}`,
        "Карта": mapUrl, "Дата": state.date, "Время": `${state.time} (${state.walkTime})`,
        "Комментарий": state.msg, "Сообщение": text
      })
    });
    status.textContent = res.ok
      ? "Отправлено. Если письма нет — проверь спам и активацию FormSubmit, либо жми «Дубль письмом»."
      : "Не отправилось само — жми «Дубль письмом» или «Копия».";
  } catch (e) {
    status.textContent = "Нет связи с почтовым сервисом — жми «Дубль письмом» или «Копия».";
  }
  btn.textContent = "Отправить"; btn.disabled = false;
  localStorage.setItem("dateInvite", text);
}
function copyResult() {
  const t = localStorage.getItem("dateInvite") || "";
  navigator.clipboard?.writeText(t).then(() => alert("Ответ скопирован"));
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// Точки-частицы вместо сердечек
function spawnDots(n) {
  const bg = document.getElementById("dotsBg");
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.style.left = Math.random() * 100 + "vw";
    s.style.bottom = "-10px";
    s.style.animationDuration = (3 + Math.random() * 3) + "s";
    s.style.opacity = .2 + Math.random() * .3;
    bg.appendChild(s);
    setTimeout(() => s.remove(), 6000);
  }
}
setInterval(() => spawnDots(1), 4000);
document.getElementById("dateInput").min = new Date().toISOString().split("T")[0];
