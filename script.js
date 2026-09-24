// Настройки
const MY_EMAIL = "bogdanrandomaizzer@gmail.com";
const DEFAULT_CENTER = [44.0486, 43.0594];

const state = {
  where: new Set(),
  walkTime: "",
  date: "", time: "18:00",
  name: "Диана", msg: "",
  lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1],
  address: "центр Пятигорска",
  dodges: 0,
};

const noPhrases = ["Нет", "Точно нет?", "Может, да?", "Не поймать", "Попробуйте ещё", "Кнопка сдаётся"];

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

// Убегающая кнопка (десктоп + мобайл)
const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
const noHint = document.getElementById("noHint");
let runawayActive = false;

function moveNoButton() {
  state.dodges++;
  if (!runawayActive) { runawayActive = true; noBtn.classList.add("runaway"); }
  const pad = 12;
  const r = noBtn.getBoundingClientRect();
  const maxX = Math.max(pad, window.innerWidth - r.width - pad);
  const maxY = Math.max(pad, window.innerHeight - r.height - pad);
  noBtn.style.left = (Math.random() * maxX) + "px";
  noBtn.style.top = (Math.random() * maxY) + "px";
  noBtn.textContent = noPhrases[Math.min(state.dodges, noPhrases.length - 1)];
  const scale = Math.min(1 + state.dodges * 0.1, 1.8);
  yesBtn.style.transform = `scale(${scale})`;
  if (noHint) noHint.textContent = ["Кнопка решила прогуляться", "Она быстрая", "Проще нажать «Да»", "Сопротивление бесполезно"][Math.min(state.dodges - 1, 3)];
  spawnDots(4);
}
["pointerenter","mouseenter","touchstart","mousedown","focus"].forEach(ev => {
  noBtn.addEventListener(ev, (e) => { if (e.cancelable && ev === "touchstart") e.preventDefault(); moveNoButton(); }, { passive: false });
});
noBtn.addEventListener("click", (e) => { e.preventDefault(); moveNoButton(); });
noBtn.addEventListener("touchend", (e) => { e.preventDefault(); }, { passive: false });
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
  info.textContent = `Метка: ${state.lat}, ${state.lon}. Определяю адрес…`;
  if (ymaps.geocode) {
    ymaps.geocode(coords).then((res) => {
      const obj = res.geoObjects.get(0);
      state.address = obj ? obj.getAddressLine() : `${state.lat}, ${state.lon}`;
      info.textContent = `${state.address} (${state.lat}, ${state.lon}). Эта точка придёт мне на почту.`;
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
  state.name = document.getElementById("nameInput").value.trim() || "Диана";
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
  const text = `Ответ с сайта-приглашения\nИмя: ${state.name}\nКуда: ${whereList}\nСвой вариант: ${custom || "—"}\nГде: ${state.address}\nКоординаты: ${state.lat}, ${state.lon}\nКарта: ${mapUrl}\nКогда: ${state.date || "—"} в ${state.time} (${state.walkTime || "—"})\nКомментарий: ${state.msg || "—"}`;
  document.getElementById("resultText").innerHTML =
    `<b>${escapeHtml(state.name)}</b>, спасибо за ответ.<br>Куда: <b>${escapeHtml(whereList)}</b><br>Где: <b>${escapeHtml(state.address)}</b><br>Когда: <b>${escapeHtml(state.date || "договоримся")} в ${escapeHtml(state.time)}</b>`;
  document.getElementById("mapLink").href = mapUrl;
  goTo(5); spawnDots(40);
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${MY_EMAIL}`, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: `Приглашение: ${state.name} — ${whereList}`,
        _template: "table", _captcha: "false",
        "Имя": state.name, "Куда": whereList, "Свой вариант": custom,
        "Адрес": state.address, "Координаты": `${state.lat}, ${state.lon}`,
        "Карта": mapUrl, "Дата": state.date, "Время": `${state.time} (${state.walkTime})`,
        "Комментарий": state.msg, "Сообщение": text
      })
    });
    document.getElementById("mailStatus").textContent = res.ok
      ? "Ответ отправлен мне на почту."
      : "Не удалось отправить автоматически, воспользуйтесь копированием.";
  } catch (e) {
    document.getElementById("mailStatus").innerHTML =
      `Автопересылка недоступна. <a href="mailto:${MY_EMAIL}?subject=${encodeURIComponent("Ответ: " + state.name)}&body=${encodeURIComponent(text)}">Открыть письмо вручную</a>`;
  }
  btn.textContent = "Отправить ответ"; btn.disabled = false;
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
