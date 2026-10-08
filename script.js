"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d", { alpha: false }) : null;

let W = 1280, H = 720, DPR = 1;
let shakeTime = 0;

/* =========================================================
   ASSETS & BGM
   ========================================================= */
const SPRITE_SIZE = 48;

/* =========================================================
   CHARACTERS
   ---------------------------------------------------------
   Each character loads assets/<prefix>_<anim>.png sprite sheets
   (horizontal strips). Frame width = image width / frames.
   To add real art for Character 3/4/5: just replace the
   Character3_*.png ... Character5_*.png files in /assets
   (and edit `frames` below if your sheets use other frame counts).
   anim files: idle, run, jump, doublejump (used for slide), death
   size    = on-screen height of one frame in px
   offsetX = horizontal nudge, yOffset = per-animation vertical nudge
   ========================================================= */
const SHEET_FILES = { idle: "idle", run: "run", jump: "jump", slide: "doublejump", death: "death" };
const BIKER_FRAMES = { idle: 4, run: 6, jump: 4, slide: 6, death: 6 };

const CHARACTERS = [
    { id: "biker",      name: "BIKER",       role: "DEFAULT // ALL-ROUNDER", prefix: "Biker",      size: 60, offsetX: 6, pixel: true,  frames: BIKER_FRAMES, yOffset: { death: 4, slide: 10 } },
    { id: "ryoshi",     name: "RYOSHI",      role: "SCYTHE // SHADOW BLADE", prefix: "Ryoshi",     size: 64, offsetX: 0, pixel: false, frames: BIKER_FRAMES, yOffset: {} },
    { id: "character3", name: "CHARACTER 3", role: "PLACEHOLDER",            prefix: "Character3", size: 60, offsetX: 6, pixel: true,  frames: BIKER_FRAMES, yOffset: { death: 4, slide: 10 } },
    { id: "character4", name: "CHARACTER 4", role: "PLACEHOLDER",            prefix: "Character4", size: 60, offsetX: 6, pixel: true,  frames: BIKER_FRAMES, yOffset: { death: 4, slide: 10 } },
    { id: "character5", name: "CHARACTER 5", role: "PLACEHOLDER",            prefix: "Character5", size: 60, offsetX: 6, pixel: true,  frames: BIKER_FRAMES, yOffset: { death: 4, slide: 10 } }
];

CHARACTERS.forEach(c => {
    c.images = {};
    for (const anim in SHEET_FILES) {
        const img = new Image();
        img.src = "assets/" + c.prefix + "_" + SHEET_FILES[anim] + ".png";
        c.images[anim] = img;
    }
});

function getStorage(key, def = null) {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? val : def;
    } catch (e) {
        return def;
    }
}

function setStorage(key, val) {
    try {
        localStorage.setItem(key, String(val));
    } catch (e) {}
}

let selectedCharacter = CHARACTERS[0]; // Biker by default
const savedCharId = getStorage("cyberRunnerCharacter");
if (savedCharId) {
    selectedCharacter = CHARACTERS.find(c => c.id === savedCharId) || CHARACTERS[0];
}

// Returns a drawable sheet; falls back to the Biker if a character's image is missing.
function getSheet(char, anim) {
    let c = char;
    let img = c.images[anim];
    if (!img || !img.complete || img.naturalWidth === 0) {
        c = CHARACTERS[0];
        img = c.images[anim];
    }
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    const frames = c.frames[anim];
    return { c, img, frames, fw: img.naturalWidth / frames, fh: img.naturalHeight };
}

const cyborgRun = new Image();
cyborgRun.src = "assets/Cyborg_run.png";

const cyborgIdle = new Image();
cyborgIdle.src = "assets/Cyborg_idle.png";

const cyborgAttack = new Image();
cyborgAttack.src = "assets/Cyborg_attack3.png";

const bgm = new Audio("assets/bgm.mp3");
bgm.loop = true;
bgm.volume = 0.4;

/* =========================================================
   DISTRICT CONFIG
   ========================================================= */


const DISTRICTS = [
    { name: "NEON DISTRICT", background: "assets/locations/neon-district.png", skyTop: "#030208", skyBottom: "#0b0c26", platformColor: "#0b1021", platformEdge: "#00f0ff" },
    { name: "TOKYO AFTERDARK", background: "assets/locations/tokyo-afterdark.png", skyTop: "#18030b", skyBottom: "#3b071d", platformColor: "#190816", platformEdge: "#ff007f" },
    { name: "SOLAR WASTELAND", background: "assets/locations/solar-wasteland.png", skyTop: "#311506", skyBottom: "#784019", platformColor: "#28180d", platformEdge: "#ffb52e" },
    { name: "ABYSSAL CITY", background: "assets/locations/abyssal-city.png", skyTop: "#001b2c", skyBottom: "#004c66", platformColor: "#062333", platformEdge: "#00eaff" },
    { name: "IRON HAVEN", background: "assets/locations/iron-haven.png", skyTop: "#21120c", skyBottom: "#54301e", platformColor: "#241914", platformEdge: "#ff6a24" },
    { name: "FROSTBITE VALLEY", background: "assets/locations/frostbite-valley.png", skyTop: "#071b37", skyBottom: "#467ba5", platformColor: "#10253a", platformEdge: "#a9efff" },
    { name: "VERDANT RUINS", background: "assets/locations/verdant-ruins.png", skyTop: "#06190f", skyBottom: "#16442a", platformColor: "#0b2116", platformEdge: "#64ff75" },
    { name: "ORION SPACEPORT", background: "assets/locations/orion-spaceport.png", skyTop: "#080b26", skyBottom: "#282d65", platformColor: "#11152d", platformEdge: "#8a75ff" },
    { name: "SHADOWFALL", background: "assets/locations/shadowfall.png", skyTop: "#0b0710", skyBottom: "#290c1d", platformColor: "#160d18", platformEdge: "#ff294f" },
    { name: "CELESTIA", background: "assets/locations/celestia.png", skyTop: "#6cbbdb", skyBottom: "#e2c9a1", platformColor: "#34465a", platformEdge: "#ffe9a6" },
    { name: "GLITCH REALM", background: "assets/locations/glitch-realm.png", skyTop: "#170329", skyBottom: "#35095d", platformColor: "#180b29", platformEdge: "#e64dff" },
    { name: "STORM CIRCUIT", background: "assets/locations/storm-circuit.png", skyTop: "#071521", skyBottom: "#263f50", platformColor: "#101c29", platformEdge: "#00ffc8" },
    { name: "NOVA FRONTIER", background: "assets/locations/nova-frontier.png", skyTop: "#1b092c", skyBottom: "#4b1b51", platformColor: "#20132e", platformEdge: "#ff77df" },
    { name: "THE LAST HORIZON", background: "assets/locations/last-horizon.png", skyTop: "#15213d", skyBottom: "#ac643f", platformColor: "#211d2a", platformEdge: "#ffd36a" }
];

let previousDistrictIndex = 0;
let transitionProgress = 1;
const transitionDuration = 1;

// Preload the images
const districtImages = DISTRICTS.map(d => {
    const img = new Image();
    img.src = d.background;
    return img;
});

let locationOrder = [];
let currentLocationCycle = -1;

function shuffleLocations() {
    locationOrder = DISTRICTS.map((_, index) => index);

    for (let i = locationOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [locationOrder[i], locationOrder[j]] =
            [locationOrder[j], locationOrder[i]];
    }
}

