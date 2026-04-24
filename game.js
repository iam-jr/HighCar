// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

if (!ctx) {
    alert('Canvas not supported on this device');
    console.error('Canvas context not available');
} else {
    console.log('Canvas initialized successfully');
}

// Initialize canvas with responsive size
function initCanvas() {
    const viewport = getViewportSize();
    canvas.width = Math.max(280, Math.min(viewport.width - 20, 1000));
    canvas.height = Math.max(200, Math.min(viewport.height - 100, 700));
    console.log(`Initial canvas size: ${canvas.width}x${canvas.height}`);
}

initCanvas();

// Game variables
let score = 0;
let lives = 3;
let level = 1;
let fuel = 100;
let cargo = 0;
let powerUpActive = false;
let powerUpType = '';
let powerUpTimer = 0;
let gameRunning = false;
let paused = false;

const LEADERBOARD_KEY = 'high-car-leaderboard-v1';
const PLAYER_IDS_KEY = 'high-car-player-ids-v1';
const LAST_ACCESS_KEY = 'high-car-last-access-v1';
const PRESET_PLAYER_IDS = {
    jr: '001',
    driver: '002',
    racer: '003',
    logistic: '004'
};
const FIXED_PLAYER_ID_KEYS = new Set(Object.keys(PRESET_PLAYER_IDS));
const defaultLeaderboard = [
    {
        name: 'JR',
        playerId: '001',
        score: 5000,
        level: 5,
        lives: 2,
        date: '2026-03-31'
    },
    {
        name: 'Driver',
        playerId: '002',
        score: 4200,
        level: 4,
        lives: 1,
        date: '2026-03-30'
    },
    {
        name: 'Racer',
        playerId: '003',
        score: 3500,
        level: 3,
        lives: 3,
        date: '2026-03-29'
    },
    {
        name: 'Logistic',
        playerId: '004',
        score: 2800,
        level: 2,
        lives: 1,
        date: '2026-03-28'
    }
];

let playerIdsByName = loadPlayerIds();
let leaderboard = loadLeaderboard();
let highScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
let currentPlayerName = '';
let currentPlayerId = '';

// DOM elements
const highScoreEl = document.getElementById('highScore');
const startScreenEl = document.getElementById('startScreen');
const startLeaderboardBodyEl = document.getElementById('startLeaderboardBody');
const endLeaderboardBodyEl = document.getElementById('endLeaderboardBody');
const startGameBtn = document.getElementById('startGameBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const gameContainerEl = document.querySelector('.game-container');
const promoStripEl = document.getElementById('promoStrip');
const playerNameInputEl = document.getElementById('playerNameInput');
const playerCodeInputEl = document.getElementById('playerCodeInput');
const nameErrorEl = document.getElementById('nameError');

// Player car
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 30,
    speed: 6,
    color: '#ff6600'
};

// Resize canvas
function getViewportSize() {
    const innerWidth = window.innerWidth || document.documentElement.clientWidth;
    const innerHeight = window.innerHeight || document.documentElement.clientHeight;

    // Handle mobile viewport issues
    let height = innerHeight;
    if (window.visualViewport) {
        height = Math.min(innerHeight, window.visualViewport.height);
    }

    return {
        width: innerWidth,
        height: height
    };
}

function resizeCanvas() {
    try {
        const viewport = getViewportSize();
        const isPhone = viewport.width <= 760;
        const isTablet = viewport.width > 760 && viewport.width <= 1024;
        const viewportWidth = Math.max(280, Math.floor(viewport.width));
        const headerHeight = document.querySelector('.game-header')?.offsetHeight || 0;
        const promoHeight = promoStripEl?.offsetHeight || 0;
        const containerStyles = gameContainerEl ? getComputedStyle(gameContainerEl) : null;
        const containerPaddingTop = containerStyles ? parseFloat(containerStyles.paddingTop) : 0;
        const containerPaddingBottom = containerStyles ? parseFloat(containerStyles.paddingBottom) : 0;
        const reservedVerticalSpace = isPhone ? 14 : 22;
        const availableHeight = Math.max(
            200,
            Math.floor(
                viewport.height -
                headerHeight -
                promoHeight -
                containerPaddingTop -
                containerPaddingBottom -
                reservedVerticalSpace
            )
        );
        const horizontalInset = (isPhone || isTablet) ? 0 : 8;
        const maxWidth = Math.max(280, viewportWidth - horizontalInset);
        const maxHeight = (isPhone || isTablet) ? availableHeight : Math.min(700, availableHeight);

        const maxCanvasWidth = (isPhone || isTablet) ? maxWidth : Math.min(1000, maxWidth);
        const newWidth = Math.max(280, Math.floor(maxCanvasWidth));
        const minHeight = isPhone ? 220 : isTablet ? 300 : 340;
        const newHeight = Math.max(minHeight, Math.floor(maxHeight));

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            console.log(`Canvas resized to ${newWidth}x${newHeight} (viewport: ${viewport.width}x${viewport.height})`);

            // Reposition player if they're outside bounds
            if (player.x > canvas.width - player.width) {
                player.x = canvas.width - player.width;
            }
            if (player.y > canvas.height - player.height) {
                player.y = canvas.height - player.height;
            }

            // Redraw if game is running
            if (gameRunning && !paused) {
                draw();
            }
        }
    } catch (error) {
        console.error('Error resizing canvas:', error);
        // Fallback size
        canvas.width = 400;
        canvas.height = 300;
    }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});

