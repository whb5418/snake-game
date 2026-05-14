(function () {
    'use strict';

    // ===== 常量配置 =====
    const GRID_SIZE = 20;       // 网格单元大小（像素）
    const GAME_SPEED = 150;     // 每步间隔（毫秒）
    const CANVAS_MAX = 400;     // Canvas 最大尺寸（像素）
    const MIN_SWIPE = 30;       // 最小滑动距离（像素）

    const COLORS = {
        snakeHead: '#ff6b6b',
        snakeBody: '#e94560',
        food: '#00d2ff',
        gridLine: 'rgba(255,255,255,0.03)'
    };

    // ===== DOM 元素 =====
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const overlay = document.getElementById('game-over-overlay');
    const finalScoreEl = document.getElementById('final-score');

    // ===== 游戏状态 =====
    let snake = [];
    let food = { x: 0, y: 0 };
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score = 0;
    let highScore = 0;
    let gameState = 'idle'; // idle | running | over
    let lastTime = 0;
    let accumulator = 0;
    let cols = 20;
    let rows = 20;

    // ===== Canvas 自适应尺寸 =====
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = Math.min(container.clientWidth - 40, CANVAS_MAX);
        cols = Math.floor(maxWidth / GRID_SIZE);
        rows = cols; // 正方形游戏区域
        canvas.width = cols * GRID_SIZE;
        canvas.height = rows * GRID_SIZE;
    }

    // ===== 初始化 =====
    function init() {
        resizeCanvas();
        highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        highScoreEl.textContent = highScore;
        resetGame();
        render();
    }

    function resetGame() {
        const centerX = Math.floor(cols / 2);
        const centerY = Math.floor(rows / 2);
        snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        scoreEl.textContent = '0';
        spawnFood();
        overlay.classList.add('hidden');
    }

    // ===== 食物生成 =====
    function spawnFood() {
        let pos;
        let attempts = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * cols),
                y: Math.floor(Math.random() * rows)
            };
            attempts++;
        } while (snake.some(function (s) { return s.x === pos.x && s.y === pos.y; }) && attempts < 1000);
        food = pos;
    }

    // ===== 游戏循环（固定时间步长） =====
    function gameLoop(timestamp) {
        if (gameState !== 'running') return;

        const delta = timestamp - lastTime;
        lastTime = timestamp;
        accumulator += delta;

        while (accumulator >= GAME_SPEED) {
            update();
            accumulator -= GAME_SPEED;
            if (gameState !== 'running') break;
        }

        render();
        requestAnimationFrame(gameLoop);
    }

    // ===== 更新逻辑 =====
    function update() {
        direction = { x: nextDirection.x, y: nextDirection.y };

        var head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        // 碰墙检测
        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
            gameOver();
            return;
        }

        // 碰自身检测
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        // 吃食物
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = score;
            if (score > highScore) {
                highScore = score;
                highScoreEl.textContent = highScore;
                localStorage.setItem('snakeHighScore', String(highScore));
            }
            spawnFood();
        } else {
            snake.pop();
        }
    }

    // ===== 渲染 =====
    function render() {
        // 清空画布
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制网格线
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        for (var i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, canvas.height);
            ctx.stroke();
        }
        for (var j = 0; j <= rows; j++) {
            ctx.beginPath();
            ctx.moveTo(0, j * GRID_SIZE);
            ctx.lineTo(canvas.width, j * GRID_SIZE);
            ctx.stroke();
        }

        // 绘制食物（圆形）
        ctx.fillStyle = COLORS.food;
        ctx.shadowColor = COLORS.food;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        var foodCenterX = food.x * GRID_SIZE + GRID_SIZE / 2;
        var foodCenterY = food.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.arc(foodCenterX, foodCenterY, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 绘制蛇
        for (var k = 0; k < snake.length; k++) {
            var seg = snake[k];
            if (k === 0) {
                // 蛇头
                ctx.fillStyle = COLORS.snakeHead;
                ctx.shadowColor = COLORS.snakeHead;
                ctx.shadowBlur = 8;
            } else {
                // 蛇身
                ctx.fillStyle = COLORS.snakeBody;
                ctx.shadowBlur = 0;
            }
            var padding = k === 0 ? 1 : 2;
            var radius = k === 0 ? 4 : 3;
            roundRect(
                ctx,
                seg.x * GRID_SIZE + padding,
                seg.y * GRID_SIZE + padding,
                GRID_SIZE - padding * 2,
                GRID_SIZE - padding * 2,
                radius
            );
        }
        ctx.shadowBlur = 0;
    }

    // 圆角矩形辅助函数
    function roundRect(context, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
        context.fill();
    }

    // ===== 游戏结束 =====
    function gameOver() {
        gameState = 'over';
        finalScoreEl.textContent = score;
        overlay.classList.remove('hidden');
    }

    // ===== 方向设置（防 180 度掉头） =====
    function setDirection(dx, dy) {
        if (gameState !== 'running') return;
        // 防止反向
        if (direction.x === -dx && direction.y === -dy) return;
        nextDirection = { x: dx, y: dy };
    }

    // ===== 键盘输入 =====
    document.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); setDirection(0, -1); break;
            case 'ArrowDown':  case 's': case 'S': e.preventDefault(); setDirection(0, 1);  break;
            case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); setDirection(-1, 0); break;
            case 'ArrowRight': case 'd': case 'D': e.preventDefault(); setDirection(1, 0);  break;
        }
    });

    // ===== 触控按钮输入 =====
    document.getElementById('btn-up').addEventListener('touchstart', function (e) { e.preventDefault(); setDirection(0, -1); });
    document.getElementById('btn-down').addEventListener('touchstart', function (e) { e.preventDefault(); setDirection(0, 1); });
    document.getElementById('btn-left').addEventListener('touchstart', function (e) { e.preventDefault(); setDirection(-1, 0); });
    document.getElementById('btn-right').addEventListener('touchstart', function (e) { e.preventDefault(); setDirection(1, 0); });

    // 兼容鼠标点击（桌面端调试）
    document.getElementById('btn-up').addEventListener('click', function () { setDirection(0, -1); });
    document.getElementById('btn-down').addEventListener('click', function () { setDirection(0, 1); });
    document.getElementById('btn-left').addEventListener('click', function () { setDirection(-1, 0); });
    document.getElementById('btn-right').addEventListener('click', function () { setDirection(1, 0); });

    // ===== 滑动手势输入 =====
    var touchStartX = 0;
    var touchStartY = 0;

    canvas.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            setDirection(dx > 0 ? 1 : -1, 0);
        } else {
            setDirection(0, dy > 0 ? 1 : -1);
        }
    }, { passive: true });

    // ===== UI 控制 =====
    function startGame() {
        resizeCanvas();
        resetGame();
        gameState = 'running';
        lastTime = performance.now();
        accumulator = 0;
        startBtn.style.display = 'none';
        requestAnimationFrame(gameLoop);
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', function () {
        startGame();
    });

    // ===== 窗口 resize =====
    window.addEventListener('resize', function () {
        resizeCanvas();
        if (gameState === 'idle') {
            render();
        }
    });

    // ===== 启动 =====
    init();
})();