function showLocationAnnouncement(name) {
    const announcement =
        document.getElementById("locationAnnouncement");
    const title = document.getElementById("locationName");

    if (!announcement || !title) return;

    title.textContent = name;

    // Restart the CSS animation
    announcement.classList.remove("show");
    void announcement.offsetWidth;
    announcement.classList.add("show");
}

function updateRandomLocation() {
    const locationsPerCycle = DISTRICTS.length;
    const distancePerLocation = 5000;
    const cycleLength = locationsPerCycle * distancePerLocation;

    const cycle = Math.floor(game.distance / cycleLength);
    const segment = Math.floor(game.distance / distancePerLocation)
        % locationsPerCycle;

    // Shuffle again after all 14 locations have appeared
    if (cycle !== currentLocationCycle) {
        shuffleLocations();
        currentLocationCycle = cycle;
    }

    const newIndex = locationOrder[segment];

    if (newIndex !== game.currentDistrictIndex) {
        showLocationAnnouncement(DISTRICTS[newIndex].name);
        previousDistrictIndex = game.currentDistrictIndex;
        game.currentDistrictIndex = newIndex;
        transitionProgress = 0;
    }
}

function resize() {
    if (!canvas || !ctx) return;
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    createRain();
}
window.addEventListener("resize", resize);

const PHYSICS = {
    gravity: 1800,
    jumpVelocity: 680,
    autoRunSpeed: 440,
    coyoteTime: 0.12,
    jumpBuffer: 0.14
};

const game = {
    started: false,
    paused: false,
    over: false,
    time: 0,
    score: 0,
    distance: 0,
    style: 0,
    cameraX: 0,
    cameraY: 0,
    worldEnd: 0,
    currentDistrictIndex: 0,
    gravityDirection: 1,
    gravityTimer: 0,
    lives: 2, 
    lastChunkType: -1, // Memory to prevent bad combos
    platforms: [],
    obstacles: [],
    projectiles: [],
    pickups: [],
    particles: [],
    launchPads: [],
    grindRails: [],
    gravityPads: [],
    terminals: [],
    grappleNodes: [],
    rain: [],
    highScore: Number(getStorage("cyberRunnerHighScore", 0)) || 0
};

const BASE_Y = 550; 

const player = {
    x: 180,
    y: 0,
    width: 24,
    height: 54,
    vx: PHYSICS.autoRunSpeed,
    vy: 0,
    maxHp: 8,
    hp: 8,
    maxEnergy: 8,
    energy: 8,
    invincibleTimer: 0,
    grounded: false,
    sliding: false,
    isGrappling: false,
    grappleTarget: null,
    lastGrappleNode: null,
    grappleCooldown: 0,
    coyote: 0,
    jumpBuffer: 0,
    animTime: 0,
    deathTimer: 0,
    jumpsLeft: 2,
    isGrinding: false,

    reset(isCheckpoint = false) {
        if (!isCheckpoint) {
            this.x = 180;
            this.hp = this.maxHp;
            this.energy = this.maxEnergy;
            game.lives = 2;
            PHYSICS.autoRunSpeed = 440;
        } else {
            this.x = game.cameraX + 200;
            this.hp = this.maxHp;
            this.energy = this.maxEnergy;
        }
        this.vx = PHYSICS.autoRunSpeed;
        this.vy = 0;
        this.invincibleTimer = 2.0;
        this.grounded = true;
        this.sliding = false;
        this.isGrappling = false;
        this.grappleTarget = null;
        this.lastGrappleNode = null;
        this.grappleCooldown = 0;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.animTime = 0;
        this.deathTimer = 0;
        this.jumpsLeft = 2;
        this.isGrinding = false;
        game.gravityDirection = 1;
        game.gravityTimer = 0;

        let targetRoofY = BASE_Y;
        const validPlatforms = game.platforms.filter(p => !p.isCeiling && p.x + p.width >= this.x);
        if (validPlatforms.length > 0) {
            validPlatforms.sort((a, b) => a.x - b.x);
            const bestPlat = validPlatforms[0];
            this.x = Math.max(this.x, bestPlat.x + 50);
            targetRoofY = bestPlat.y;
        } else {
            const allFloorPlatforms = game.platforms.filter(p => !p.isCeiling);
            if (allFloorPlatforms.length > 0) {
                allFloorPlatforms.sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
                const nearest = allFloorPlatforms[0];
                this.x = nearest.x + Math.min(60, nearest.width / 2);
                targetRoofY = nearest.y;
            }
        }
        this.y = targetRoofY - this.height;
    },

    getCollisionBox() {
        if (this.sliding) {
            return { x: this.x - 18, y: this.y + (game.gravityDirection === 1 ? 26 : 2), width: 44, height: 26 };
        }
        return { x: this.x - this.width / 2, y: this.y + 4, width: this.width, height: this.height - 4 };
    },

    takeDamage() {
        if (this.invincibleTimer > 0) return;
        this.hp -= 2;
        this.invincibleTimer = 1.2;
        shakeTime = 0.35;
        sound("crash");
        if (this.hp <= 0) {
            handleLifeLoss();
        }
    },

    heal(amount) {
        if (this.hp >= this.maxHp) return false;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        sound("heal");
        createParticles(this.x, this.y + this.height / 2, 20, "#39ff14");
        return true;
    }
};

/* =========================================================
   INPUT CONTROLLER
   ========================================================= */
const input = { jump: false, jumpPressed: false, slide: false, grapple: false, focus: false, left: false, right: false };

window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        if (!input.jump) input.jumpPressed = true;
        input.jump = true;
        e.preventDefault();
    }
    if (["ArrowDown", "KeyS"].includes(e.code)) {
        input.slide = true;
        e.preventDefault();
    }
    if (["ArrowLeft", "KeyA"].includes(e.code)) {
        input.left = true;
    }
    if (["ArrowRight", "KeyD"].includes(e.code)) {
        input.right = true;
    }
    if (e.code === "KeyE") input.grapple = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.focus = true;
    if (["KeyP", "Escape"].includes(e.code)) togglePause();
    if (e.code === "Enter" && game.over && !document.getElementById("gameOverScreen")?.classList.contains("hidden")) {
        startGame();
    } else if ((e.code === "Enter" || e.code === "Space") && !game.started && !game.over) {
        const startScreen = document.getElementById("startScreen");
        const charScreen = document.getElementById("characterScreen");
        if (startScreen && !startScreen.classList.contains("hidden") && (!charScreen || charScreen.classList.contains("hidden"))) {
            startGame();
            e.preventDefault();
        }
    }
});

window.addEventListener("keyup", e => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) input.jump = false;
    if (["ArrowDown", "KeyS"].includes(e.code)) input.slide = false;
    if (["ArrowLeft", "KeyA"].includes(e.code)) input.left = false;
    if (["ArrowRight", "KeyD"].includes(e.code)) input.right = false;
    if (e.code === "KeyE") input.grapple = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.focus = false;
});

window.addEventListener("pointerdown", initAudio, { once: true });

/* =========================================================
   AUDIO SYNTHESIS
   ========================================================= */
let audioCtx = null;
let slideNoiseNode = null;
let slideGainNode = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
}