// Handle mobile viewport changes (keyboard, etc.)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        setTimeout(resizeCanvas, 50);
    });
}

// Ensure canvas is resized after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        resizeCanvas();
        // Test draw to ensure canvas is working
        if (ctx) {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff6600';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('High Car', canvas.width / 2, canvas.height / 2);
        }
        console.log('Canvas initialized and tested');
    }, 50);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
}

function initPromoStrip() {
    const promoStrips = Array.from(document.querySelectorAll('.promo-strip'));
    if (promoStrips.length === 0) {
        return;
    }

    promoStrips.forEach((promoStrip) => {
        const slides = Array.from(promoStrip.querySelectorAll('.promo-slide'));
        if (slides.length <= 1) {
            return;
        }

        let activeSlideIndex = 0;
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === 0);
        });

        window.setInterval(() => {
            activeSlideIndex = (activeSlideIndex + 1) % slides.length;
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === activeSlideIndex);
            });

            if (promoStrip === promoStripEl) {
                // Keep canvas perfectly fitted whenever the mobile UI chrome changes.
                resizeCanvas();
            }
        }, 6000);
    });
}

initPromoStrip();

// Initial draw to show canvas is working
drawRoad();

// Controls
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
};

const mouse = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    insideCanvas: false
};

const touch = {
    active: false
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function updatePointerFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((clientY - rect.top) / rect.height) * canvas.height;
}

// Utility functions for player IDs and leaderboard
function normalizeNameKey(name = '') {
    return String(name).trim().toLowerCase();
}

function isValidPlayerId(value) {
    return typeof value === 'string' && /^\d{3}$/.test(value);
}

function getUsedPlayerIds() {
    const idsFromMap = Object.values(playerIdsByName).filter(isValidPlayerId);
    const idsFromLeaderboard = leaderboard
        .map(entry => entry?.playerId)
        .filter(isValidPlayerId);
    return new Set([...idsFromMap, ...idsFromLeaderboard]);
}

function generateUniquePlayerId(usedIds) {
    for (let attempt = 0; attempt < 200; attempt++) {
        const candidate = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        if (!usedIds.has(candidate)) {
            return candidate;
        }
    }

    for (let candidate = 1; candidate <= 999; candidate++) {
        const asText = String(candidate).padStart(3, '0');
        if (!usedIds.has(asText)) {
            return asText;
        }
    }

    return '000';
}

function loadPlayerIds() {
    const base = { ...PRESET_PLAYER_IDS };

    try {
        const raw = localStorage.getItem(PLAYER_IDS_KEY);
        if (!raw) {
            return base;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return base;
        }

        Object.entries(parsed).forEach(([key, value]) => {
            const normalizedKey = normalizeNameKey(key);
            if (normalizedKey && isValidPlayerId(value) && !FIXED_PLAYER_ID_KEYS.has(normalizedKey)) {
                base[normalizedKey] = value;
            }
        });

        return base;
    } catch (error) {
        return base;
    }
}

function savePlayerIds() {
    localStorage.setItem(PLAYER_IDS_KEY, JSON.stringify(playerIdsByName));
}

function saveLastAccess(name, playerId) {
    const payload = {
        name: sanitizePlayerName(name || ''),
        playerId: isValidPlayerId(playerId || '') ? playerId : ''
    };
    localStorage.setItem(LAST_ACCESS_KEY, JSON.stringify(payload));
}

