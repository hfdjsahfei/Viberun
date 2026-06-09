(function () {
    window.VibeRun = window.VibeRun || {};

    class VibeRunScene extends Phaser.Scene {
        constructor() {
            super("VibeRunScene");
            this.audioEngine = new window.VibeRun.VibeAudioEngine();
        }

        create() {
            window.VibeRun.createPixelArtTextures(this);

            this.heartRate = null;
            this.difficulty = 1;
            this.worldSpeed = window.VibeRun.PHYSICS.baseSpeed;
            this.spawnDelay = window.VibeRun.PHYSICS.baseSpawnDelay;
            this.score = 0;
            this.gemScore = 0;
            this.gemsCollected = 0;
            this.speedScale = 1;
            this.simHeartRate = false;
            this.simHeartTarget = window.VibeRun.HEART_RATE.base;
            this.heartRateSource = "socket";
            this.heartSocketStatus = "idle";
            this.heartSocketLast = "";
            this.heartSocketRaw = "";
            this.heartSocketParsed = null;
            this.nextHeartRetargetAt = 0;
            this.gameOver = false;
            this.scroll = 0;
            this.lastHudUpdateAt = 0;
            this.maxJumps = 2;
            this.jumpsUsed = 0;
            this.lastJumpAt = -1000;

            this.recalculateWorldMetrics();
            this.cacheHudRefs();
            this.createSystems();
            this.createRunner();
            this.createPhysicsWorld();
            this.createOverlayText();
            this.bindInput();
            this.registerHeartRateBridge();
            this.connectHeartSocket();
            this.refreshHud(true);

            this.scale.on("resize", this.handleResize, this);
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        }

        recalculateWorldMetrics() {
            this.groundHeight = Math.max(72, Math.floor(this.scale.height * 0.14));
            this.groundY = this.scale.height - this.groundHeight;
            this.jumpVelocity = -Math.max(640, Math.floor(this.scale.height * 0.92));
        }

        cacheHudRefs() {
            this.hud = {
                heartRate: document.getElementById("heartRateValue"),
                difficulty: document.getElementById("difficultyValue"),
                speed: document.getElementById("speedValue"),
                score: document.getElementById("scoreValue"),
                gems: document.getElementById("gemValue"),
                pool: document.getElementById("poolValue"),
                heartSource: document.getElementById("heartSourceValue"),
                heartSocketUrl: document.getElementById("heartSocketUrlValue"),
                heartSocketLast: document.getElementById("heartSocketLastValue"),
                heartRaw: document.getElementById("heartRawValue"),
                heartParsed: document.getElementById("heartParsedValue")
            };
            this.controls = {
                speedScale: document.getElementById("speedScaleInput"),
                speedScaleValue: document.getElementById("speedScaleValue"),
                heartSim: document.getElementById("heartSimInput"),
                socketUrlInput: document.getElementById("socketUrlInput"),
                socketUrlApply: document.getElementById("socketUrlApply")
            };
            if (this.controls.heartSim) {
                this.controls.heartSim.checked = this.simHeartRate;
            }
            if (this.controls.socketUrlInput) {
                this.controls.socketUrlInput.value = window.VibeRun.HEART_RATE.socketUrl;
            }
        }

        createSystems() {
            this.backgroundSystem = new window.VibeRun.BackgroundSystem(this);
            this.backgroundSystem.create();
        }

        createRunner() {
            this.ground = this.add.rectangle(this.scale.width / 2, this.groundY + 12, this.scale.width, 24, 0xffffff)
                .setOrigin(0.5)
                .setAlpha(0.01);
            this.physics.add.existing(this.ground, true);

            this.runner = this.physics.add.sprite(this.scale.width * 0.18, this.groundY - 34, "runner");
            this.runner.setDisplaySize(58, 58);
            this.runner.setCollideWorldBounds(true);
            this.runner.body.setGravityY(window.VibeRun.PHYSICS.gravityY);
            this.runner.body.setSize(40, 40);
            this.runner.body.setOffset(9, 12);
        }

        createPhysicsWorld() {
            this.sparkles = this.add.particles(0, 0, "pixel", {
                speed: { min: 40, max: 120 },
                scale: { start: 2, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 260,
                frequency: -1,
                quantity: 1
            });

            this.physics.add.collider(this.runner, this.ground);
            this.spawner = new window.VibeRun.SpawnerSystem(this);
            this.spawner.create();
        }

        createOverlayText() {
            const centerX = this.scale.width / 2;
            const centerY = this.scale.height / 2;
            const textStyle = {
                fontFamily: '"Courier New", "Microsoft YaHei", monospace',
                fontSize: `${Math.max(18, Math.floor(this.scale.width * 0.024))}px`,
                color: "#fff7ff",
                align: "center",
                stroke: "#17002d",
                strokeThickness: 5
            };

            this.titleText = this.add.text(centerX, centerY - 46, "CLICK TO START VIBERUN", textStyle).setOrigin(0.5);
            this.subtitleText = this.add.text(centerX, centerY, "Double jump across platforms. Dodge falling spikes, spike balls, and spike fields.", {
                ...textStyle,
                fontSize: `${Math.max(13, Math.floor(this.scale.width * 0.014))}px`,
                color: "#bff7ff"
            }).setOrigin(0.5);
            this.gameOverText = this.add.text(centerX, centerY - 10, "", textStyle).setOrigin(0.5).setVisible(false);
        }

        updateSocketUrl(newUrl) {
            // 更新配置中的 URL
            window.VibeRun.HEART_RATE.socketUrl = newUrl;
            
            // 更新 HUD 显示
            if (this.hud.heartSocketUrl) {
                this.hud.heartSocketUrl.textContent = newUrl;
            }
            
            // 重新连接 WebSocket
            if (this.heartSocket) {
                this.heartSocket.close();
                this.heartSocket = null;
            }
            
            // 如果当前不是模拟模式，则连接新 WebSocket
            if (!this.simHeartRate) {
                this.connectHeartSocket();
                this.heartRateSource = "socket";
            }
            
            // 显示提示
            console.log(`[HeartSocket] URL changed to: ${newUrl}`);
            
            // 可选：显示临时反馈
            const applyBtn = this.controls.socketUrlApply;
            if (applyBtn) {
                const originalText = applyBtn.textContent;
                applyBtn.textContent = "✓ 已应用";
                setTimeout(() => {
                    if (applyBtn) applyBtn.textContent = originalText;
                }, 1500);
            }
        }

        bindInput() {
            this.input.on("pointerdown", async () => {
                await this.audioEngine.resume();
                this.startOrJump();
            });
        
            this.input.keyboard.on("keydown-SPACE", async () => {
                await this.audioEngine.resume();
                this.startOrJump();
            });
        
            if (this.controls.speedScale) {
                this.controls.speedScale.addEventListener("input", () => {
                    this.speedScale = Number(this.controls.speedScale.value) || 1;
                    this.refreshHud(true);
                });
            }
        
            if (this.controls.heartSim) {
                this.controls.heartSim.addEventListener("change", () => {
                    this.simHeartRate = this.controls.heartSim.checked;
                    this.simHeartTarget = this.getEffectiveHeartRate();
                    this.nextHeartRetargetAt = 0;
                    this.heartRateSource = this.simHeartRate ? "sim" : "socket";
                    this.refreshHud(true);
                });
            }
        
            // WebSocket URL 输入处理
            if (this.controls.socketUrlApply) {
                this.controls.socketUrlApply.addEventListener("click", () => {
                    const newUrl = this.controls.socketUrlInput.value.trim();
                    if (newUrl) {
                        this.updateSocketUrl(newUrl);
                    }
                });
            }
        
            // 按回车键也可以应用
            if (this.controls.socketUrlInput) {
                this.controls.socketUrlInput.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        const newUrl = this.controls.socketUrlInput.value.trim();
                        if (newUrl) {
                            this.updateSocketUrl(newUrl);
                        }
                    }
                });
            }
        }

        startOrJump() {
            this.titleText.setVisible(false);
            this.subtitleText.setVisible(false);

            if (this.gameOver) {
                this.scene.restart();
                return;
            }

            this.tryJump();
        }

        tryJump() {
            if (this.isGrounded()) {
                this.resetJumpCount();
            } else if (this.jumpsUsed === 0) {
                this.jumpsUsed = 1;
            }

            if (this.jumpsUsed >= this.maxJumps) {
                return;
            }

            this.jumpsUsed += 1;
            const isSecondJump = this.jumpsUsed === 2;
            this.lastJumpAt = this.time.now;
            this.runner.setVelocityY(isSecondJump ? this.jumpVelocity * 0.86 : this.jumpVelocity);
            this.runner.setAngularVelocity(isSecondJump ? -180 : -80);
            this.audioEngine.beep("jump");
            this.sparkles.setTint(isSecondJump ? window.VibeRun.COLORS.cyan : window.VibeRun.COLORS.white);
            this.sparkles.explode(isSecondJump ? 18 : 14, this.runner.x - 18, this.runner.y + 20);
        }

        isGrounded() {
            return this.runner.body.blocked.down || this.runner.body.touching.down;
        }

        resetJumpCount() {
            this.jumpsUsed = 0;
        }

        canLandOnPlatform(runner, platform) {
            if (!platform || platform.kind !== "platform" || runner.body.velocity.y < 0) {
                return false;
            }

            const tolerance = Math.max(14, Math.abs(runner.body.velocity.y) * (this.game.loop.delta / 1000));
            return runner.body.bottom <= platform.body.top + tolerance;
        }

        landOnPlatform() {
            this.resetJumpCount();
        }

        registerHeartRateBridge() {
            window.vibeRunSetHeartRate = (bpm) => {
                this.applyHeartRate(bpm, "manual");
            };
        }

        connectHeartSocket() {
            if (!window.VibeRun.HeartSocketClient) {
                return;
            }

            this.heartSocket = new window.VibeRun.HeartSocketClient({
                url: window.VibeRun.HEART_RATE.socketUrl,
                onHeartRate: (bpm) => this.applyHeartRate(bpm, "socket"),
                onStatus: (status, detail) => {
                    this.heartSocketStatus = status;
                    this.heartSocketLast = detail || status;
                    this.refreshHud(true);
                },
                onMessage: (message) => this.handleHeartSocketMessage(message)
            });
            this.heartSocket.connect();
        }

        handleHeartSocketMessage(message) {
            this.heartSocketRaw = message.raw;
            this.heartSocketParsed = message.bpm;
            console.debug("[HeartSocket]", {
                raw: message.raw,
                parsedBpm: message.bpm
            });
            this.refreshHud(true);
        }

        applyHeartRate(bpm, source) {
            const value = Number(bpm);
            if (!Number.isFinite(value)) {
                return;
            }

            this.simHeartRate = false;
            this.heartRateSource = source;
            if (this.controls.heartSim) {
                this.controls.heartSim.checked = false;
            }

            this.heartRate = value;
            this.refreshHud(true);
        }

        update(time, delta) {
            if (this.gameOver) {
                return;
            }

            const clampedDelta = Math.min(delta, window.VibeRun.PERFORMANCE.maxDeltaMs);
            this.updateHeartRateSimulation(time);
            this.updateDifficulty();
            this.score += (clampedDelta / 1000) * (this.worldSpeed / 22);
            this.scroll += (clampedDelta / 1000) * this.worldSpeed;

            this.backgroundSystem.update(this.scroll);
            if (this.isGrounded() && time - this.lastJumpAt > 100) {
                this.resetJumpCount();
            }
            this.updateRunnerPose();
            this.spawner.update(time, this.worldSpeed, this.spawnDelay, this.difficulty);
            this.refreshHud(false, time);
        }

        updateDifficulty() {
            const heartRate = window.VibeRun.HEART_RATE;
            const physics = window.VibeRun.PHYSICS;
            const currentHeartRate = this.getEffectiveHeartRate();
            const heartFactor = Phaser.Math.Clamp((currentHeartRate - heartRate.base) / 12, 0, 1.35);
            this.difficulty = 1 + heartFactor;
            const targetSpeed = (physics.baseSpeed + heartFactor * physics.maxHeartBonusSpeed) * this.speedScale;
            this.worldSpeed = Phaser.Math.Linear(this.worldSpeed, targetSpeed, 0.035);
            this.spawnDelay = Phaser.Math.Linear(this.spawnDelay, physics.baseSpawnDelay - heartFactor * physics.maxSpawnDelayDrop, 0.05);
        }

        updateHeartRateSimulation(time) {
            if (!this.simHeartRate) {
                return;
            }

            const heartRate = window.VibeRun.HEART_RATE;
            if (time >= this.nextHeartRetargetAt) {
                const calmTarget = Phaser.Math.Between(heartRate.simMin, 96);
                const fastTarget = Phaser.Math.Between(102, heartRate.simMax);
                this.simHeartTarget = Math.random() > 0.42 ? fastTarget : calmTarget;
                this.nextHeartRetargetAt = time + Phaser.Math.Between(heartRate.simRetargetMs, heartRate.simRetargetMs + 1300);
            }

            this.heartRate = Phaser.Math.Linear(this.getEffectiveHeartRate(), this.simHeartTarget, 0.018);
        }

        updateRunnerPose() {
            const airborne = !this.isGrounded();
            this.runner.setAngle(Phaser.Math.Clamp(this.runner.body.velocity.y * 0.025, -14, 22));
            this.runner.setAngularVelocity(airborne ? this.runner.body.angularVelocity : 0);
        }

        collectGem(_runner, gem) {
            this.gemsCollected += 1;
            this.gemScore += 100;
            this.score += 100;
            this.sparkles.setTint(window.VibeRun.COLORS.cyan);
            this.sparkles.explode(10, gem.x, gem.y);
            this.audioEngine.beep("gem");
            this.spawner.releaseSprite(gem);
            this.refreshHud(true);
        }

        canCrashWith(_runner, obstacle) {
            if (!obstacle || obstacle.collectible || obstacle.kind === "gem" || obstacle.texture.key === "gem") {
                return false;
            }
            
            // 包含冒刺类型
            return obstacle.kind === "fallingSpike" || obstacle.kind === "floorSpike" || obstacle.kind === "emergingSpike";
        }

        handleCrash() {
            if (this.gameOver) {
                return;
            }

            this.gameOver = true;
            this.physics.pause();
            this.runner.setTint(0xff9aaa);
            this.audioEngine.beep("crash");
            this.cameras.main.shake(180, 0.008);
            this.gameOverText
                .setText(`CRASH!\nSCORE ${Math.floor(this.score)}\nCLICK OR SPACE TO RESTART`)
                .setVisible(true);
            this.refreshHud(true);
        }

        refreshHud(force, time = 0) {
            if (!force && time - this.lastHudUpdateAt < window.VibeRun.PERFORMANCE.hudIntervalMs) {
                return;
            }
            this.lastHudUpdateAt = time;

            if (!this.hud.heartRate) {
                return;
            }

            this.hud.heartRate.textContent = `${this.formatHeartRate(this.heartRate)} BPM`;
            this.hud.heartRate.classList.toggle("hot", this.getEffectiveHeartRate() >= 112);
            if (this.hud.heartSource) {
                this.hud.heartSource.textContent = this.getHeartSourceLabel();
                this.hud.heartSource.classList.toggle("hot", this.heartSocketStatus === "error");
            }
            if (this.hud.heartSocketUrl) {
                this.hud.heartSocketUrl.textContent = window.VibeRun.HEART_RATE.socketUrl;
            }
            if (this.hud.heartSocketLast) {
                this.hud.heartSocketLast.textContent = this.heartSocketLast || "--";
            }
            if (this.hud.heartRaw) {
                this.hud.heartRaw.textContent = this.formatRawHeartSocketMessage(this.heartSocketRaw);
            }
            if (this.hud.heartParsed) {
                this.hud.heartParsed.textContent = this.heartSocketParsed === null ? "ignored" : `${this.formatHeartRate(this.heartSocketParsed)} BPM`;
            }
            this.hud.difficulty.textContent = `${this.difficulty.toFixed(2)}x`;
            this.hud.speed.textContent = Math.round(this.worldSpeed).toString();
            this.hud.score.textContent = Math.floor(this.score).toString();
            this.hud.gems.textContent = `${this.gemsCollected} (+${this.gemScore})`;
            this.hud.pool.textContent = this.spawner ? this.spawner.getPoolStats() : "0/0";
            if (this.controls.speedScaleValue) {
                this.controls.speedScaleValue.textContent = `${this.speedScale.toFixed(2)}x`;
            }
        }

        handleResize(gameSize) {
            const { width, height } = gameSize;
            this.recalculateWorldMetrics();

            this.backgroundSystem.resize(width, height, this.groundY, this.groundHeight);

            if (this.ground) {
                this.ground.setPosition(width / 2, this.groundY + 12);
                this.ground.width = width;
                if (this.ground.body && this.ground.body.updateFromGameObject) {
                    this.ground.body.updateFromGameObject();
                }
            }

            if (this.runner) {
                this.runner.x = width * 0.18;
            }

            const centerX = width / 2;
            const centerY = height / 2;
            if (this.titleText) {
                this.titleText.setPosition(centerX, centerY - 46);
            }
            if (this.subtitleText) {
                this.subtitleText.setPosition(centerX, centerY);
            }
            if (this.gameOverText) {
                this.gameOverText.setPosition(centerX, centerY - 10);
            }
        }

        getHeartSourceLabel() {
            if (this.heartRateSource === "socket") {
                return this.heartSocketStatus === "connected" ? "HeartSocket" : `Socket ${this.heartSocketStatus}`;
            }

            if (this.heartRateSource === "manual") {
                return "Manual";
            }

            return "Sim";
        }

        formatHeartRate(value) {
            if (!Number.isFinite(value)) {
                return "--";
            }

            return Number.isInteger(value) ? value.toString() : value.toFixed(1);
        }

        getEffectiveHeartRate() {
            return Number.isFinite(this.heartRate) ? this.heartRate : window.VibeRun.HEART_RATE.base;
        }

        formatRawHeartSocketMessage(value) {
            if (!value) {
                return "--";
            }

            const singleLine = String(value).replace(/\s+/g, " ");
            return singleLine.length > 80 ? `${singleLine.slice(0, 77)}...` : singleLine;
        }

        shutdown() {
            if (this.heartSocket) {
                this.heartSocket.close();
                this.heartSocket = null;
            }
        }
    }

    window.VibeRun.VibeRunScene = VibeRunScene;
})();
