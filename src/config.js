(function () {
    window.VibeRun = window.VibeRun || {};

    window.VibeRun.COLORS = {
        purple0: 0x120037,
        purple1: 0x260064,
        purple2: 0x5e1ba8,
        purple3: 0xb74de6,
        pink: 0xff8cf4,
        cyan: 0x87f2ff,
        yellow: 0xffe66d,
        white: 0xffffff,
        shadow: 0x16002d
    };

    window.VibeRun.HEART_RATE = {
        base: 78,
        min: 35,
        max: 220,
        simMin: 68,
        simMax: 138,
        simRetargetMs: 1300,
        socketUrl: "ws://10.34.74.90:12121",
        reconnectMs: 2200
    };

    window.VibeRun.POOL_LIMITS = {
        obstacles: 48,
        platforms: 12,
        gems: 12
    };

    window.VibeRun.PHYSICS = {
        gravityY: 1700,
        baseSpeed: 320,
        maxHeartBonusSpeed: 210,
        baseSpawnDelay: 1220,
        maxSpawnDelayDrop: 360
    };

    window.VibeRun.PERFORMANCE = {
        renderResolution: 1,
        maxDeltaMs: 34,
        hudIntervalMs: 160
    };
})();
