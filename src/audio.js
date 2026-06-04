(function () {
    window.VibeRun = window.VibeRun || {};

    class VibeAudioEngine {
        constructor() {
            this.ctx = null;
            this.masterGain = null;
        }

        init() {
            if (this.ctx) {
                return;
            }

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                return;
            }

            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.1;
            this.masterGain.connect(this.ctx.destination);
        }

        async resume() {
            this.init();
            if (this.ctx && this.ctx.state === "suspended") {
                await this.ctx.resume();
            }
        }

        beep(type) {
            if (!this.ctx) {
                return;
            }

            const time = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const crash = type === "crash";
            const gem = type === "gem";

            osc.type = crash ? "sawtooth" : "square";
            osc.frequency.setValueAtTime(crash ? 140 : gem ? 820 : 460, time);
            osc.frequency.exponentialRampToValueAtTime(crash ? 55 : gem ? 1240 : 740, time + 0.1);
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.exponentialRampToValueAtTime(crash ? 0.14 : gem ? 0.055 : 0.07, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + (gem ? 0.11 : 0.16));

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + (gem ? 0.13 : 0.18));
        }
    }

    window.VibeRun.VibeAudioEngine = VibeAudioEngine;
})();