function startSlideSound() {
    if (!audioCtx || slideNoiseNode) return;
    const bufferSize = audioCtx.sampleRate * 0.8;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    slideNoiseNode = audioCtx.createBufferSource();
    slideNoiseNode.buffer = buffer;
    slideNoiseNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, audioCtx.currentTime);

    slideGainNode = audioCtx.createGain();
    slideGainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);

    slideNoiseNode.connect(filter);
    filter.connect(slideGainNode);
    slideGainNode.connect(audioCtx.destination);
    slideNoiseNode.start();
}

function stopSlideSound() {
    if (slideNoiseNode && slideGainNode) {
        slideGainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
        setTimeout(() => {
            if (slideNoiseNode) {
                try { slideNoiseNode.stop(); slideNoiseNode.disconnect(); } catch (e) {}
                slideNoiseNode = null;
                slideGainNode = null;
            }
        }, 60);
    }
}

const lastSoundAt = {};

function sound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (lastSoundAt[type] !== undefined && now - lastSoundAt[type] < 0.06) return;   // no stacking spam
    lastSoundAt[type] = now;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else if (type === "grapple") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (type === "laser_shoot") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else if (type === "pickup" || type === "hack") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(type === "hack" ? 300 : 520, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else if (type === "heal") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.24);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else if (type === "gravity") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    } else if (type === "crash") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (e) {} };
}

/* =========================================================
   DYNAMIC GENERATION (WITH DIFFICULTY SCALING & MEMORY)
   ========================================================= */
function addPlatform(x, y, width, isCeiling = false) {
    game.platforms.push({ x, y, width, height: 400, isCeiling });
}

function addObstacle(x, y, width, height, type, extra = {}) {
    game.obstacles.push({ x, y, width, height, type, ...extra });
}

function addPickup(x, y, type = "score") {
    game.pickups.push({ x, y, phase: Math.random() * Math.PI * 2, type });
}

function addLaunchPad(x, y) {
    game.launchPads.push({ x, y: y - 10, width: 45, height: 10 });
}

function addGravityPad(x, y, targetDir) {
    game.gravityPads.push({ x, y: targetDir === -1 ? y - 12 : y, width: 50, height: 12, targetDir });
}

function addGrindRail(x, y, width) {
    game.grindRails.push({ x, y, width, height: 6 });
}

function addGrappleNode(x, y) {
    game.grappleNodes.push({ x, y, radius: 24 });
}

function addPuzzleTerminal(x, y, doorId) {
    game.terminals.push({ x, y: y - 32, width: 28, height: 32, doorId, hacked: false });
}

function buildDynamicChunk(startX) {
    let x = startX;
    
    // Choose a random pattern from 0 to 5
    let pattern = Math.floor(Math.random() * 6);
    
    // FIX: Do not spawn a Jump Pad (1) immediately after a Gravity Tunnel (4)
    while (game.lastChunkType === 4 && pattern === 1) {
        pattern = Math.floor(Math.random() * 6); // Re-roll until safe
    }
    
    game.lastChunkType = pattern;
    
    // Calculates a difficulty tier based on distance traveled (0 to 3)
    let difficulty = Math.min(3, Math.floor(startX / 4000));

    if (pattern === 0) {
        // 1. Hacking Terminal & Laser Gate
        const w = 1500; 
        const doorId = "door_" + Math.random().toString(36).substr(2, 5);
        addPlatform(x, BASE_Y, w);
        
        addPuzzleTerminal(x + 500, BASE_Y, doorId);
        addObstacle(x + 950, BASE_Y - 320, 36, 320, "laser_gate", { baseY: BASE_Y, doorId, locked: true });
        
        if (difficulty >= 1) {
            addObstacle(x + 750, BASE_Y - 48, 32, 48, "cyborg_runner", { speed: 100 + difficulty * 15, dir: -1, baseY: BASE_Y, minX: x + 650, maxX: x + 900 });
        }
        
        if (Math.random() < 0.5) addPickup(x + 1100, BASE_Y - 40, "hp");
        x += w;

    } else if (pattern === 1) {
        // 2. High Jump Pad Section
        const w1 = 500;
        addPlatform(x, BASE_Y, w1);
        addLaunchPad(x + w1 - 100, BASE_Y);

        const highY = BASE_Y - 250; 
        const landingWidth = 1800; 
        addPlatform(x + w1 + 30, highY, landingWidth); 
        addObstacle(x + w1 + 600, highY - 48, 32, 48, "cyborg_shooter", { state: "idle", shootTimer: 0, shotFired: false, baseY: highY });
        
        if (difficulty >= 1) {
            addObstacle(x + w1 + 1000, highY - 48, 32, 48, "cyborg_shooter", { state: "idle", shootTimer: 0, shotFired: false, baseY: highY });
        }
        if (difficulty >= 2) {
            addObstacle(x + w1 + 1400, highY - 48, 32, 48, "cyborg_runner", { speed: 130, dir: -1, baseY: highY, minX: x + w1 + 800, maxX: x + w1 + 1600 });
        }
        
        if (Math.random() < 0.5) addPickup(x + w1 + 300, highY - 40, "hp");
        
        x += w1 + landingWidth; 

    } else if (pattern === 2) {
        // 3. Single Swift Grapple Gap 
        const w1 = 400;
        addPlatform(x, BASE_Y, w1);
        
        const gap = 450;
        addGrappleNode(x + w1 + gap / 2, BASE_Y - 180);
        
        const landingWidth = 1500; 
        addPlatform(x + w1 + gap, BASE_Y, landingWidth);
        addObstacle(x + w1 + gap + 300, BASE_Y - 48, 32, 48, "cyborg_runner", {
            speed: 120, dir: -1, baseY: BASE_Y, minX: x + w1 + gap + 50, maxX: x + w1 + gap + 1000
        });

        if (difficulty >= 1) {
            addObstacle(x + w1 + gap + 800, BASE_Y - 48, 32, 48, "cyborg_shooter", { state: "idle", shootTimer: 0, shotFired: false, baseY: BASE_Y });
        }
        if (difficulty >= 2) {
            addObstacle(x + w1 + gap + 1100, BASE_Y - 48, 32, 48, "cyborg_runner", { speed: 140, dir: -1, baseY: BASE_Y, minX: x + w1 + gap + 700, maxX: x + w1 + gap + 1300 });
        }

        x += w1 + gap + landingWidth;

    } else if (pattern === 3) {
        // 4. Multi-Node Grapple Obstacle Course
        const w1 = 200;
        addPlatform(x, BASE_Y, w1);

        const chasmX = x + w1;
        addGrappleNode(chasmX + 200, BASE_Y - 200);
        addGrappleNode(chasmX + 600, BASE_Y - 260);
        addGrappleNode(chasmX + 1000, BASE_Y - 200);

        const landingX = chasmX + 1200;
        const landingWidth = 1500; 
        addPlatform(landingX, BASE_Y, landingWidth);
        addObstacle(landingX + 400, BASE_Y - 48, 32, 48, "cyborg_shooter", { state: "idle", shootTimer: 0, shotFired: false, baseY: BASE_Y });
        
        if (difficulty >= 1) {
            addObstacle(landingX + 800, BASE_Y - 48, 32, 48, "cyborg_runner", { speed: 120, dir: -1, baseY: BASE_Y, minX: landingX + 500, maxX: landingX + 1200 });
        }
        
        if (Math.random() < 0.5) addPickup(landingX + 200, BASE_Y - 40, "hp");

        x = landingX + landingWidth;

    } else if (pattern === 4) {
        // 5. Clean Gravity Tunnel
        const w1 = 300;
        addPlatform(x, BASE_Y, w1);

        const tunnelLen = 2200; 
        const ceilingY = BASE_Y - 280;

        addPlatform(x + w1, ceilingY, tunnelLen, true);
        addPlatform(x + w1, BASE_Y, tunnelLen);

        addGravityPad(x + w1 + 100, BASE_Y, -1);
        addObstacle(x + w1 + 1000, ceilingY, 32, 48, "cyborg_runner", {
            speed: 130, dir: -1, baseY: ceilingY + 48, minX: x + w1 + 500, maxX: x + w1 + 1800, inverted: true
        });
        
        if (difficulty >= 1) {
            addObstacle(x + w1 + 1400, ceilingY, 32, 48, "cyborg_runner", { speed: 150, dir: -1, baseY: ceilingY + 48, minX: x + w1 + 1100, maxX: x + w1 + 1800, inverted: true });
        }
        
        if (Math.random() < 0.5) addPickup(x + w1 + 800, ceilingY + 60, "hp");
        
        addGravityPad(x + w1 + tunnelLen - 200, ceilingY, 1);

        x += w1 + tunnelLen;

    } else {
        // 6. Grind Rail Over Pit
        const w1 = 300;
        const gap = 500;
        addPlatform(x, BASE_Y, w1);
        
        addGrindRail(x + w1 + 50, BASE_Y - 30, gap - 100);
        
        const landingWidth = 1200;
        addPlatform(x + w1 + gap, BASE_Y, landingWidth);
        addObstacle(x + w1 + gap + 300, BASE_Y - 48, 32, 48, "cyborg_shooter", { state: "idle", shootTimer: 0, shotFired: false, baseY: BASE_Y });

        if (difficulty >= 1) {
            addObstacle(x + w1 + gap + 700, BASE_Y - 48, 32, 48, "cyborg_runner", { speed: 130, dir: -1, baseY: BASE_Y, minX: x + w1 + gap + 400, maxX: x + w1 + gap + 1000 });
        }

        x += w1 + gap + landingWidth;
    }

    return x;
}

