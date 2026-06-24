export function createSettingsPanel() {

    const element = document.createElement("dialog");
    element.className = "settings-dialog";
    element.innerHTML = `
        <form method="dialog" class="settings-card">
            <header class="settings-header">
                <div>
                    <span class="section-label">Meeting settings</span>
                    <h2>Devices</h2>
                </div>
                <button
                        class="icon-btn"
                        value="close"
                >
                    Close
                </button>
            </header>

            <div class="settings-grid">
                <label class="field-group">
                    Microphone
                    <select id="microphoneSelect" class="select-input"></select>
                </label>
                <label class="field-group">
                    Camera
                    <select id="cameraSelect" class="select-input"></select>
                </label>
                <label class="field-group">
                    Speaker
                    <select id="speakerSelect" class="select-input"></select>
                </label>
            </div>
        </form>
    `;

    const refs = {
        microphone: element.querySelector("#microphoneSelect"),
        camera: element.querySelector("#cameraSelect"),
        speaker: element.querySelector("#speakerSelect")
    };

    async function refreshDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            fillSelect(refs.microphone, [], "Device list unavailable");
            fillSelect(refs.camera, [], "Device list unavailable");
            fillSelect(refs.speaker, [], "Device list unavailable");
            return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();

        fillSelect(refs.microphone, devices.filter(device => device.kind === "audioinput"), "Default microphone");
        fillSelect(refs.camera, devices.filter(device => device.kind === "videoinput"), "Default camera");
        fillSelect(refs.speaker, devices.filter(device => device.kind === "audiooutput"), "Default speaker");
    }

    const listeners = {
        camera: null, microphone: null
    };

    refs.camera.addEventListener("change", event => {
        listeners.camera?.(event.target.value);
    });

    refs.microphone.addEventListener("change", event => {
        listeners.microphone?.(event.target.value);
    });

    return {
        element, open: async () => {
            await refreshDevices();
            element.showModal();
        }, close: () => element.close(),
        onCameraChanged: callback => {
            listeners.camera = callback;
        },

        onMicrophoneChanged: callback => {
            listeners.microphone = callback;
        },
    };

}

function fillSelect(select, devices, fallbackLabel) {

    select.innerHTML = "";

    if (!devices.length) {
        const option = document.createElement("option");
        option.textContent = fallbackLabel;
        option.value = "";
        select.appendChild(option);
        return;
    }

    devices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = device.label || `${fallbackLabel} ${index + 1}`;
        select.appendChild(option);
    });

}
