// ===== НАСТРОЙКИ =====
const MY_EMAIL = "bogdanrandomaizzer@gmail.com"; // сюда придёт письмо
const DEFAULT_CENTER = [44.0486, 43.0594]; // Пятигорск

// ===== СОСТОЯНИЕ =====
const state = {
  where: new Set(),
  whereCustom: "",
  walkTime: "",
  date: "",
  time: "18:00",
  name: "",
  msg: "",
  lat: DEFAULT_CENTER[0],
  lon: DEFAULT_CENTER[1],
  address: "центр Пятигорска",
  dodges: 0,
};

const noPhrases = ["Нет", "Точно нет? 🥺", "А может да? 😳", "Не поймаешь! 😝", "Попробуй ещё 😂", "Кнопка убежала 🏃‍♀️", "Сдавайся, жми Да! 💖"];

// ===== ЭКРАНЫ =====
function goTo(n) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + n).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (n === 3) setTimeout(initMap, 300);
}

// ===== УБЕГАЮЩАЯ КНОПКА НЕТ (десктоп + мобайл) =====
const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
const noHint = document.getElementById("noHint");
let runawayActive = false;

function moveNoButton() {
  state.dodges++;
  if (!runawayActive) {
    runawayActive = true;
    noBtn.classList.add("runaway");
  }
  const pad = 12;
  const r = noBtn.getBoundingClientRect();
  const maxX = Math.max(pad, window.innerWidth - r.width - pad);
  const maxY = Math.max(pad, window.innerHeight - r.height - pad);
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  noBtn.style.left = x + "px";
  noBtn.style.top = y + "px";

  // меняем текст
  noBtn.textContent = noPhrases[Math.min(state.dodges, noPhrases.length - 1)];

  // Да растёт
  const scale = Math.min(1 + state.dodges * 0.12, 1.9);
  yesBtn.style.transform = `scale(${scale})`;

  noHint.textContent = ["Хмм, кнопка вырвалась 😅", "Она шустрая, да? 🏃‍♀️", "Просто нажми Да 💖", "Сопротивление бесполезно 😍"][Math.min(state.dodges - 1, 3)];

  spawnHearts(3);
}

["pointerenter", "mouseenter", "touchstart", "mousedown", "focus"].forEach(ev => {
  noBtn.addEventListener(ev, (e) => {
    if (e.cancelable && (ev === "touchstart")) e.preventDefault();
    moveNoButton();
  }, { passive: false });
});
noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  moveNoButton();
});
noBtn.addEventListener("touchend", (e) => { e.preventDefault(); }, { passive: false });

// Да — дальше + салют
yesBtn.addEventListener("click", () => {
  spawnHearts(30);
  setTimeout(() => goTo(2), 400);
});

// ===== ВЫБОР КУДА =====
document.querySelectorAll("#whereGrid .chip-card").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("sel");
    const v = btn.dataset.value;
    if (btn.classList.contains("sel")) state.where.add(v);
    else state.where.delete(v);
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

// ===== ЯНДЕКС КАРТА =====
let myMap = null, myPlacemark = null, mapInited = false;

function initMap() {
  if (mapInited || typeof ymaps === "undefined") return;
  ymaps.ready(() => {
    myMap = new ymaps.Map("map", {
      center: DEFAULT_CENTER,
      zoom: 13,
      controls: ["zoomControl", "searchControl", "geolocationControl"]
    });
    myPlacemark = new ymaps.Placemark(DEFAULT_CENTER, {
      balloonContent: "Наше место 💖"
    }, { preset: "islands#redHeartIcon", draggable: true });
    myMap.geoObjects.add(myPlacemark);

    myMap.events.add("click", (e) => {
      const coords = e.get("coords");
      setPlacemark(coords);
    });
    myPlacemark.events.add("dragend", () => {
      setPlacemark(myPlacemark.geometry.getCoordinates());
    });
    mapInited = true;
    setPlacemark(DEFAULT_CENTER);
  });
}

function setPlacemark(coords) {
  state.lat = coords[0].toFixed(6);
  state.lon = coords[1].toFixed(6);
  myPlacemark.geometry.setCoordinates(coords);
  const info = document.getElementById("mapInfo");
  info.innerHTML = `📍 Метка: ${state.lat}, ${state.lon}<br><small>определяю адрес...</small>`;
  // обратный геокод
  if (ymaps.geocode) {
    ymaps.geocode(coords).then((res) => {
      const obj = res.geoObjects.get(0);
      state.address = obj ? obj.getAddressLine() : `${state.lat}, ${state.lon}`;
      info.innerHTML = `📍 <b>${state.address}</b><br><small>${state.lat}, ${state.lon} — эта точка придёт мне на почту 💌</small>`;
    }).catch(() => {
      state.address = `${state.lat}, ${state.lon}`;
      info.innerHTML = `📍 Метка: ${state.lat}, ${state.lon}<br><small>эта точка придёт мне на почту 💌</small>`;
    });
  }
}