function generateWorld() {
    game.platforms = [];
    game.obstacles = [];
    game.projectiles = [];
    game.pickups = [];
    game.launchPads = [];
    game.grindRails = [];
    game.gravityPads = [];
    game.terminals = [];
    game.grappleNodes = [];

    addPlatform(-1000, BASE_Y, 3000);
    let x = 2000;
    for (let i = 0; i < 10; i++) {
        x = buildDynamicChunk(x);
    }
    game.worldEnd = x;
}

function extendWorld() {
    if (player.x > game.worldEnd - 3500) {
        let x = game.worldEnd;
        for (let i = 0; i < 6; i++) {
            x = buildDynamicChunk(x);
        }
        game.worldEnd = x;
    }
}

/* =========================================================
   PHYSICS & UPDATES
   ========================================================= */
function updatePlayer(dt) {
    if (player.invincibleTimer > 0) player.invincibleTimer -= dt;

    if (input.focus && player.energy > 0) {
        game.isFocusing = true;
        player.energy = Math.max(0, player.energy - dt * 2.5);
    } else {
        game.isFocusing = false;
        if (!input.focus && player.energy < player.maxEnergy) {
            player.energy = Math.min(player.maxEnergy, player.energy + dt * 1.0);
        }
    }
    const timeScale = game.isFocusing ? 0.5 : 1.0;
    const scaledDt = dt * timeScale;

    // Faster speed scaling & Higher Cap for extra difficulty
    PHYSICS.autoRunSpeed = Math.min(680, PHYSICS.autoRunSpeed + dt * 1.5);

    if (game.gravityTimer > 0) {
        game.gravityTimer -= scaledDt;
        if (game.gravityTimer <= 0) {
            game.gravityDirection = 1;
        }
    }

    if (input.jumpPressed) player.jumpBuffer = PHYSICS.jumpBuffer;
    player.jumpBuffer -= scaledDt;

    if (player.grounded) {
        player.coyote = PHYSICS.coyoteTime;
        player.jumpsLeft = 2;
        player.isGrinding = false;
    } else {
        player.coyote -= scaledDt;
    }

    // --- GRAPPLE SWING LOGIC ---
    if (player.grappleCooldown > 0) player.grappleCooldown -= dt;

    if (input.grapple && !player.isGrappling && !(player.grappleCooldown > 0)) {
        let nearestNode = null;
        let minDist = 450;
        for (const node of game.grappleNodes) {
            // Only latch onto nodes ahead of the runner, never the one we just let go of
            if (node.x < player.x + 40 || node === player.lastGrappleNode) continue;
            const dist = Math.hypot(node.x - player.x, node.y - player.y);
            if (dist < minDist) {
                minDist = dist;
                nearestNode = node;
            }
        }
        if (nearestNode) {
            player.isGrappling = true;
            player.grappleTarget = nearestNode;
            sound("grapple");
            createParticles(nearestNode.x, nearestNode.y, 15, "#00f0ff");
        }
    }

    let speedMod = 1.0;
    if (input.left) speedMod = 0.75;
    else if (input.right) speedMod = 1.25;

    if (player.isGrappling && player.grappleTarget) {
        const target = player.grappleTarget;
        const angle = Math.atan2(target.y - player.y, target.x - player.x);
        player.vx = Math.cos(angle) * 800;
        player.vy = Math.sin(angle) * 800;
        player.grounded = false;

        if (input.jumpPressed || Math.hypot(target.x - player.x, target.y - player.y) < 45 || player.x > target.x + 30) {
            player.isGrappling = false;
            player.vy = -PHYSICS.jumpVelocity * 0.85;
            player.vx = (PHYSICS.autoRunSpeed + 150) * speedMod;
            player.lastGrappleNode = target;
            player.grappleCooldown = 0.25;
            player.grappleTarget = null;
        }
    } else {
        player.vx = PHYSICS.autoRunSpeed * speedMod;
    }

    const wasSliding = player.sliding;
    player.sliding = input.slide && (player.grounded || player.isGrinding);

    if (player.sliding && !wasSliding) startSlideSound();
    else if (!player.sliding && wasSliding) stopSlideSound();

    const gDir = game.gravityDirection;

    // --- JUMPING & DOUBLE JUMP ---
    if (player.jumpBuffer > 0 && !player.isGrappling) {
        if (player.grounded || player.coyote > 0) {
            if (input.slide) {
                player.vy = -PHYSICS.jumpVelocity * 0.75 * gDir;
                createParticles(player.x, player.y + (gDir === 1 ? player.height : 0), 16, "#ffe600");
            } else {
                player.vy = -PHYSICS.jumpVelocity * gDir;
                createParticles(player.x, player.y + (gDir === 1 ? player.height : 0), 10, "#ff007f");
            }
            player.grounded = false;
            player.coyote = 0;
            player.jumpBuffer = 0;
            player.jumpsLeft = 1;
            sound("jump");
            stopSlideSound();
        } else if (player.jumpsLeft > 0) {
            player.vy = -PHYSICS.jumpVelocity * 0.88 * gDir;
            player.jumpsLeft = 0;
            player.jumpBuffer = 0;
            sound("jump");
            createParticles(player.x, player.y + (gDir === 1 ? player.height : 0), 16, "#00f0ff");
        }
    }

    if (!player.isGrappling) {
        player.vy += PHYSICS.gravity * gDir * scaledDt;
        if (!input.jump && ((gDir === 1 && player.vy < -250) || (gDir === -1 && player.vy > 250))) {
            player.vy += 950 * gDir * scaledDt;
        }
    }

    player.x += player.vx * scaledDt;
    player.y += player.vy * scaledDt;

    const feet = gDir === 1 ? player.y + player.height : player.y;
    let landed = false;

    for (const roof of game.platforms) {
        if (player.x > roof.x - 8 && player.x < roof.x + roof.width + 8) {
            if (gDir === 1 && !roof.isCeiling) {
                if (player.vy >= 0 && feet >= roof.y && feet <= roof.y + 40) {
                    player.y = roof.y - player.height;
                    player.vy = 0;
                    landed = true;
                    break;
                }
            } else if (gDir === -1 && roof.isCeiling) {
                if (player.vy <= 0 && feet <= roof.y && feet >= roof.y - 40) {
                    player.y = roof.y;
                    player.vy = 0;
                    landed = true;
                    break;
                }
            }
        }
    }

    player.isGrinding = false;
    for (const rail of game.grindRails) {
        if (player.x > rail.x && player.x < rail.x + rail.width && player.vy * gDir >= 0 && Math.abs(feet - rail.y) < 24) {
            player.y = gDir === 1 ? rail.y - player.height : rail.y;
            player.vy = 0;
            landed = true;
            player.isGrinding = true;
            createParticles(player.x - 10, feet, 2, "#ffe600");
            break;
        }
    }

    player.grounded = landed;

    for (const pad of game.launchPads) {
        const risingAlready = (player.vy * gDir) < 0;               // already launched / jumping up
        const onCooldown = pad.lastHit !== undefined && game.time - pad.lastHit < 0.5;
        if (!risingAlready && !onCooldown &&
            player.x > pad.x && player.x < pad.x + pad.width && Math.abs(feet - pad.y) < 25) {
            pad.lastHit = game.time;
            player.vy = -PHYSICS.jumpVelocity * LAUNCH_PAD_BOOST * gDir;
            player.grounded = false;
            sound("pickup");
            createParticles(player.x, feet, 35, "#39ff14");
            break;
        }
    }

    for (const gPad of game.gravityPads) {
        if (player.x > gPad.x && player.x < gPad.x + gPad.width && Math.abs(feet - gPad.y) < 32) {
            if (game.gravityDirection !== gPad.targetDir) {
                game.gravityDirection = gPad.targetDir;
                game.gravityTimer = 6.0; 
                player.grounded = false;
                player.vy = -PHYSICS.jumpVelocity * 1.4 * game.gravityDirection; 
                sound("gravity");
                createParticles(player.x, feet, 20, "#9d00ff");
                break;
            }
        }
    }

    for (const term of game.terminals) {
        if (!term.hacked && Math.abs(player.x - term.x) < 75 && Math.abs(player.y - term.y) < 150) {
            term.hacked = true;
            sound("hack");
            createParticles(term.x, term.y, 30, "#00f0ff");
            
            game.style += 600;
            PHYSICS.autoRunSpeed = Math.min(600, PHYSICS.autoRunSpeed + 30); 

            for (const o of game.obstacles) {
                if (o.doorId === term.doorId) o.locked = false;
            }
        }
    }

    if (player.y > BASE_Y + 350 || player.y < -150) {
        handleLifeLoss();
        return;
    }

    updateObstacles(scaledDt);
    updateProjectiles(scaledDt);
    checkPickups();

    game.distance = Math.max(0, (player.x - 180) / 10);
    game.score = Math.floor(game.distance * 1.5 + game.style);

    updateRandomLocation();

    player.animTime += scaledDt;
    if (transitionProgress < 1) {
    transitionProgress = Math.min(
        1,
        transitionProgress + scaledDt / transitionDuration
    );
}
}

