


// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
    IMAGES_PER_ROUND: 4,
    SUCCESS_DELAY: 1700,
    IMG_DIR: "img/",
    SOUND_DIR: "sound/",
    WORDS_JSON: "words.json"
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let wordsData = {};       // surowe dane z words.json
let wordsPl = {};         // { "słowo": { sufix, eng, fonetic } }
let wordsEng = {};        // { "word": { sufix, eng, fonetic, pl } }
let grupsPl = {};         // { "s": ["słoń","ser",...] }
let grupsEng = {};
let currentLang = "pl";
let currentWord = "";
let currentWords = [];
let goodTry = 0;
let badTry = 0;
let animating = false;
let confettiPieces = [];
let confettiAnimId = null;
let engAvailable = false;

// ─── DOM ─────────────────────────────────────────────────────────────────────
const wordDisplay    = document.getElementById("wordDisplay");
const foneticDisplay = document.getElementById("foneticDisplay");
const imagesArea     = document.getElementById("imagesArea");
const scoreDisplay   = document.getElementById("scoreDisplay");
const successOverlay = document.getElementById("successOverlay");
const confettiCanvas = document.getElementById("confettiCanvas");
const ctx            = confettiCanvas.getContext("2d");
const langBtns       = document.querySelectorAll(".langBtn");

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
    try {
        const res = await fetch(CONFIG.WORDS_JSON);
        wordsData = await res.json();
    } catch(e) {
        wordsData = {};
    }

    // Zbuduj wordsPl na podstawie words.json
    // Musimy najpierw wykryć jakie pliki są w img/ — nie można tego zrobić
    // z przeglądarki, więc zakładamy że words.json zawiera WSZYSTKIE słowa
    // i pliki nazywają się tak samo jak klucze (z dowolnym rozszerzeniem)
    // Sprawdzamy rozszerzenia jpg/png/jpeg
    const extensions = ["jpg", "jpeg", "png"];

    const allWords = Object.keys(wordsData).filter(k => k !== "ver");

    // Dla każdego słowa znajdź plik obrazu (próbujemy kolejno rozszerzenia)
    const imageChecks = allWords.map(word => {
        return checkImageExists(word, extensions).then(sufix => {
            if (sufix) {
                const data = wordsData[word] || {};
                wordsPl[word] = {
                    sufix: sufix,
                    eng: data.eng || null,
                    fonetic: data.fonetic || null
                };
            }
        });
    });

    await Promise.all(imageChecks);

    // Zbuduj wordsEng
    for (const [pl, obj] of Object.entries(wordsPl)) {
        if (obj.eng) {
            wordsEng[obj.eng] = { ...obj, pl };
        }
    }

    grupsPl  = groupByFirstLetter(Object.keys(wordsPl));
    grupsEng = groupByFirstLetter(Object.keys(wordsEng));

    engAvailable = Object.keys(wordsEng).length >= 10;

    if (!engAvailable) {
        document.querySelector('.langBtn[data-lang="en"]').style.opacity = "0.4";
        document.querySelector('.langBtn[data-lang="en"]').disabled = true;
    }

    if (Object.keys(wordsPl).length < 4) {
        imagesArea.innerHTML = '<p style="color:red;font-size:1.5rem">Za mało obrazów!</p>';
        return;
    }

    startGame();
    bindEvents();
}

// Sprawdza czy plik obrazu istnieje (próbuje kolejne rozszerzenia)
function checkImageExists(word, extensions) {
    return new Promise(resolve => {
        let i = 0;
        function tryNext() {
            if (i >= extensions.length) { resolve(null); return; }
            const sufix = `${word}.${extensions[i]}`;
            const img = new Image();
            img.onload  = () => resolve(sufix);
            img.onerror = () => { i++; tryNext(); };
            img.src = CONFIG.IMG_DIR + sufix;
        }
        tryNext();
    });
}

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
function startGame() {
    animating = false;
    foneticDisplay.textContent = "";
    foneticDisplay.className = "";

    const grups   = currentLang === "pl" ? grupsPl   : grupsEng;
    const objects = currentLang === "pl" ? wordsPl   : wordsEng;

    const drawn = drawWords(grups, objects);
    currentWord  = drawn.word;
    currentWords = drawn.words;

    wordDisplay.textContent = currentWord;

    // Fonetyka tylko w trybie angielskim
    if (currentLang === "en") {
        const fonetic = objects[currentWord]?.fonetic || "";
        foneticDisplay.textContent = fonetic;
        const mp3name = currentWord; // angielskie słowo = nazwa mp3
        checkSoundExists(mp3name).then(exists => {
            foneticDisplay.className = exists ? "hasSound" : "noSound";
        });
    }

    renderImages(objects);
}