function loadLastAccess() {
    try {
        const raw = localStorage.getItem(LAST_ACCESS_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const name = sanitizePlayerName(parsed.name || '');
        const playerId = isValidPlayerId(parsed.playerId || '') ? parsed.playerId : '';

        if (name || playerId) {
            return { name, playerId };
        }

        return null;
    } catch (error) {
        return null;
    }
}

function sanitizePlayerName(name) {
    return String(name || '').trim().substring(0, 14).replace(/[<>\"'&]/g, '');
}

function loadLeaderboard() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        if (!raw) {
            return [...defaultLeaderboard];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [...defaultLeaderboard];
        }

        const validEntries = parsed
            .filter(entry => entry && typeof entry === 'object' && typeof entry.score === 'number' && entry.score >= 0)
            .map(entry => ({
                name: sanitizePlayerName(entry.name || ''),
                playerId: isValidPlayerId(entry.playerId || '') ? entry.playerId : '',
                score: Math.floor(entry.score),
                level: Math.max(1, Math.floor(entry.level || 1)),
                lives: Math.max(0, Math.floor(entry.lives || 0)),
                date: entry.date || new Date().toISOString().split('T')[0]
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        return validEntries.length > 0 ? validEntries : [...defaultLeaderboard];
    } catch (error) {
        return [...defaultLeaderboard];
    }
}

function saveLeaderboard() {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function updateLeaderboard(name, playerId, score, level, lives) {
    const newEntry = {
        name: sanitizePlayerName(name),
        playerId: isValidPlayerId(playerId) ? playerId : '',
        score: Math.floor(score),
        level: Math.max(1, Math.floor(level)),
        lives: Math.max(0, Math.floor(lives)),
        date: new Date().toISOString().split('T')[0]
    };

    leaderboard = leaderboard.filter(entry => !(entry.name === newEntry.name && entry.playerId === newEntry.playerId));
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    saveLeaderboard();
    highScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
}

// Game objects
let obstacles = [];
let cargoItems = [];
let fuelItems = [];
let powerUps = [];
let particles = [];

// Obstacle class
class Obstacle {
    constructor(x, y, type = 'car') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.speed = 2 + (level * 0.5);
        this.type = type;
        this.color = type === 'car' ? '#ff0000' : '#ffff00';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Simple car shape
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 5, this.y + 5, 30, 20);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 10, this.y + 10, 5, 5);
        ctx.fillRect(this.x + 25, this.y + 10, 5, 5);
    }
}

// Cargo class
class Cargo {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 1.5 + (level * 0.3);
        this.color = '#00ff00';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('C', this.x + 10, this.y + 15);
    }
}

// Fuel class
class Fuel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 1.5 + (level * 0.3);
        this.color = '#ffff00';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('F', this.x + 10, this.y + 15);
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type = 'speed') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 1.5 + (level * 0.3);
        this.type = type;
        this.color = type === 'speed' ? '#00ffff' : '#ff00ff';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'speed' ? 'S' : 'I', this.x + 10, this.y + 15);
    }
}

// Particle class for effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
    }
}

// Game functions
function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    fuel = 100;
    cargo = 0;
    powerUpActive = false;
    powerUpType = '';
    powerUpTimer = 0;
    player.x = canvas.width / 2 - 25;
    obstacles = [];
    cargoItems = [];
    fuelItems = [];
    powerUps = [];
    particles = [];
    updateUI();
}

function updateUI() {
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');
    const fuelEl = document.getElementById('fuel');
    const cargoEl = document.getElementById('cargo');
    const highScoreValueEl = document.getElementById('highScore');

    if (scoreEl) scoreEl.textContent = String(score);
    if (livesEl) livesEl.textContent = String(lives);
    if (levelEl) levelEl.textContent = String(level);
    if (fuelEl) fuelEl.textContent = String(Math.floor(fuel));
    if (cargoEl) cargoEl.textContent = String(cargo);
    if (highScoreValueEl) highScoreValueEl.textContent = String(highScore);
}

function spawnObjects() {
    if (Math.random() < 0.02) {
        const x = Math.random() * (canvas.width - 40);
        obstacles.push(new Obstacle(x, -30));
    }
    if (Math.random() < 0.015) {
        const x = Math.random() * (canvas.width - 20);
        cargoItems.push(new Cargo(x, -20));
    }
    if (Math.random() < 0.01 && fuel < 80) {
        const x = Math.random() * (canvas.width - 20);
        fuelItems.push(new Fuel(x, -20));
    }
    if (Math.random() < 0.005) {
        const x = Math.random() * (canvas.width - 20);
        const type = Math.random() < 0.5 ? 'speed' : 'invincible';
        powerUps.push(new PowerUp(x, -20, type));
    }
}