function handleLifeLoss() {
    game.lives--;
    if (game.lives > 0) {
        player.reset(true);
        sound("crash");
    } else {
        endGame();
    }
}

function updateObstacles(dt) {
    const p = player.getCollisionBox();

    for (const o of game.obstacles) {
        if (o.type === "cyborg_runner") {
            o.x += o.speed * o.dir * dt;
            if (o.dir === -1 && o.x <= o.minX) o.dir = 1;
            else if (o.dir === 1 && o.x >= o.maxX) o.dir = -1;
        }

        if (o.type === "cyborg_shooter") {
            const dist = o.x - player.x;
            if (dist > 0 && dist < 650) {
                o.state = "shooting";
                o.shootTimer = (o.shootTimer || 0) + dt;
                
                if (o.shootTimer > 0.35 && !o.shotFired) {
                    o.shotFired = true;
                    sound("laser_shoot");
                    game.projectiles.push({ x: o.x - 10, y: o.y + 16, vx: -650, width: 32, height: 8 });
                }
                if (o.shootTimer > 1.35) {
                    o.shotFired = false;
                    o.shootTimer = 0;
                }
            } else {
                o.state = "idle";
                o.shotFired = false;
                o.shootTimer = 0;
            }
        }

        if (o.type === "laser_gate" && o.locked === false) continue;

        if (p.x < o.x + o.width && p.x + p.width > o.x && p.y < o.y + o.height && p.y + p.height > o.y) {
            if (o.type === "laser_gate" && !o.locked && player.sliding) {
                game.style += 10;
                continue;
            }
            player.takeDamage();
            return;
        }
    }
}

function updateProjectiles(dt) {
    const p = player.getCollisionBox();

    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const proj = game.projectiles[i];
        proj.x += proj.vx * dt;

        if (p.x < proj.x + proj.width && p.x + p.width > proj.x && p.y < proj.y + proj.height && p.y + p.height > proj.y) {
            game.projectiles.splice(i, 1);
            player.takeDamage();
            return;
        }
        if (proj.x < game.cameraX - 200) game.projectiles.splice(i, 1);
    }
}

function checkPickups() {
    for (let i = game.pickups.length - 1; i >= 0; i--) {
        const pickup = game.pickups[i];
        const dx = pickup.x - player.x;
        const dy = pickup.y - (player.y + 25);

        if (Math.abs(dx) < 45 && Math.abs(dy) < 55) {
            if (pickup.type === "hp") {
                player.heal(2);
                game.pickups.splice(i, 1);
            } else {
                game.style += 350;
                player.energy = Math.min(player.maxEnergy, player.energy + 1.5);
                PHYSICS.autoRunSpeed = Math.min(640, PHYSICS.autoRunSpeed + 10);
                sound("pickup");
                createParticles(pickup.x, pickup.y, 20, "#ffe600");
                game.pickups.splice(i, 1);
            }
        }
    }
}

/* =========================================================
   CAMERA & RENDER
   ========================================================= */
function updateCamera(dt) {
    const targetX = player.x - W * 0.35 + (player.vx * 0.25);
    game.cameraX += (targetX - game.cameraX) * Math.min(1, dt * 4.0);

    const targetY = player.y - H * (game.gravityDirection === 1 ? 0.48 : 0.42);
    game.cameraY += (targetY - game.cameraY) * Math.min(1, dt * 3.5);
}