// пресеты мест Пятигорска
document.querySelectorAll(".preset-row .mini").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".preset-row .mini").forEach(x => x.classList.remove("sel"));
    b.classList.add("sel");
    const c = [parseFloat(b.dataset.lat), parseFloat(b.dataset.lon)];
    if (myMap) { myMap.setCenter(c, 15); setPlacemark(c); }
    else { state.lat = c[0]; state.lon = c[1]; }
  });
});

// ===== ОТПРАВКА НА ПОЧТУ =====
function buildMessage() {
  state.whereCustom = document.getElementById("whereCustom").value.trim();
  state.date = document.getElementById("dateInput").value;
  state.time = document.getElementById("timeInput").value;
  state.name = document.getElementById("nameInput").value.trim() || "(не представилась 🙈)";
  state.msg = document.getElementById("msgInput").value.trim();

  const whereList = [...state.where].join(", ") || "на твой вкус 😍";
  const mapUrl = `https://yandex.ru/maps/?pt=${state.lon},${state.lat}&z=17&l=map`;
  return { whereList, mapUrl };
}

async function sendInvite() {
  const { whereList, mapUrl } = buildMessage();
  const btn = document.getElementById("sendBtn");
  btn.textContent = "Отправляю... 💭";
  btn.disabled = true;

  const text = `💖 ОНА СКАЗАЛА ДА! 💖
Имя: ${state.name}
Куда пойдём: ${whereList}
Свой вариант: ${state.whereCustom || "—"}
Где гуляем: ${state.address}
Координаты: ${state.lat}, ${state.lon}
Карта: ${mapUrl}
Когда: ${state.date || "—"} в ${state.time} (${state.walkTime || "время на выбор"})
Пожелание: ${state.msg || "—"}`;

  // показать финал сразу
  document.getElementById("resultText").innerHTML =
    `<b>${escapeHtml(state.name)}</b>, ты чудо! 🥰<br>Куда: <b>${escapeHtml(whereList)}</b><br>Где: <b>${escapeHtml(state.address)}</b><br>Когда: <b>${escapeHtml(state.date || "договоримся")} в ${escapeHtml(state.time)}</b>`;
  document.getElementById("mapLink").href = mapUrl;
  goTo(5);
  spawnHearts(50);

  // 1) FormSubmit (письмо тебе на email)
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${MY_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: `💖 Свидание! ${state.name} — ${whereList}`,
        _template: "table",
        _captcha: "false",
        "Имя": state.name,
        "Куда пойдём": whereList,
        "Свой вариант": state.whereCustom,
        "Где гуляем (адрес)": state.address,
        "Координаты": `${state.lat}, ${state.lon}`,
        "Ссылка на карту": mapUrl,
        "Дата": state.date,
        "Время": `${state.time} (${state.walkTime})`,
        "Пожелание": state.msg,
        "Сообщение": text
      })
    });
    if (res.ok) {
      document.getElementById("mailStatus").textContent = "✅ Письмо улетело мне на почту! Проверяй " + MY_EMAIL;
    } else {
      throw new Error("formsubmit error");
    }
  } catch (e) {
    // fallback — открыть почтовый клиент + показать текст
    document.getElementById("mailStatus").innerHTML =
      `⚠️ Автоотправка blocked (нужна 1-разовая активация FormSubmit).<br>Я открыла письмо вручную — просто нажми «Отправить» в почте.<br><br>
      <a href="mailto:${MY_EMAIL}?subject=${encodeURIComponent("💖 Свидание! " + state.name)}&body=${encodeURIComponent(text)}">📧 Открыть письмо вручную</a><br><br>
      <small>Важно: первый раз зайди на почту ${MY_EMAIL} и подтверди активацию от FormSubmit, дальше всё будет приходить само.</small>`;
    window.location.href = `mailto:${MY_EMAIL}?subject=${encodeURIComponent("💖 Свидание! " + state.name)}&body=${encodeURIComponent(text)}`;
  }
  btn.textContent = "Отправить 💌";
  btn.disabled = false;
  localStorage.setItem("dateInvite", text);
}

function copyResult() {
  const t = localStorage.getItem("dateInvite") || "";
  navigator.clipboard?.writeText(t).then(() => alert("Скопировано! Отправь мне 💖"));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// сердечки фон
function spawnHearts(n) {
  const bg = document.getElementById("heartsBg");
  for (let i = 0; i < n; i++) {
    const h = document.createElement("div");
    h.className = "heart";
    h.textContent = ["💖", "💕", "❤️", "🌸", "💗"][Math.floor(Math.random() * 5)];
    h.style.left = Math.random() * 100 + "vw";
    h.style.fontSize = (14 + Math.random() * 22) + "px";
    h.style.animationDuration = (2 + Math.random() * 2.5) + "s";
    bg.appendChild(h);
    setTimeout(() => h.remove(), 5000);
  }
}
setInterval(() => spawnHearts(1), 2500);

// дата минимум сегодня
document.getElementById("dateInput").min = new Date().toISOString().split("T")[0];
