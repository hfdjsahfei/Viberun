(function () {
    const config = {
        type: Phaser.AUTO,
        parent: "game-root",
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#050014",
        pixelArt: true,
        roundPixels: true,
        resolution: window.VibeRun.PERFORMANCE.renderResolution,
        render: {
            antialias: false,
            pixelArt: true,
            roundPixels: true,
            powerPreference: "high-performance"
        },
        fps: {
            target: 60,
            forceSetTimeOut: false
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: "arcade",
            arcade: {
                gravity: { y: 0 },
                fps: 60,
                debug: false
            }
        },
        scene: [window.VibeRun.VibeRunScene]
    };

    window.addEventListener("load", () => {
        window.vibeRunGame = new Phaser.Game(config);
    });
})();