// Launch pad strength. 1.68 keeps the same jump height the pads had before the retrigger fix
// (the old bug re-launched for 2-3 frames, which added a little extra height).
const LAUNCH_PAD_BOOST = 1.68;

const MAX_PARTICLES = 180;

function createParticles(x, y, amount, color = "#00f0ff") {
    amount = Math.min(amount, MAX_PARTICLES - game.particles.length);   // hard cap
    for (let i = 0; i < amount; i++) {
        game.particles.push({
            x, y,
            vx: -90 + Math.random() * 180,
            vy: -170 + Math.random() * 90,
            life: 0.28 + Math.random() * 0.35,
            size: 2 + Math.random() * 2.5,
            color
        });
    }
}

function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 520 * game.gravityDirection * dt;
        if (p.life <= 0) game.particles.splice(i, 1);
    }
}

function createRain() {
    game.rain = [];
    for (let i = 0; i < 140; i++) {
        game.rain.push({
            x: Math.random() * W,
            y: Math.random() * H,
            speed: 450 + Math.random() * 500,
            length: 12 + Math.random() * 18
        });
    }
}

function updateRain(dt) {
    for (const r of game.rain) {
        r.y += r.speed * game.gravityDirection * dt;
        r.x -= r.speed * 0.06 * dt;
        if (game.gravityDirection === 1 && r.y > H + 30) {
            r.y = -30;
            r.x = Math.random() * W;
        } else if (game.gravityDirection === -1 && r.y < -30) {
            r.y = H + 30;
            r.x = Math.random() * W;
        }
    }
}

function drawParallax(img, speed) {
    if (!img || !img.complete || !img.naturalWidth) return;

    const scale = Math.max(W / img.width, H / img.height);
    const width = img.width * scale;
    const height = img.height * scale;
    const y = (H - height) / 2;

    // Background moves slower than the camera - ensure positive modulo
    const offset = ((game.cameraX * speed) % width + width) % width;
    const x = -offset;

    ctx.drawImage(img, x, y, width, height);
    ctx.drawImage(img, x + width, y, width, height);
    if (x + width < W) {
        ctx.drawImage(img, x + width * 2, y, width, height);
    }
}

function drawBackground() {
    if (!ctx) return;

    function drawDistrict(index, alpha) {
        const d = DISTRICTS[index];
        const img = districtImages[index];

        ctx.globalAlpha = alpha;

        if (img.complete && img.naturalWidth > 0) {
            const scale = Math.max(W / img.width, H / img.height);
            const width = img.width * scale;
            const height = img.height * scale;
            const y = (H - height) / 2;

            const offset = ((game.cameraX * 0.15) % width + width) % width;
            const x = -offset;

            ctx.drawImage(img, x, y, width, height);
            ctx.drawImage(img, x + width, y, width, height);
            if (x + width < W) {
                ctx.drawImage(img, x + width * 2, y, width, height);
            }
        } else {
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, d.skyTop);
            sky.addColorStop(1, d.skyBottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);
        }
    }

    if (transitionProgress >= 1) {
        drawDistrict(game.currentDistrictIndex, 1);
    } else {
        drawDistrict(previousDistrictIndex, 1 - transitionProgress);
        drawDistrict(game.currentDistrictIndex, transitionProgress);
    }

    ctx.globalAlpha = 1;
}

function drawPlatforms() {
    if (!ctx) return;
    const d = DISTRICTS[game.currentDistrictIndex];

    for (const roof of game.platforms) {
        const x = roof.x - game.cameraX;
        const y = roof.y - game.cameraY;
        if (x + roof.width < -100 || x > W + 100) continue;

        ctx.fillStyle = d.platformColor;
        ctx.fillRect(x, roof.isCeiling ? y - roof.height : y, roof.width, roof.height);

        ctx.save();
        ctx.fillStyle = d.platformEdge;
        ctx.shadowColor = d.platformEdge;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, roof.isCeiling ? y - 3 : y, roof.width, 3);
        ctx.restore();
    }

    for (const node of game.grappleNodes) {
        const nx = node.x - game.cameraX;
        const ny = node.y - game.cameraY;
        if (nx < -50 || nx > W + 50) continue;

        ctx.save();
        ctx.fillStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    if (player.isGrappling && player.grappleTarget) {
        ctx.save();
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(player.x - game.cameraX, player.y + 20 - game.cameraY);
        ctx.lineTo(player.grappleTarget.x - game.cameraX, player.grappleTarget.y - game.cameraY);
        ctx.stroke();
        ctx.restore();
    }

    for (const rail of game.grindRails) {
        const x = rail.x - game.cameraX;
        const y = rail.y - game.cameraY;
        if (x + rail.width < -100 || x > W + 100) continue;

        ctx.save();
        ctx.fillStyle = "#ffe600";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 12;
        ctx.fillRect(x, y, rail.width, 4);
        ctx.fillStyle = "rgba(255, 230, 0, 0.35)";
        ctx.fillRect(x + 20, y, 4, 180);
        ctx.fillRect(x + rail.width - 24, y, 4, 180);
        ctx.restore();
    }

    for (const pad of game.launchPads) {
        const x = pad.x - game.cameraX;
        const y = pad.y - game.cameraY;
        if (x + pad.width < -100 || x > W + 100) continue;

        ctx.save();
        ctx.fillStyle = "#39ff14";
        ctx.shadowColor = "#39ff14";
        ctx.shadowBlur = 14;
        ctx.fillRect(x, y, pad.width, pad.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 8);
        ctx.lineTo(x + pad.width / 2, y + 2);
        ctx.lineTo(x + pad.width - 12, y + 8);
        ctx.stroke();
        ctx.restore();
    }

    for (const gPad of game.gravityPads) {
        const x = gPad.x - game.cameraX;
        const y = gPad.y - game.cameraY;
        if (x + gPad.width < -100 || x > W + 100) continue;

        ctx.save();
        ctx.fillStyle = "#9d00ff";
        ctx.shadowColor = "#9d00ff";
        ctx.shadowBlur = 18;
        ctx.fillRect(x, y, gPad.width, gPad.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 15, gPad.targetDir === -1 ? y + 9 : y + 3);
        ctx.lineTo(x + gPad.width / 2, gPad.targetDir === -1 ? y + 3 : y + 9);
        ctx.lineTo(x + gPad.width - 15, gPad.targetDir === -1 ? y + 9 : y + 3);
        ctx.stroke();
        ctx.restore();
    }

    for (const term of game.terminals) {
        const x = term.x - game.cameraX;
        const y = term.y - game.cameraY;
        ctx.save();
        ctx.fillStyle = term.hacked ? "#00f0ff" : "#ff0055";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, y, term.width, term.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "9px 'Share Tech Mono', monospace";
        ctx.fillText(term.hacked ? "OPEN" : "HACK", x + 2, y - 6);
        ctx.restore();
    }
}

