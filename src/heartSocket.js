(function () {
    window.VibeRun = window.VibeRun || {};

    class HeartSocketClient {
        constructor({ url, onHeartRate, onStatus, onMessage }) {
            this.url = url;
            this.onHeartRate = onHeartRate;
            this.onStatus = onStatus;
            this.onMessage = onMessage;
            this.socket = null;
            this.reconnectTimer = null;
            this.connectTimer = null;
            this.shouldReconnect = true;
        }

        connect() {
            if (!this.url || this.socket) {
                return;
            }

            this.setStatus("connecting");

            try {
                this.socket = new WebSocket(this.url);
            } catch (_error) {
                this.socket = null;
                this.setStatus("error");
                this.scheduleReconnect();
                return;
            }

            this.connectTimer = window.setTimeout(() => {
                if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
                    this.setStatus("timeout", "connect timeout");
                    this.socket.close();
                }
            }, 6000);

            this.socket.addEventListener("open", () => {
                this.clearConnectTimer();
                this.setStatus("connected");
            });

            this.socket.addEventListener("message", async (event) => {
                const payload = await this.readPayload(event.data);
                const bpm = this.extractHeartRate(payload);
                this.reportMessage(payload, bpm);
                if (bpm === null) {
                    return;
                }
                this.onHeartRate(bpm);
            });

            this.socket.addEventListener("close", (event) => {
                this.clearConnectTimer();
                this.socket = null;
                const detail = event.code ? `close ${event.code}${event.reason ? ` ${event.reason}` : ""}` : "closed";
                this.setStatus("disconnected", detail);
                this.scheduleReconnect();
            });

            this.socket.addEventListener("error", () => {
                this.setStatus("error", "WebSocket error");
            });
        }

        close() {
            this.shouldReconnect = false;
            if (this.reconnectTimer) {
                window.clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            this.clearConnectTimer();

            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
        }

        scheduleReconnect() {
            if (!this.shouldReconnect || this.reconnectTimer) {
                return;
            }

            const delay = window.VibeRun.HEART_RATE.reconnectMs;
            this.reconnectTimer = window.setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, delay);
        }

        clearConnectTimer() {
            if (this.connectTimer) {
                window.clearTimeout(this.connectTimer);
                this.connectTimer = null;
            }
        }

        setStatus(status, detail = "") {
            if (this.onStatus) {
                this.onStatus(status, detail);
            }
        }

        reportMessage(payload, bpm) {
            if (this.onMessage) {
                this.onMessage({
                    raw: typeof payload === "string" ? payload : String(payload),
                    bpm
                });
            }
        }

        async readPayload(payload) {
            if (payload instanceof Blob) {
                return payload.text();
            }

            if (payload instanceof ArrayBuffer) {
                return new TextDecoder("utf-8").decode(payload);
            }

            return payload;
        }

        extractHeartRate(payload) {
            if (typeof payload === "number") {
                return this.toBpm(payload);
            }

            const text = String(payload || "").trim();
            if (!text) {
                return null;
            }

            const directValue = Number(text);
            if (Number.isFinite(directValue)) {
                return this.toBpm(directValue);
            }

            try {
                const data = JSON.parse(text);
                return this.extractFromObject(data, true);
            } catch (_error) {
                const match = text.match(/\b(?:heart\s*rate|heart_rate|bpm|hr)\D+([1-9]\d?(?:\.\d+)?|[12]\d{2}(?:\.\d+)?)\b/i);
                return match ? this.toBpm(Number(match[1])) : null;
            }
        }

        extractFromObject(data, allowRootNumber = false) {
            if (typeof data === "number") {
                return allowRootNumber ? this.toBpm(data) : null;
            }

            if (Array.isArray(data)) {
                for (const item of data) {
                    const bpm = this.extractFromObject(item, false);
                    if (bpm !== null) {
                        return bpm;
                    }
                }
                return null;
            }

            if (!data || typeof data !== "object") {
                return null;
            }

            const keys = ["heartRate", "heart_rate", "hr", "bpm"];
            for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    const bpm = this.toBpm(Number(data[key]));
                    if (bpm !== null) {
                        return bpm;
                    }
                }
            }

            if (Object.prototype.hasOwnProperty.call(data, "value") && this.objectLooksLikeHeartRate(data)) {
                const bpm = this.toBpm(Number(data.value));
                if (bpm !== null) {
                    return bpm;
                }
            }

            for (const value of Object.values(data)) {
                if (value && typeof value === "object") {
                    const bpm = this.extractFromObject(value, false);
                    if (bpm !== null) {
                        return bpm;
                    }
                }
            }

            return null;
        }

        objectLooksLikeHeartRate(data) {
            const labels = ["type", "name", "metric", "key", "sensor", "unit"];
            return labels.some((label) => {
                const value = data[label];
                return typeof value === "string" && /\b(heart\s*rate|heart_rate|hr|bpm)\b/i.test(value);
            });
        }

        toBpm(value) {
            if (!Number.isFinite(value)) {
                return null;
            }

            return value;
        }
    }

    window.VibeRun.HeartSocketClient = HeartSocketClient;
})();
