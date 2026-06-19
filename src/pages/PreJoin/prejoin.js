import template from "./prejoin.html?raw";

export function createPreJoinPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const refs = {
        video: element.querySelector("#preJoinVideo"),
        roomId: element.querySelector("#preJoinRoomId"),
        identity: element.querySelector("#preJoinIdentity"),
        name: element.querySelector("#preJoinNameInput"),
        mic: element.querySelector("#previewMicBtn"),
        camera: element.querySelector("#previewCameraBtn"),
        join: element.querySelector("#joinNowBtn"),
        ask: element.querySelector("#askToJoinBtn"),
        back: element.querySelector("#backToLobbyBtn")
    };

    let previewStream = null;
    let audioEnabled = true;
    let videoEnabled = true;

    async function startPreview() {
        stopPreview();

        try {
            previewStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            refs.video.srcObject = previewStream;
        } catch {
            previewStream = null;
        }
    }

    function stopPreview() {
        previewStream?.getTracks().forEach(track => track.stop());
        previewStream = null;
        refs.video.srcObject = null;
    }

    function setToggleState(button, isEnabled, enabledText, disabledText) {
        button.querySelector("span:last-child").textContent = isEnabled ? enabledText : disabledText;
        button.classList.toggle("is-active", !isEnabled);
    }

    refs.mic.addEventListener("click", () => {
        audioEnabled = !audioEnabled;
        previewStream?.getAudioTracks().forEach(track => {
            track.enabled = audioEnabled;
        });
        setToggleState(refs.mic, audioEnabled, "Mic on", "Mic off");
    });

    refs.camera.addEventListener("click", () => {
        videoEnabled = !videoEnabled;
        previewStream?.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
        });
        setToggleState(refs.camera, videoEnabled, "Camera on", "Camera off");
    });

    return {
        element,
        show: async () => {
            element.classList.remove("is-hidden");
            await startPreview();
        },
        hide: () => {
            stopPreview();
            element.classList.add("is-hidden");
        },
        setRoomId: roomId => {
            refs.roomId.textContent = roomId || "None";
        },
        setProfile: profile => {
            refs.name.value = profile?.name || "";
            refs.identity.textContent = profile?.authType === "guest"
                ? "Joining as guest"
                : `Signed in as ${profile?.email || profile?.name || "PeerMeet user"}`;
            refs.ask.classList.toggle("is-hidden", profile?.authType !== "guest");
        },
        getName: () => refs.name.value.trim(),
        getPreferences: () => ({
            audioEnabled,
            videoEnabled
        }),
        onJoinNow: handler => refs.join.addEventListener("click", handler),
        onAskToJoin: handler => refs.ask.addEventListener("click", handler),
        onBack: handler => refs.back.addEventListener("click", handler)
    };

}