function drawObstacles() {
    if (!ctx) return;
    for (const o of game.obstacles) {
        const x = o.x - game.cameraX;
        const y = o.y - game.cameraY;
        if (x + o.width < -100 || x > W + 100) continue;

        if (o.type === "cyborg_shooter") {
            ctx.save();
            ctx.translate(x + o.width + 14, y - 6);
            ctx.scale(-1, 1);
            if (o.state === "shooting" && cyborgAttack.complete && cyborgAttack.naturalWidth > 0) {
                const frame = Math.min(7, Math.floor(o.shootTimer * 12));
                ctx.drawImage(cyborgAttack, frame * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, 60, 60);
            } else if (cyborgIdle.complete && cyborgIdle.naturalWidth > 0) {
                const frame = Math.floor(game.time * 4) % 4;
                ctx.drawImage(cyborgIdle, frame * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, 60, 60);
            }
            ctx.restore();
        } else if (o.type === "cyborg_runner") {
            ctx.save();
            ctx.translate(x + (o.dir === -1 ? o.width + 12 : -12), y - 6);
            ctx.scale(o.dir, o.inverted ? -1 : 1);
            if (cyborgRun.complete && cyborgRun.naturalWidth > 0) {
                const frame = Math.floor(game.time * 10) % 6;
                ctx.drawImage(cyborgRun, frame * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, 60, 60);
            }
            ctx.restore();
        } else if (o.type === "laser_gate") {
            if (o.locked === false) continue;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = "#ff007f";
            ctx.shadowColor = "#ff007f";
            ctx.shadowBlur = 18;

            const pulse = 0.5 + Math.sin(game.time * 14) * 0.5;
            ctx.fillRect(x, y, 6, o.height);
            ctx.fillRect(x + o.width - 6, y, 6, o.height);

            ctx.fillStyle = `rgba(255, 0, 127, ${0.45 + pulse * 0.55})`;
            ctx.fillRect(x + 4, y + 4, o.width - 8, o.height - 8);

            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            for (let ly = y + 10; ly < y + o.height - 10; ly += 24) {
                ctx.fillRect(x + 6, ly, o.width - 12, 2);
            }
            ctx.restore();
        }
    }
}

function drawProjectiles() {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const proj of game.projectiles) {
        const x = proj.x - game.cameraX;
        const y = proj.y - game.cameraY;
        ctx.fillStyle = "#ff007f";
        ctx.shadowColor = "#ff007f";
        ctx.shadowBlur = 18;
        ctx.fillRect(x, y, proj.width, proj.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 4, y + 2, proj.width - 8, proj.height - 4);
    }
    ctx.restore();
}

function drawPickups() {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const pickup of game.pickups) {
        const x = pickup.x - game.cameraX;
        const y = pickup.y - game.cameraY + Math.sin(game.time * 4.5 + pickup.phase) * 8;

        ctx.save();
        ctx.translate(x, y);

        if (pickup.type === "hp") {
            ctx.strokeStyle = "#39ff14";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#39ff14";
            ctx.shadowBlur = 16;
            ctx.strokeRect(-9, -9, 18, 18);

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillRect(-2, -6, 4, 12);
        } else {
            ctx.rotate(game.time * 2.5);
            ctx.strokeStyle = "#ffe600";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#ffe600";
            ctx.shadowBlur = 16;
            ctx.strokeRect(-7, -7, 14, 14);
        }

        ctx.restore();
    }

    ctx.restore();
}

function drawPlayer() {
    if (!ctx) return;
    const x = player.x - game.cameraX;
    const gDir = game.gravityDirection;
    const feet = player.y + (gDir === 1 ? player.height : 0) - game.cameraY;

    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 16) % 2 === 0) return;

    // Pick animation + frame
    let anim, frame;
    if (game.over) {
        anim = "death";
        frame = Math.floor(player.deathTimer * 8);
    } else if (player.sliding) {
        anim = "slide";
        frame = Math.floor(player.animTime * 14);
    } else if (!player.grounded) {
        anim = "jump";
        frame = (player.vy * gDir) < 0 ? 0 : 2;
    } else {
        anim = "run";
        frame = Math.abs(player.vx) > 10
            ? Math.floor(player.animTime * (Math.abs(player.vx) / 22))
            : 0;
    }

    const sheet = getSheet(selectedCharacter, anim);
    if (!sheet) return;
    const c = sheet.c;
    frame = anim === "death" ? Math.min(sheet.frames - 1, frame)
          : anim === "jump"  ? Math.min(sheet.frames - 1, frame)
          : frame % sheet.frames;

    const dh = c.size;
    const dw = c.size * (sheet.fw / sheet.fh);
    const yo = c.yOffset[anim] || 0;

    ctx.save();
    ctx.translate(x, feet);
    ctx.scale(1, gDir);
    ctx.imageSmoothingEnabled = !c.pixel;
    ctx.drawImage(sheet.img, frame * sheet.fw, 0, sheet.fw, sheet.fh,
                  c.offsetX - dw / 2, -dh + yo, dw, dh);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
}

function drawParticles() {
    if (!ctx || game.particles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;   // canvas shadowBlur per particle is very slow - fake the glow with a soft square
    for (const p of game.particles) {
        const x = p.x - game.cameraX;
        const y = p.y - game.cameraY;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const a = Math.min(1, Math.max(0, p.life * 3));
        ctx.fillStyle = p.color || "#00f0ff";
        ctx.globalAlpha = a * 0.22;
        ctx.fillRect(x - p.size, y - p.size, p.size * 3, p.size * 3);
        ctx.globalAlpha = a;
        ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.restore();
}

function drawRain() {
    if (!ctx) return;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.22)";
    ctx.lineWidth = 1.2;
    for (const r of game.rain) {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 4, r.y + (r.length * game.gravityDirection));
        ctx.stroke();
    }
}

function draw() {
    if (!ctx) return;
    ctx.save();
    if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    drawBackground();
    drawPlatforms();
    drawObstacles();
    drawProjectiles();
    drawPickups();
    drawParticles();
    drawPlayer();
    drawRain();
    ctx.restore();
}

function cleanup() {
    const cutoff = game.cameraX - 1200;
    game.platforms = game.platforms.filter(p => p.x + p.width > cutoff);
    game.obstacles = game.obstacles.filter(o => o.x + o.width > cutoff);
    game.pickups = game.pickups.filter(p => p.x > cutoff);
    game.launchPads = game.launchPads.filter(l => l.x + l.width > cutoff);
    game.grindRails = game.grindRails.filter(g => g.x + g.width > cutoff);
    game.gravityPads = game.gravityPads.filter(g => g.x + g.width > cutoff);
    game.terminals = game.terminals.filter(t => t.x + t.width > cutoff);
    game.grappleNodes = game.grappleNodes.filter(n => n.x > cutoff);
}

function updateHUD() {
    const scoreEl = document.getElementById("score");
    if (scoreEl) scoreEl.textContent = String(Math.floor(game.score)).padStart(6, "0");
    
    const distEl = document.getElementById("distance");
    if (distEl) distEl.textContent = String(Math.floor(game.distance)).padStart(4, "0") + " M";

    const hpCells = document.querySelectorAll("#hpGauge .gaugeCell");
    if (hpCells) {
        hpCells.forEach((cell, idx) => {
            if (idx < player.hp) cell.classList.add("hpActive");
            else cell.classList.remove("hpActive");
        });
    }

    const energyCells = document.querySelectorAll("#energyGauge .gaugeCell");
    if (energyCells) {
        const activeEnergy = Math.ceil(player.energy);
        energyCells.forEach((cell, idx) => {
            if (idx < activeEnergy) cell.classList.add("energyActive");
            else cell.classList.remove("energyActive");
        });
    }

    const speedEl = document.getElementById("speed");
    if (speedEl) {
        const factor = (player.vx / 440) * (game.isFocusing ? 0.5 : 1.0);
        speedEl.textContent = factor.toFixed(2) + "x";
    }
    
    const districtEl = document.getElementById("districtLabel");

    if (districtEl) {
        districtEl.textContent =
            DISTRICTS[game.currentDistrictIndex].name;
    }
}