function updateObjects() {
    // Update obstacles
    obstacles = obstacles.filter(ob => {
        ob.update();
        if (ob.y > canvas.height) return false;
        if (checkCollision(player, ob)) {
            if (!powerUpActive || powerUpType !== 'invincible') {
                lives--;
                particles.push(...createParticles(ob.x + ob.width/2, ob.y + ob.height/2, '#ff0000'));
            } else {
                score += 50; // bonus for hitting while invincible
                particles.push(...createParticles(ob.x + ob.width/2, ob.y + ob.height/2, '#ff0000'));
            }
            return false;
        }
        return true;
    });

    // Update cargo
    cargoItems = cargoItems.filter(c => {
        c.update();
        if (c.y > canvas.height) return false;
        if (checkCollision(player, c)) {
            cargo++;
            score += 100;
            particles.push(...createParticles(c.x + c.width/2, c.y + c.height/2, '#00ff00'));
            return false;
        }
        return true;
    });

    // Update fuel
    fuelItems = fuelItems.filter(f => {
        f.update();
        if (f.y > canvas.height) return false;
        if (checkCollision(player, f)) {
            fuel = Math.min(100, fuel + 20);
            score += 50;
            particles.push(...createParticles(f.x + f.width/2, f.y + f.height/2, '#ffff00'));
            return false;
        }
        return true;
    });

    // Update powerUps
    powerUps = powerUps.filter(pu => {
        pu.update();
        if (pu.y > canvas.height) return false;
        if (checkCollision(player, pu)) {
            activatePowerUp(pu.type);
            score += 200;
            particles.push(...createParticles(pu.x + pu.width/2, pu.y + pu.height/2, pu.color));
            return false;
        }
        return true;
    });

    // Update particles
    particles = particles.filter(p => {
        p.update();
        return p.life > 0;
    });

    updatePowerUp();

    // Decrease fuel
    fuel = Math.max(0, fuel - 0.1);
    if (fuel <= 0) {
        lives--;
        fuel = 100;
    }

    // Level up
    if (score > level * 1000) {
        level++;
    }
}

function createParticles(x, y, color) {
    const particles = [];
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(x, y, color));
    }
    return particles;
}

function activatePowerUp(type) {
    powerUpActive = true;
    powerUpType = type;
    powerUpTimer = 300; // 5 seconds at 60fps
    if (type === 'speed') {
        player.speed = 10;
    }
}

function updatePowerUp() {
    if (powerUpActive) {
        powerUpTimer--;
        if (powerUpTimer <= 0) {
            powerUpActive = false;
            powerUpType = '';
            player.speed = 6; // reset speed
        }
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function drawRoad() {
    // Road background
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road lines
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw() {
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas not ready for drawing');
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad();

    // Draw objects
    obstacles.forEach(ob => ob.draw());
    cargoItems.forEach(c => c.draw());
    fuelItems.forEach(f => f.draw());
    powerUps.forEach(pu => pu.draw());
    particles.forEach(p => p.draw());

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 5, player.y + 5, 40, 20);
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x + 10, player.y + 10, 5, 5);
    ctx.fillRect(player.x + 35, player.y + 10, 5, 5);

    // Draw power-up effect
    if (powerUpActive) {
        ctx.strokeStyle = powerUpType === 'speed' ? '#00ffff' : '#ff00ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
    }
}

function gameLoop() {
    if (!gameRunning || paused) return;

    // Update player position
    if (mouse.insideCanvas) {
        player.x = clamp(mouse.x - player.width / 2, 0, canvas.width - player.width);
        player.y = clamp(mouse.y - player.height / 2, 0, canvas.height - player.height);
    } else {
        if (keys.left && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys.right && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
        if (keys.up && player.y > 0) {
            player.y -= player.speed;
        }
        if (keys.down && player.y < canvas.height - player.height) {
            player.y += player.speed;
        }
    }
    if (keys.space && fuel > 10) {
        player.speed = Math.max(player.speed, 12);
        fuel -= 0.5;
    } else if (!powerUpActive || powerUpType !== 'speed') {
        player.speed = 6;
    }

    spawnObjects();
    updateObjects();
    updateUI();
    draw();

    if (lives <= 0) {
        gameOver();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    gameRunning = false;
    updateLeaderboard(currentPlayerName, currentPlayerId, score, level, lives);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('finalLives').textContent = lives;
    document.getElementById('gameOver').classList.add('active');
    renderLeaderboard(endLeaderboardBodyEl, leaderboard);
}

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    updatePointerFromClient(e.clientX, e.clientY);
});

canvas.addEventListener('mouseenter', () => {
    mouse.insideCanvas = true;
});

canvas.addEventListener('mouseleave', () => {
    mouse.insideCanvas = false;
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Touch events for mobile devices
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) {
        e.preventDefault();
    }

    if (!e.touches || e.touches.length === 0) {
        return;
    }

    const touchObj = e.touches[0];
    touch.active = true;

    updatePointerFromClient(touchObj.clientX, touchObj.clientY);
    mouse.insideCanvas = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.cancelable) {
        e.preventDefault();
    }

    if (!e.touches || e.touches.length === 0) {
        return;
    }

    const touchObj = e.touches[0];
    const currentX = touchObj.clientX;
    const currentY = touchObj.clientY;

    updatePointerFromClient(currentX, currentY);
    mouse.insideCanvas = true;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.cancelable) {
        e.preventDefault();
    }

    touch.active = false;

    if (!e.touches || e.touches.length === 0) {
        mouse.insideCanvas = false;
    }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
    touch.active = false;
    mouse.insideCanvas = false;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'p' || e.key === 'P') togglePause();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
    if (e.key === ' ') keys.space = false;
});

