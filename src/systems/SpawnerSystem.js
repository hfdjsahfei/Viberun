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
            if (roll < 48) {
                this.spawnFallingSpike(worldSpeed, difficulty);
                return;
            }

            this.spawnSpikeField(worldSpeed);
            this.spawnPlatform(worldSpeed, true);
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

                if (item.kind !== "fallingSpike") {
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
