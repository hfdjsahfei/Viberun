(function () {
    window.VibeRun = window.VibeRun || {};

    class SpawnerSystem {
        constructor(scene) {
            this.scene = scene;
            this.lastHazardAt = 0;
            this.lastPlatformAt = 0;
            this.activeCounts = { obstacles: 0, platforms: 0 };
        }

        create() {
            const limits = window.VibeRun.POOL_LIMITS;
            this.obstacles = this.scene.physics.add.group({
                allowGravity: false,
                immovable: true,
                maxSize: limits.obstacles,
                runChildUpdate: false
            });
            this.platforms = this.scene.physics.add.group({
                allowGravity: false,
                immovable: true,
                maxSize: limits.platforms,
                runChildUpdate: false
            });
            this.scene.physics.add.overlap(
                this.scene.runner,
                this.obstacles,
                this.scene.handleCrash,
                this.scene.canCrashWith,
                this.scene
            );
            this.scene.physics.add.collider(
                this.scene.runner,
                this.platforms,
                this.scene.landOnPlatform,
                this.scene.canLandOnPlatform,
                this.scene
            );
        }

        update(time, worldSpeed, spawnDelay, difficulty) {
            if (time - this.lastHazardAt > spawnDelay) {
                this.spawnHazardPattern(worldSpeed, difficulty);
                this.lastHazardAt = time;
            }

            const platformDelay = Phaser.Math.Linear(1800, 1250, Phaser.Math.Clamp(difficulty - 1, 0, 1));
            if (time - this.lastPlatformAt > platformDelay) {
                this.spawnPlatform(worldSpeed, false);
                this.lastPlatformAt = time;
            }

            this.updateGroup(this.obstacles, worldSpeed);
            this.updateGroup(this.platforms, worldSpeed);
        }

        spawnHazardPattern(worldSpeed, difficulty) {
            const roll = Phaser.Math.Between(0, 99);
            
            // 新的概率分配：
            // 40% 下落尖刺 | 20% 地面尖刺（从地下冒出）| 30% 尖刺群 + 平台
            if (roll < 40) {
                this.spawnFallingSpike(worldSpeed, difficulty);
            } else if (roll < 60) {
                this.spawnEmergingSpike(worldSpeed, difficulty);  // 新增：冒刺
            } else {
                this.spawnSpikeField(worldSpeed);
                this.spawnPlatform(worldSpeed, true);
            }
        }

        spawnFallingSpike(worldSpeed, difficulty) {
            const spike = this.obtain(this.obstacles, "spike");
            if (!spike) {
                return;
            }

            const x = Phaser.Math.Between(Math.floor(this.scene.scale.width * 0.52), this.scene.scale.width + 90);
            this.resetSprite(spike, x, -32, 44, 58);
            spike.body.setSize(30, 48);
            spike.body.setOffset(7, 5);
            spike.body.setVelocity(-worldSpeed * 0.32, 245 + difficulty * 70);
            spike.setAngle(180);
            spike.kind = "fallingSpike";
        }

        showGroundCrack(x, groundY) {
            const crack = this.scene.add.graphics();
            crack.lineStyle(3, 0xff6633, 0.9);  // 线条加粗
            
            // 绘制更大的裂纹
            crack.beginPath();
            crack.moveTo(x - 25, groundY - 8);
            crack.lineTo(x - 15, groundY - 18);
            crack.lineTo(x - 5, groundY - 12);
            crack.lineTo(x, groundY - 20);
            crack.lineTo(x + 10, groundY - 14);
            crack.lineTo(x + 20, groundY - 22);
            crack.lineTo(x + 30, groundY - 10);
            crack.lineTo(x + 38, groundY - 15);
            crack.strokePath();
            
            // 添加裂纹周围的暗色区域
            crack.fillStyle(0x441122, 0.5);
            crack.fillRect(x - 30, groundY - 25, 70, 30);
            
            crack.setDepth(5);
            
            // 裂纹淡出消失（时间稍长）
            this.scene.tweens.add({
                targets: crack,
                alpha: 0,
                duration: 800,
                onComplete: () => {
                    crack.destroy();
                }
            });
        }
        
        spawnEmergingSpike(worldSpeed, difficulty) {
            const spike = this.obtain(this.obstacles, "spike");
            if (!spike) {
                return;
            }
            
            // 改为更靠近玩家的位置（从屏幕右侧更近的地方生成）
            // 原来：屏幕宽度的55%到屏幕外+100
            // 现在：屏幕宽度的35%到65%（更靠近玩家）
            const minX = Math.floor(this.scene.scale.width * 0.35);
            const maxX = Math.floor(this.scene.scale.width * 0.65);
            const x = Phaser.Math.Between(minX, maxX);
            
            const groundY = this.scene.groundY;
            const startY = groundY + 30;      // 起始位置更深（+25 → +30）
            const endY = groundY - 45;        // 冒出更高（-28 → -45，尖刺更大更长）
            
            // 尖刺显示尺寸加大（42,52 → 56,70）
            this.resetSprite(spike, x, startY, 56, 70);
            spike.body.setSize(40, 62);       // 碰撞箱也加大
            spike.body.setOffset(8, 4);
            spike.body.setVelocityX(-worldSpeed * 0.3);  // 移动速度减慢，更聚焦在玩家附近
            
            spike.kind = "emergingSpike";
            spike.emergingProgress = 0;
            spike.emergingSpeed = 0.12 + difficulty * 0.04;  // 冒出速度加快
            spike.startY = startY;
            spike.endY = endY;
            spike.isEmerging = true;
            
            // 显示警告（警告位置也相应调整）
            this.showSpikeWarning(x, groundY);
            
            // 添加地面裂纹效果
            this.showGroundCrack(x, groundY);
        }
        
        showSpikeWarning(x, groundY) {
            // 加大警告标识，更明显
            const warning = this.scene.add.rectangle(x, groundY - 20, 45, 12, 0xff3366);
            warning.setAlpha(0.85);
            warning.setDepth(10);
            
            // 添加外发光效果
            const glow = this.scene.add.rectangle(x, groundY - 20, 60, 20, 0xff0000);
            glow.setAlpha(0.3);
            glow.setDepth(9);
            glow.setBlendMode(Phaser.BlendModes.ADD);
            
            // 闪烁动画（更快更明显）
            this.scene.tweens.add({
                targets: [warning, glow],
                alpha: { from: 0.85, to: 0.2 },
                duration: 200,
                repeat: 3,
                yoyo: true,
                onComplete: () => {
                    warning.destroy();
                    glow.destroy();
                }
            });
            
            // 添加地面震动效果（可选）
            this.scene.cameras.main.shake(80, 0.003);
        }
        addEmergeShockwave(x, y) {
            // 创建圆形冲击波
            const shockwave = this.scene.add.circle(x, y + 20, 5, 0xff6633);
            shockwave.setAlpha(0.8);
            shockwave.setDepth(8);
            
            this.scene.tweens.add({
                targets: shockwave,
                scale: 3,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    shockwave.destroy();
                }
            });
            
            // 添加粒子效果（尘土飞扬）
            for (let i = 0; i < 8; i++) {
                const dust = this.scene.add.rectangle(
                    x + Phaser.Math.Between(-15, 15),
                    y + 15,
                    4, 4,
                    0xaa8866
                );
                dust.setAlpha(0.6);
                
                this.scene.tweens.add({
                    targets: dust,
                    y: dust.y - Phaser.Math.Between(10, 25),
                    alpha: 0,
                    scale: 0,
                    duration: 400,
                    onComplete: () => {
                        dust.destroy();
                    }
                });
            }
        }
        spawnSpikeField(worldSpeed) {
            const count = Phaser.Math.Between(5, 8);
            for (let i = 0; i < count; i += 1) {
                const spike = this.obtain(this.obstacles, "spike");
                if (!spike) {
                    return;
                }

                this.resetSprite(spike, this.scene.scale.width + 42 + i * 30, this.scene.groundY - 21, 32, 42);
                spike.body.setSize(24, 32);
                spike.body.setOffset(4, 9);
                spike.body.setVelocityX(-worldSpeed);
                spike.kind = "floorSpike";
            }
        }

        spawnPlatform(worldSpeed, forceUseful) {
            const platform = this.obtain(this.platforms, "platform");
            if (!platform) {
                return;
            }

            const yMin = Math.max(150, Math.floor(this.scene.scale.height * 0.3));
            const yMax = Math.max(yMin + 20, this.scene.groundY - 120);
            const y = forceUseful ? this.scene.groundY - 126 : Phaser.Math.Between(yMin, yMax);

            this.resetSprite(platform, this.scene.scale.width + 70, y, 118, 22);
            platform.body.setSize(118, 18);
            platform.body.setVelocityX(-worldSpeed);
            platform.body.allowGravity = false;
            platform.body.immovable = true;
            platform.body.pushable = false;
            platform.body.checkCollision.none = false;
            platform.body.checkCollision.up = true;
            platform.body.checkCollision.down = false;
            platform.body.checkCollision.left = false;
            platform.body.checkCollision.right = false;
            platform.kind = "platform";

            // Blue floating collectibles are disabled for now.
        }

        obtain(group, texture) {
            const sprite = group.get(0, 0, texture);
            if (!sprite) {
                return null;
            }
            sprite.setTexture(texture);
            return sprite;
        }

        resetSprite(sprite, x, y, width, height) {
            sprite.enableBody(true, x, y, true, true);
            sprite.setActive(true);
            sprite.setVisible(true);
            sprite.setDisplaySize(width, height);
            sprite.setAngle(0);
            sprite.setAngularVelocity(0);
            sprite.body.allowGravity = false;
            sprite.body.immovable = true;
            sprite.body.pushable = false;
            sprite.body.enable = true;
            sprite.body.checkCollision.none = false;
            sprite.body.checkCollision.up = true;
            sprite.body.checkCollision.down = true;
            sprite.body.checkCollision.left = true;
            sprite.body.checkCollision.right = true;
            sprite.collectible = false;
        }

        updateGroup(group, worldSpeed) {
            group.children.iterate((item) => {
                if (!item || !item.active) {
                    return;
                }
                
                // 处理冒刺动画
                if (item.kind === "emergingSpike" && item.isEmerging) {
                    item.emergingProgress += item.emergingSpeed;
                    
                    if (item.emergingProgress >= 1) {
                        // 冒出完成时增加冲击波效果
                        this.addEmergeShockwave(item.x, item.y);
                        item.y = item.endY;
                        item.isEmerging = false;
                        item.body.setVelocityX(-worldSpeed);
                        item.kind = "floorSpike";
                        item.clearTint();
                        item.setAlpha(1);
                    } else {
                        // 使用更明显的缓动曲线
                        const easeProgress = Math.pow(item.emergingProgress, 1.2);
                        item.y = item.startY + (item.endY - item.startY) * easeProgress;
                        // 冒出时震动更明显
                        item.setAngle(Math.sin(item.emergingProgress * Math.PI * 6) * 8);
                        // 逐渐显示尖刺（从半透明到不透明）
                        item.setAlpha(0.5 + item.emergingProgress * 0.5);
                    }
                    return;
                }
                
                if (item.kind !== "fallingSpike" && item.kind !== "emergingSpike") {
                    item.body.setVelocityX(-worldSpeed);
                }
                
                if (item.x < -140 || item.y > this.scene.scale.height + 140) {
                    this.release(group, item);
                }
            });
        }

        release(group, item) {
            group.killAndHide(item);
            item.body.stop();
            item.body.enable = false;
            item.kind = "";
            item.collectible = false;
            // 清理冒刺相关属性
            delete item.isEmerging;
            delete item.emergingProgress;
            delete item.emergingSpeed;
            delete item.startY;
            delete item.endY;
        }

        releaseSprite(sprite) {
            if (this.obstacles.contains(sprite)) {
                this.release(this.obstacles, sprite);
                return;
            }
            if (this.platforms.contains(sprite)) {
                this.release(this.platforms, sprite);
                return;
            }
        }

        updateCounts() {
            this.activeCounts.obstacles = this.countActive(this.obstacles);
            this.activeCounts.platforms = this.countActive(this.platforms);
        }

        countActive(group) {
            let count = 0;
            group.children.iterate((item) => {
                if (item && item.active) {
                    count += 1;
                }
            });
            return count;
        }

        getPoolStats() {
            const limits = window.VibeRun.POOL_LIMITS;
            this.updateCounts();
            const active = this.activeCounts.obstacles + this.activeCounts.platforms;
            const total = limits.obstacles + limits.platforms;
            return `${active}/${total}`;
        }
    }

    window.VibeRun.SpawnerSystem = SpawnerSystem;
})();