pauseBtn.addEventListener('click', togglePause);

const resumeBtn = document.getElementById('resumeBtn');
if (resumeBtn) {
    resumeBtn.addEventListener('click', togglePause);
}

function togglePause() {
    paused = !paused;
    const pauseMenu = document.getElementById('pauseMenu');
    const gameContainer = document.querySelector('.game-container');
    
    if (paused) {
        pauseMenu.classList.add('active');
        gameContainer.classList.add('paused');
        pauseBtn.textContent = 'RESUME';
    } else {
        pauseMenu.classList.remove('active');
        gameContainer.classList.remove('paused');
        pauseBtn.textContent = 'PAUSE';
        if (gameRunning) {
            gameLoop();
        }
    }
}

// Start screen logic
function renderLeaderboard(tableBody, data) {
    tableBody.innerHTML = '';
    data.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score}</td>
            <td>${entry.playerId}</td>
        `;
        tableBody.appendChild(row);
    });
}

renderLeaderboard(startLeaderboardBodyEl, leaderboard);

startGameBtn.addEventListener('click', () => {
    let name = playerNameInputEl.value.trim();
    const code = playerCodeInputEl.value.trim();

    if (!name && !code) {
        name = 'Guest';
        playerNameInputEl.value = name;
    }

    nameErrorEl.style.display = 'none';

    let playerId = '';
    let playerName = '';

    if (code) {
        playerId = code.padStart(3, '0');
        const foundName = Object.keys(playerIdsByName).find(key => playerIdsByName[key] === playerId);
        if (foundName) {
            playerName = foundName;
        } else if (!name) {
            nameErrorEl.textContent = 'Code not found. Enter a name.';
            nameErrorEl.style.display = 'block';
            return;
        }
    }

    if (name) {
        playerName = name;
        const normalized = normalizeNameKey(name);
        if (playerIdsByName[normalized]) {
            if (playerId && playerIdsByName[normalized] !== playerId) {
                nameErrorEl.textContent = 'Name and code do not match.';
                nameErrorEl.style.display = 'block';
                return;
            }
            playerId = playerIdsByName[normalized];
        } else {
            const usedIds = getUsedPlayerIds();
            playerId = generateUniquePlayerId(usedIds);
            playerIdsByName[normalized] = playerId;
            savePlayerIds();
        }
    }

    currentPlayerName = playerName;
    currentPlayerId = playerId;
    saveLastAccess(playerName, playerId);

    // Show instructions for 2 seconds
    document.getElementById('instructions').style.display = 'block';
    setTimeout(() => {
        document.getElementById('instructions').style.display = 'none';
        startScreenEl.classList.remove('active');
        // Reset pause state
        paused = false;
        const pauseMenu = document.getElementById('pauseMenu');
        const gameContainer = document.querySelector('.game-container');
        pauseMenu.classList.remove('active');
        gameContainer.classList.remove('paused');
        pauseBtn.textContent = 'PAUSE';
        resetGame();
        gameRunning = true;
        gameLoop();
    }, 2000);
});

restartBtn.addEventListener('click', () => {
    document.getElementById('gameOver').classList.remove('active');
    // Reset pause state
    paused = false;
    const pauseMenu = document.getElementById('pauseMenu');
    const gameContainer = document.querySelector('.game-container');
    pauseMenu.classList.remove('active');
    gameContainer.classList.remove('paused');
    pauseBtn.textContent = 'PAUSE';
    resetGame();
    gameRunning = true;
    gameLoop();
});

// Load last access
const lastAccess = loadLastAccess();
if (lastAccess) {
    if (lastAccess.name) playerNameInputEl.value = lastAccess.name;
    if (lastAccess.playerId) playerCodeInputEl.value = lastAccess.playerId;
}
