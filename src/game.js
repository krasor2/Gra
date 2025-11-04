let canvas;
let ctx;

let levelEl;
let healthEl;
let timerEl;
let xpBarEl;

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.up = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.down = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = true;
      break;
    case 'Space':
      input.shoot = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.up = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.down = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = false;
      break;
    case 'Space':
      input.shoot = false;
      break;
  }
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class Entity {
  constructor({ x, y, radius = 18, color = '#fff' }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.remove = false;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Player extends Entity {
  constructor() {
    super({ x: canvas.width / 2, y: canvas.height / 2, radius: 24, color: '#f6b3d2' });
    this.speed = 220;
    this.health = 100;
    this.maxHealth = 100;
    this.level = 1;
    this.xp = 0;
    this.xpForNext = 50;
    this.shootCooldown = 0;
    this.lastAim = { x: 1, y: 0 };
    this.invulnerableTimer = 0;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.6;
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpForNext) {
      this.xp -= this.xpForNext;
      this.level += 1;
      this.maxHealth += 8;
      this.health = this.maxHealth;
      this.xpForNext = Math.round(this.xpForNext * 1.35);
      this.speed += 6;
    }
  }

  update(dt) {
    const direction = { x: 0, y: 0 };
    if (input.up) direction.y -= 1;
    if (input.down) direction.y += 1;
    if (input.left) direction.x -= 1;
    if (input.right) direction.x += 1;

    const length = Math.hypot(direction.x, direction.y) || 1;
    direction.x /= length;
    direction.y /= length;

    this.x += direction.x * this.speed * dt;
    this.y += direction.y * this.speed * dt;

    this.x = clamp(this.x, this.radius, canvas.width - this.radius);
    this.y = clamp(this.y, this.radius, canvas.height - this.radius);

    if (direction.x !== 0 || direction.y !== 0) {
      this.lastAim = { x: direction.x, y: direction.y };
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (input.shoot && this.shootCooldown <= 0) {
      this.shoot();
    }
  }

  shoot(target) {
    const aim = target
      ? normalize({ x: target.x - this.x, y: target.y - this.y })
      : this.lastAim;
    const speed = 420;
    const bullet = new Projectile({
      x: this.x + aim.x * (this.radius + 4),
      y: this.y + aim.y * (this.radius + 4),
      vx: aim.x * speed,
      vy: aim.y * speed,
      radius: 7,
      color: '#fefefe',
      friendly: true,
      damage: 22 + this.level * 2,
    });
    bullets.push(bullet);
    this.shootCooldown = 0.35;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1, 0.9);
    ctx.fillStyle = '#f6b3d2';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-8, -4, 6, Math.PI, 0);
    ctx.arc(8, -4, 6, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-8, -4, 3, 0, Math.PI * 2);
    ctx.arc(8, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fcd36a';
    ctx.beginPath();
    ctx.arc(0, 10, 7, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

class Projectile extends Entity {
  constructor({ x, y, vx, vy, radius, color, friendly, damage }) {
    super({ x, y, radius, color });
    this.vx = vx;
    this.vy = vy;
    this.friendly = friendly;
    this.damage = damage;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (
      this.x < -this.radius ||
      this.x > canvas.width + this.radius ||
      this.y < -this.radius ||
      this.y > canvas.height + this.radius
    ) {
      this.remove = true;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy extends Entity {
  constructor({ x, y, radius, color, speed = 80, health = 60, tags = [], xp = 20 }) {
    super({ x, y, radius, color });
    this.speed = speed;
    this.health = health;
    this.maxHealth = health;
    this.tags = tags;
    this.xp = xp;
    this.killed = false;
    this.dropXpOnRemove = true;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.remove = true;
      this.killed = true;
    }
  }
}

class Sapling extends Enemy {
  constructor({ x, y }) {
    super({ x, y, radius: 18, color: '#8af09c', speed: 140, health: 40, tags: ['sapling'], xp: 16 });
    this.transformDelay = 3.8 + Math.random() * 1.5;
    this.timer = 0;
  }

  update(dt) {
    this.timer += dt;
    const dir = normalize({ x: player.x - this.x, y: player.y - this.y });
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;

    if (this.timer >= this.transformDelay) {
      this.dropXpOnRemove = false;
      this.remove = true;
      const flower = new Flowerling({ x: this.x, y: this.y, bornFromSapling: true });
      enemies.push(flower);
    }
  }

  draw() {
    drawChibiBlob(this, '#8af09c', '#5ba870');
  }
}

class Stoneling extends Enemy {
  constructor({ x, y }) {
    super({ x, y, radius: 22, color: '#9aa1ff', speed: 40, health: 90, tags: ['stoneling', 'ling'], xp: 28 });
    this.jumpTimer = 0;
    this.jumpCooldown = 2.6;
    this.jumpDuration = 0.5;
    this.state = 'idle';
  }

  update(dt) {
    this.jumpTimer -= dt;
    if (this.state === 'idle' && this.jumpTimer <= 0) {
      this.state = 'jumping';
      this.jumpTimer = this.jumpDuration;
    }

    if (this.state === 'jumping') {
      const dir = normalize({ x: player.x - this.x, y: player.y - this.y });
      this.x += dir.x * (this.speed * 3.2) * dt;
      this.y += dir.y * (this.speed * 3.2) * dt;
      this.jumpTimer -= dt;
      if (this.jumpTimer <= 0) {
        this.state = 'recover';
        this.jumpTimer = this.jumpCooldown;
      }
    }
  }

  draw() {
    drawChibiBlob(this, '#9aa1ff', '#5f68cf');
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.8, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Flowerling extends Enemy {
  constructor({ x, y, bornFromSapling = false }) {
    super({
      x,
      y,
      radius: 20,
      color: '#fcd36a',
      speed: 0,
      health: bornFromSapling ? 70 : 85,
      tags: ['flower', 'ling'],
      xp: 34,
    });
    this.shootTimer = 0.5;
  }

  update(dt) {
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.5 + Math.random() * 0.8;
      const dir = normalize({ x: player.x - this.x, y: player.y - this.y });
      enemyBullets.push(
        new Projectile({
          x: this.x + dir.x * (this.radius + 6),
          y: this.y + dir.y * (this.radius + 6),
          vx: dir.x * 120,
          vy: dir.y * 120,
          radius: 8,
          color: 'rgba(255,255,255,0.85)',
          friendly: false,
          damage: 18,
        })
      );
    }
  }

  draw() {
    drawFlowerling(this);
  }
}

class ExperienceOrb extends Entity {
  constructor({ x, y, amount }) {
    super({ x, y, radius: 8, color: '#8df9ff' });
    this.amount = amount;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.pulse += dt * 3;
    this.y += Math.sin(this.pulse) * 0.2;
    if (distance(this, player) < player.radius + this.radius + 6) {
      player.gainXp(this.amount);
      this.remove = true;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#8df9ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2, -2, this.radius / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let xpOrbs = [];

let spawnTimer = 0;
let elapsed = 0;

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function drawChibiBlob(entity, baseColor, shadowColor) {
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.scale(1, 0.92);
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, entity.radius, entity.radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shadowColor;
  ctx.beginPath();
  ctx.ellipse(0, entity.radius * 0.25, entity.radius * 0.9, entity.radius * 0.4, 0, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-7, -5, 5, Math.PI, 0);
  ctx.arc(7, -5, 5, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-7, -5, 2.5, 0, Math.PI * 2);
  ctx.arc(7, -5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(0, 8, 4, 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawFlowerling(entity) {
  ctx.save();
  ctx.translate(entity.x, entity.y);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    ctx.fillStyle = i % 2 === 0 ? '#ffe08a' : '#fcd36a';
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(angle) * (entity.radius - 4),
      Math.sin(angle) * (entity.radius - 4),
      entity.radius / 2,
      entity.radius,
      angle,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.fillStyle = '#ff9ecf';
  ctx.beginPath();
  ctx.arc(0, 0, entity.radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-5, -2, 2.2, 0, Math.PI * 2);
  ctx.arc(5, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 6, 5, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function spawnEnemy() {
  const border = 40;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  switch (side) {
    case 0:
      x = Math.random() * canvas.width;
      y = -border;
      break;
    case 1:
      x = canvas.width + border;
      y = Math.random() * canvas.height;
      break;
    case 2:
      x = Math.random() * canvas.width;
      y = canvas.height + border;
      break;
    case 3:
      x = -border;
      y = Math.random() * canvas.height;
      break;
  }

  const roll = Math.random();
  if (roll < 0.45) {
    enemies.push(new Sapling({ x, y }));
  } else if (roll < 0.75) {
    enemies.push(new Stoneling({ x, y }));
  } else {
    enemies.push(new Flowerling({ x, y }));
  }
}

function updateUI() {
  levelEl.textContent = player.level;
  healthEl.textContent = Math.round(player.health);
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, '0');
  timerEl.textContent = `${minutes}:${seconds}`;
  const progress = clamp((player.xp / player.xpForNext) * 100, 0, 100);
  xpBarEl.style.width = `${progress}%`;
}

function handleCollisions() {
  for (const bullet of bullets) {
    for (const enemy of enemies) {
      if (!bullet.remove && distance(bullet, enemy) < bullet.radius + enemy.radius) {
        enemy.takeDamage(bullet.damage);
        bullet.remove = true;
      }
    }
  }

  for (const bullet of enemyBullets) {
    if (!bullet.remove && distance(bullet, player) < bullet.radius + player.radius) {
      bullet.remove = true;
      player.takeDamage(bullet.damage);
    }
  }

  for (const enemy of enemies) {
    if (distance(enemy, player) < enemy.radius + player.radius - 6) {
      if (enemy instanceof Stoneling && enemy.state === 'jumping') {
        player.takeDamage(24);
      } else if (enemy instanceof Sapling) {
        player.takeDamage(10);
      } else if (enemy instanceof Flowerling) {
        player.takeDamage(14);
      }
      const dir = normalize({ x: player.x - enemy.x, y: player.y - enemy.y });
      player.x += dir.x * 12;
      player.y += dir.y * 12;
    }
  }
}

function cleanEntities(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].remove) {
      list.splice(i, 1);
    }
  }
}

let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.1);
  lastTime = timestamp;
  elapsed += dt;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  spawnTimer -= dt;
  const spawnInterval = Math.max(0.6, 2.2 - elapsed / 40);
  if (spawnTimer <= 0) {
    spawnTimer = spawnInterval;
    spawnEnemy();
  }

  player.update(dt);

  const target = enemies.reduce((nearest, enemy) => {
    const d = distance(player, enemy);
    if (!nearest || d < nearest.dist) {
      return { dist: d, enemy };
    }
    return nearest;
  }, null);

  if (input.shoot && target) {
    player.lastAim = normalize({ x: target.enemy.x - player.x, y: target.enemy.y - player.y });
  }

  for (const enemy of enemies) {
    enemy.update?.(dt);
  }

  for (const bullet of bullets) {
    bullet.update(dt);
  }

  for (const bullet of enemyBullets) {
    bullet.update(dt);
  }

  for (const orb of xpOrbs) {
    orb.update(dt);
  }

  handleCollisions();

  for (const enemy of enemies) {
    if (enemy.remove && enemy.dropXpOnRemove && enemy.killed) {
      enemy.dropXpOnRemove = false;
      xpOrbs.push(new ExperienceOrb({ x: enemy.x, y: enemy.y, amount: enemy.xp }));
    }
  }

  cleanEntities(enemies);
  cleanEntities(bullets);
  cleanEntities(enemyBullets);
  cleanEntities(xpOrbs);

  updateUI();

  drawEntities();

  if (player.health <= 0) {
    drawGameOver();
  } else {
    requestAnimationFrame(gameLoop);
  }
}

function drawEntities() {
  for (const orb of xpOrbs) {
    orb.draw();
  }

  for (const enemy of enemies) {
    enemy.draw();
  }

  for (const bullet of bullets) {
    bullet.draw();
  }

  for (const bullet of enemyBullets) {
    bullet.draw();
  }

  player.draw();
}

function drawBackground() {
  ctx.save();
  ctx.fillStyle = '#2b4a3f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Koniec gry', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '28px Quicksand, sans-serif';
  ctx.fillText(`Przetrwałeś ${timerEl.textContent}`, canvas.width / 2, canvas.height / 2 + 16);
  ctx.fillText('Odśwież stronę, aby zagrać ponownie.', canvas.width / 2, canvas.height / 2 + 60);
  ctx.restore();
}

function initGame() {
  canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Nie znaleziono elementu canvas o id "game".');
    return;
  }

  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Ta przeglądarka nie obsługuje kontekstu 2D na elemencie canvas.');
    return;
  }

  levelEl = document.getElementById('level');
  healthEl = document.getElementById('health');
  timerEl = document.getElementById('timer');
  xpBarEl = document.getElementById('xp-bar');

  player = new Player();
  enemies = [];
  bullets = [];
  enemyBullets = [];
  xpOrbs = [];

  spawnTimer = 0;
  elapsed = 0;
  lastTime = performance.now();

  updateUI();

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame, { once: true });
} else {
  initGame();
}
