(function () {
    window.VibeRun = window.VibeRun || {};

    class BackgroundSystem {
        constructor(scene) {
            this.scene = scene;
            this.layers = {};
        }

        create() {
            const width = this.scene.scale.width;
            const height = this.scene.scale.height;

            this.layers.gradient = this.scene.add.tileSprite(0, 0, width, height, "bgGradient")
                .setOrigin(0)
                .setScrollFactor(0);
            this.layers.gradient.tileScaleY = height / 256;

            this.layers.crystals = this.scene.add.tileSprite(0, 0, width, height, "bgCrystalPattern")
                .setOrigin(0)
                .setAlpha(0.82)
                .setScrollFactor(0);

            this.layers.mountains = this.scene.add.tileSprite(0, height - 320, width, 320, "bgMountains")
                .setOrigin(0)
                .setAlpha(0.92)
                .setScrollFactor(0);

            this.layers.ground = this.scene.add.tileSprite(0, this.scene.groundY, width, this.scene.groundHeight + 40, "groundTrack")
                .setOrigin(0)
                .setScrollFactor(0);
        }

        update(scroll) {
            this.layers.crystals.tilePositionX = scroll * 0.12;
            this.layers.mountains.tilePositionX = scroll * 0.2;
            this.layers.ground.tilePositionX = scroll * 0.95;
        }

        resize(width, height, groundY, groundHeight) {
            this.layers.gradient.setSize(width, height);
            this.layers.gradient.tileScaleY = height / 256;
            this.layers.crystals.setSize(width, height);
            this.layers.mountains.setPosition(0, height - 320);
            this.layers.mountains.setSize(width, 320);
            this.layers.ground.setPosition(0, groundY);
            this.layers.ground.setSize(width, groundHeight + 40);
        }
    }

    window.VibeRun.BackgroundSystem = BackgroundSystem;
})();