function startGame() {
    initAudio();
    if (bgm && bgm.paused) {
        bgm.play().catch(err => console.log("Audio autoplay blocked until interaction."));
    }

    game.started = true;
    game.paused = false;
    game.over = false;
    game.time = 0;
    game.score = 0;
    game.distance = 0;
    game.style = 0;
    game.cameraX = 0;
    game.cameraY = 0;
    shuffleLocations();
    currentLocationCycle = 0;
    game.currentDistrictIndex = locationOrder[0];
    game.lastChunkType = -1; // Reset memory on new game

    generateWorld();
    player.reset(false);

    stopCharPreview();
    document.getElementById("characterScreen")?.classList.add("hidden");
    document.getElementById("startScreen")?.classList.add("hidden");
    document.getElementById("pauseScreen")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    document.getElementById("hud")?.classList.remove("hidden");
    updateHUD();
}

function endGame() {
    if (game.over) return;
    game.over = true;
    game.started = false;
    stopSlideSound();
    sound("crash");
    if (bgm) bgm.pause();

    if (game.score > game.highScore) {
        game.highScore = Math.floor(game.score);
        setStorage("cyberRunnerHighScore", game.highScore);
    }

    const fs = document.getElementById("finalScore");
    if (fs) fs.textContent = Math.floor(game.score);
    const fd = document.getElementById("finalDistance");
    if (fd) fd.textContent = Math.floor(game.distance) + "m";
    const fhs = document.getElementById("finalHighScore");
    if (fhs) fhs.textContent = game.highScore;
    document.getElementById("hud")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.remove("hidden");
}

function togglePause() {
    if (!game.started || game.over) return;
    game.paused = !game.paused;
    if (game.paused) {
        stopSlideSound();
        if (bgm) bgm.pause();
    } else {
        if (bgm) bgm.play();
    }
    document.getElementById("pauseScreen")?.classList.toggle("hidden", !game.paused);
}

/* =========================================================
   MENU FLOW:  START -> [PLAY | CHARACTERS] -> game
   ========================================================= */
let charPreviewTimer = null;
let charPreviewTick = 0;

function showStartStage(stage) { // "start" | "menu"
    document.getElementById("startStage")?.classList.toggle("hidden", stage !== "start");
    document.getElementById("menuStage")?.classList.toggle("hidden", stage !== "menu");
    const label = document.getElementById("selectedCharName");
    if (label) label.textContent = selectedCharacter.name;
}

function selectCharacter(id) {
    selectedCharacter = CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
    setStorage("cyberRunnerCharacter", selectedCharacter.id);
    document.querySelectorAll(".charCard").forEach(card => {
        const on = card.dataset.id === selectedCharacter.id;
        card.classList.toggle("selected", on);
        card.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const label = document.getElementById("selectedCharName");
    if (label) label.textContent = selectedCharacter.name;
}

function buildCharacterGrid() {
    const grid = document.getElementById("characterGrid");
    if (!grid || grid.childElementCount) return;
    CHARACTERS.forEach(c => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "charCard";
        card.dataset.id = c.id;
        card.innerHTML =
            '<span class="charBadge">SELECTED</span>' +
            '<canvas width="120" height="120"></canvas>' +
            '<span class="charName"></span>' +
            '<span class="charRole"></span>';
        card.querySelector(".charName").textContent = c.name;
        card.querySelector(".charRole").textContent = c.role;
        card.addEventListener("click", () => selectCharacter(c.id));
        grid.appendChild(card);
    });
    selectCharacter(selectedCharacter.id);
}

function drawCharacterPreviews() {
    document.querySelectorAll(".charCard").forEach(card => {
        const char = CHARACTERS.find(c => c.id === card.dataset.id);
        const cv = card.querySelector("canvas");
        const g = cv.getContext("2d");
        g.clearRect(0, 0, cv.width, cv.height);
        const sheet = getSheet(char, "idle");
        if (!sheet) return;
        const c = sheet.c;
        const dh = c.size * 1.8;
        const dw = dh * (sheet.fw / sheet.fh);
        const frame = charPreviewTick % sheet.frames;
        g.imageSmoothingEnabled = !c.pixel;
        g.drawImage(sheet.img, frame * sheet.fw, 0, sheet.fw, sheet.fh,
                    (cv.width - dw) / 2, cv.height - dh - 2, dw, dh);
    });
}

function startCharPreview() {
    stopCharPreview();
    charPreviewTick = 0;
    drawCharacterPreviews();
    charPreviewTimer = setInterval(() => { charPreviewTick++; drawCharacterPreviews(); }, 140);
}

function stopCharPreview() {
    if (charPreviewTimer) { clearInterval(charPreviewTimer); charPreviewTimer = null; }
}

function openCharacterScreen() {
    buildCharacterGrid();
    document.getElementById("startScreen")?.classList.add("hidden");
    document.getElementById("characterScreen")?.classList.remove("hidden");
    startCharPreview();
}

function closeCharacterScreen() {
    stopCharPreview();
    document.getElementById("characterScreen")?.classList.add("hidden");
    showStartStage("menu");
    document.getElementById("startScreen")?.classList.remove("hidden");
}

function backToMainMenu() { // from game-over / pause
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    document.getElementById("pauseScreen")?.classList.add("hidden");
    document.getElementById("hud")?.classList.add("hidden");
    showStartStage("menu");
    document.getElementById("startScreen")?.classList.remove("hidden");
}

const btnStart = document.getElementById("startButton");
const btnRestart = document.getElementById("restartButton");
const btnPause = document.getElementById("pauseButton");
const btnResume = document.getElementById("resumeButton");

if (btnStart) btnStart.addEventListener("click", () => showStartStage("menu"));
document.getElementById("playButton")?.addEventListener("click", startGame);
document.getElementById("charactersButton")?.addEventListener("click", openCharacterScreen);
document.getElementById("charBackButton")?.addEventListener("click", closeCharacterScreen);
document.getElementById("charPlayButton")?.addEventListener("click", startGame);
document.getElementById("menuButton")?.addEventListener("click", backToMainMenu);
showStartStage("start");
if (btnRestart) btnRestart.addEventListener("click", startGame);
if (btnPause) btnPause.addEventListener("click", togglePause);
if (btnResume) btnResume.addEventListener("click", togglePause);

resize();
game.lastRoofY = BASE_Y;
addPlatform(-1000, BASE_Y, 5000);
player.y = BASE_Y - player.height;
draw();

let previous = performance.now();
function loop(now) {
    if (!now) now = performance.now();
    let dt = (now - previous) / 1000;
    previous = now;
    dt = Math.min(dt, 0.033);

    if (shakeTime > 0) shakeTime -= dt;

    if (game.started && !game.paused && !game.over) {
        game.time += dt;
        updatePlayer(dt);
        updateCamera(dt);
        updateParticles(dt);
        updateRain(dt);
        extendWorld();
        cleanup();
        updateHUD();
    } else {
        if (game.over) player.deathTimer += dt;
        updateRain(dt * 0.3);
    }

    draw();
    input.jumpPressed = false;
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);