(function () {
    window.VibeRun = window.VibeRun || {};

    function createPixelArtTextures(scene) {
        createRunnerTexture(scene);
        createSpikeTexture(scene);
        createBallTexture(scene);
        createPlatformTexture(scene);
        createGemTexture(scene);
        createPixelTexture(scene);
        createBackgroundTextures(scene);
    }

    function createRunnerTexture(scene) {
        if (scene.textures.exists("runner")) {
            return;
        }
        const g = scene.make.graphics({ add: false });
        g.fillStyle(0xffffff, 1);
        g.fillRect(10, 18, 38, 28);
        g.fillRect(0, 28, 20, 18);
        g.fillRect(44, 28, 10, 10);
        g.fillStyle(0xffd36e, 1);
        g.fillRect(0, 34, 12, 8);
        g.fillStyle(0x2b1a63, 1);
        g.fillRect(34, 24, 6, 6);
        g.fillStyle(0x9cf5ff, 1);
        g.fillRect(32, 20, 12, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRect(16, 46, 8, 8);
        g.fillRect(34, 46, 8, 8);
        g.generateTexture("runner", 58, 58);
        g.destroy();
    }

    function createSpikeTexture(scene) {
        if (scene.textures.exists("spike")) {
            return;
        }
        const colors = window.VibeRun.COLORS;
        const g = scene.make.graphics({ add: false });
        g.fillStyle(colors.white, 1);
        g.fillTriangle(0, 40, 16, 0, 32, 40);
        g.fillStyle(0xd8e0ff, 1);
        g.fillTriangle(16, 0, 32, 40, 23, 40);
        g.lineStyle(2, colors.shadow, 1);
        g.strokeTriangle(0, 40, 16, 0, 32, 40);
        g.generateTexture("spike", 32, 42);
        g.destroy();
    }

    function createBallTexture(scene) {
        if (scene.textures.exists("spikeBall")) {
            return;
        }
        const colors = window.VibeRun.COLORS;
        const g = scene.make.graphics({ add: false });
        g.fillStyle(0x21235f, 1);
        g.fillCircle(24, 24, 17);
        g.fillStyle(colors.white, 1);
        for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            const x = 24 + Math.cos(angle) * 21;
            const y = 24 + Math.sin(angle) * 21;
            g.fillTriangle(
                24 + Math.cos(angle - 0.18) * 14,
                24 + Math.sin(angle - 0.18) * 14,
                x,
                y,
                24 + Math.cos(angle + 0.18) * 14,
                24 + Math.sin(angle + 0.18) * 14
            );
        }
        g.fillStyle(colors.cyan, 1);
        g.fillCircle(19, 18, 5);
        g.lineStyle(2, colors.shadow, 1);
        g.strokeCircle(24, 24, 17);
        g.generateTexture("spikeBall", 48, 48);
        g.destroy();
    }

    function createPlatformTexture(scene) {
        if (scene.textures.exists("platform")) {
            return;
        }
        const colors = window.VibeRun.COLORS;
        const g = scene.make.graphics({ add: false });
        g.fillStyle(0xf3a4ff, 1);
        g.fillRect(0, 0, 96, 8);
        g.fillStyle(0x7132c5, 1);
        g.fillRect(0, 8, 96, 10);
        g.fillStyle(0xffd8ff, 1);
        g.fillRect(8, 2, 80, 2);
        g.lineStyle(2, colors.shadow, 1);
        g.strokeRect(0, 0, 96, 18);
        g.generateTexture("platform", 96, 18);
        g.destroy();
    }

    function createGemTexture(scene) {
        if (scene.textures.exists("gem")) {
            return;
        }
        const colors = window.VibeRun.COLORS;
        const g = scene.make.graphics({ add: false });
        g.fillStyle(colors.cyan, 1);
        g.fillTriangle(12, 0, 24, 12, 12, 24);
        g.fillStyle(0x56b8ff, 1);
        g.fillTriangle(12, 0, 12, 24, 0, 12);
        g.fillStyle(0xd8ffff, 1);
        g.fillRect(8, 6, 5, 4);
        g.generateTexture("gem", 24, 24);
        g.destroy();
    }

    function createPixelTexture(scene) {
        if (scene.textures.exists("pixel")) {
            return;
        }
        const g = scene.make.graphics({ add: false });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture("pixel", 4, 4);
        g.destroy();
    }

    function createBackgroundTextures(scene) {
        if (!scene.textures.exists("bgGradient")) {
            const g = scene.make.graphics({ add: false });
            g.fillGradientStyle(0x210052, 0x360078, 0x110033, 0x19004a, 1);
            g.fillRect(0, 0, 16, 256);
            g.generateTexture("bgGradient", 16, 256);
            g.destroy();
        }

        if (!scene.textures.exists("bgCrystalPattern")) {
            const g = scene.make.graphics({ add: false });
            g.lineStyle(2, 0xff9df8, 0.42);
            g.strokeRect(12, -32, 170, 170);
            g.strokeRect(88, 210, 150, 150);
            g.lineStyle(2, 0xff9df8, 0.22);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(180, 320);
            g.strokePath();
            g.generateTexture("bgCrystalPattern", 240, 320);
            g.destroy();
        }

        if (!scene.textures.exists("bgMountains")) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0x9b3bd6, 0.34);
            g.fillTriangle(0, 110, 96, 10, 206, 110);
            g.fillTriangle(44, 320, 126, 218, 230, 320);
            g.generateTexture("bgMountains", 240, 320);
            g.destroy();
        }

        if (!scene.textures.exists("groundTrack")) {
            const colors = window.VibeRun.COLORS;
            const g = scene.make.graphics({ add: false });
            g.fillStyle(colors.purple0, 1);
            g.fillRect(0, 0, 72, 96);
            g.fillStyle(colors.purple2, 1);
            g.fillRect(0, 0, 72, 10);
            g.fillStyle(colors.pink, 1);
            g.fillRect(0, -4, 44, 6);
            g.fillRect(46, 0, 16, 10);
            g.lineStyle(2, colors.cyan, 0.35);
            g.lineBetween(0, 12, 72, 12);
            g.generateTexture("groundTrack", 72, 96);
            g.destroy();
        }
    }

    window.VibeRun.createPixelArtTextures = createPixelArtTextures;
})();