function drawWords(grups, objects) {
    const keys = Object.keys(objects);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const letter = randomKey[0];
    const group  = grups[letter] || [];

    let words;
    if (group.length < CONFIG.IMAGES_PER_ROUND) {
        words = [...group];
        const rest = keys.filter(k => !words.includes(k));
        const needed = CONFIG.IMAGES_PER_ROUND - words.length;
        words.push(...shuffle(rest).slice(0, needed));
    } else {
        words = shuffle([...group]).slice(0, CONFIG.IMAGES_PER_ROUND);
    }

    const word = words[0];
    return { word, words: shuffle(words) };
}

function renderImages(objects) {
    imagesArea.innerHTML = "";
    const shuffled = [...currentWords];

    shuffled.forEach(w => {
        const obj = objects[w];
        const card = document.createElement("div");
        card.className = "imageCard";
        card.dataset.word = w;

        const img = document.createElement("img");
        img.src = CONFIG.IMG_DIR + obj.sufix;
        img.alt = w;
        img.draggable = false;

        card.appendChild(img);
        card.addEventListener("click", () => onImageClick(w, card));
        imagesArea.appendChild(card);
    });
}

function onImageClick(clickedWord, cardEl) {
    if (animating) return;

    if (clickedWord === currentWord) {
        goodTry++;
        updateScore();
        cardEl.classList.add("correct");
        animating = true;
        showSuccess();
    } else {
        badTry++;
        updateScore();
        cardEl.classList.add("wrong");
        wordDisplay.classList.add("shake");
        setTimeout(() => {
            cardEl.classList.remove("wrong");
            wordDisplay.classList.remove("shake");
        }, 450);
    }
}

function updateScore() {
    scoreDisplay.textContent = `${goodTry}/${goodTry + badTry}`;
}

// ─── WORD CLICK (pokaż/ukryj tłumaczenie w trybie PL) ────────────────────────
function onWordClick() {
    if (currentLang !== "pl") return;
    const engWord = wordsPl[currentWord]?.eng;
    if (!engWord) return;
    foneticDisplay.textContent = foneticDisplay.textContent ? "" : engWord;
}

// ─── FONETIC CLICK (odtwórz dźwięk) ──────────────────────────────────────────
function onFoneticClick() {
    let soundName;
    if (currentLang === "en") {
        soundName = currentWord;
    } else {
        soundName = wordsPl[currentWord]?.eng;
    }
    if (!soundName) return;
    playSound(soundName);
}

function playSound(name) {
    const audio = new Audio(CONFIG.SOUND_DIR + name + ".mp3");
    audio.play().catch(() => {});
}

function checkSoundExists(name) {
    return new Promise(resolve => {
        const audio = new Audio(CONFIG.SOUND_DIR + name + ".mp3");
        audio.addEventListener("canplaythrough", () => resolve(true),  { once: true });
        audio.addEventListener("error",          () => resolve(false), { once: true });
        audio.load();
    });
}

// ─── SUCCESS ANIMATION ────────────────────────────────────────────────────────
function showSuccess() {
    resizeConfettiCanvas();
    successOverlay.classList.add("show");
    startConfetti();
    setTimeout(() => {
        successOverlay.classList.remove("show");
        stopConfetti();
        startGame();
    }, CONFIG.SUCCESS_DELAY);
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
    "#FF6B6B","#4ECDC4","#45B7D1","#FFA07A",
    "#98D8C8","#F7DC6F","#BB8FCE","#85C1E2","#F8B739","#52C77C"
];

function resizeConfettiCanvas() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

function createConfettiPiece() {
    return {
        x:  Math.random() * confettiCanvas.width,
        y:  Math.random() * confettiCanvas.height * 0.3,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -12 - 3,
        gravity: 0.35,
        size:  Math.floor(Math.random() * 8) + 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        isRect: Math.random() > 0.5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 25,
        alive: true
    };
}

function startConfetti() {
    confettiPieces = Array.from({ length: 120 }, createConfettiPiece);
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces = confettiPieces.filter(p => p.alive);

    confettiPieces.forEach(p => {
        p.vy += p.gravity;
        p.x  += p.vx;
        p.y  += p.vy;
        p.rotation += p.rotSpeed;

        if (p.y > confettiCanvas.height + 30) { p.alive = false; return; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;

        if (p.isRect) {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    if (confettiPieces.length > 0) {
        confettiAnimId = requestAnimationFrame(animateConfetti);
    }
}

function stopConfetti() {
    if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
    }
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces = [];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function groupByFirstLetter(words) {
    const groups = {};
    words.forEach(w => {
        const key = w[0].toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(w);
    });
    return groups;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function bindEvents() {
    wordDisplay.addEventListener("click", onWordClick);
    foneticDisplay.addEventListener("click", onFoneticClick);

    langBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            const lang = btn.dataset.lang;
            if (lang === currentLang) return;

            langBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            currentLang = lang;
            goodTry = 0;
            badTry  = 0;
            updateScore();
            foneticDisplay.textContent = "";
            foneticDisplay.className   = "";
            startGame();
        });
    });

    window.addEventListener("resize", resizeConfettiCanvas);
}

// ─── START ────────────────────────────────────────────────────────────────────
init();
