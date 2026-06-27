import template from "./prejoin.html?raw";
import {
    createMeetingInfo
} from "../../components/MeetingInfo/MeetingInfo.js";

export function createPreJoinPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const meetingInfo = createMeetingInfo();
    const refs = {
        video: element.querySelector("#preJoinVideo"),
        roomId: element.querySelector("#preJoinRoomId"),
        identity: element.querySelector("#preJoinIdentity"),
        userName: element.querySelector("#preJoinUserName"),
        mic: element.querySelector("#previewMicBtn"),
        camera: element.querySelector("#previewCameraBtn"),
        join: element.querySelector("#joinNowBtn"),
        ask: element.querySelector("#askToJoinBtn"),
        back: element.querySelector("#backToLobbyBtn")
    };

    element
        .querySelector("#meetingInfoMount")
        .appendChild(meetingInfo.element);

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
        setUser: user => {
            refs.userName.textContent = user?.name || "";
        },
        getPreferences: () => ({
            audioEnabled,
            videoEnabled
        }),
        onJoinNow: handler => refs.join.addEventListener("click", handler),
        onBack: handler => refs.back.addEventListener("click", handler),
        setMeetingLink: meetingInfo.setLink,
        markLinkCopied: meetingInfo.markCopied,
        onCopyLink: meetingInfo.onCopy,
    };

}
