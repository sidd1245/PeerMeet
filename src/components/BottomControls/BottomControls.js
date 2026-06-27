export function createBottomControls() {

    const element = document.createElement("div");
    element.className = "control-bar";
    element.setAttribute("aria-label", "Meeting controls");
    element.innerHTML = `
        <button id="muteBtn" class="control-btn">
            <span class="control-icon">Mic</span>
            <span>Mute</span>
        </button>
        <button id="cameraBtn" class="control-btn">
            <span class="control-icon">Cam</span>
            <span>Camera off</span>
        </button>
        <button id="shareScreenBtn" class="control-btn">
            <span class="control-icon">Scr</span>
            <span>Present</span>
        </button>
        <button id="raiseHandBtn" class="control-btn">
            <span class="control-icon">Hand</span>
            <span>Raise hand</span>
        </button>
        <button id="bottomChatBtn" class="control-btn panel-control">
            <span class="control-icon">Chat</span>
            <span>Chat</span>
        </button>
        <button id="bottomParticipantsBtn" class="control-btn panel-control">
            <span class="control-icon">People</span>
            <span>People</span>
        </button>
        <button id="settingsBtn" class="control-btn">
            <span class="control-icon">Set</span>
            <span>Settings</span>
        </button>
        <button id="leaveRoomBtn" class="control-btn danger">
            <span class="control-icon">Exit</span>
            <span>Leave</span>
        </button>
        <div id="hostControls" class="host-controls" style="display:none;">

        <button id="muteAllBtn" class="control-btn warning">
        <span class="control-icon">All</span>
        <span>Mute all</span>
        </button>

        <button id="lockRoomBtn" class="control-btn warning">
        <span class="control-icon">🔒</span>
        <span>Lock meeting</span>
        </button>

        <button id="endMeetingBtn" class="control-btn danger solid">
        <span class="control-icon">End</span>
        <span>End meeting</span>
        </button>

</div>
    `;

    const refs = {
        muteBtn: element.querySelector("#muteBtn"),
        cameraBtn: element.querySelector("#cameraBtn"),
        shareScreenBtn: element.querySelector("#shareScreenBtn"),
        raiseHandBtn: element.querySelector("#raiseHandBtn"),
        bottomChatBtn: element.querySelector("#bottomChatBtn"),
        bottomParticipantsBtn: element.querySelector("#bottomParticipantsBtn"),
        settingsBtn: element.querySelector("#settingsBtn"),
        leaveRoomBtn: element.querySelector("#leaveRoomBtn"),
        hostControls: element.querySelector("#hostControls"),
        muteAllBtn: element.querySelector("#muteAllBtn"),
        lockRoomBtn: element.querySelector("#lockRoomBtn"),
        endMeetingBtn: element.querySelector("#endMeetingBtn")
    };

    return {
        element,
        setHostControlsVisible: isVisible => {
            refs.hostControls.style.display = isVisible ? "flex" : "none";
        },
        setMuteState: audioEnabled => {
            refs.muteBtn.querySelector("span:last-child").textContent = audioEnabled ? "Mute" : "Unmute";
            refs.muteBtn.classList.toggle("is-active", !audioEnabled);
        },
        setCameraState: videoEnabled => {
            refs.cameraBtn.querySelector("span:last-child").textContent = videoEnabled ? "Camera off" : "Camera on";
            refs.cameraBtn.classList.toggle("is-active", !videoEnabled);
        },
        setHandRaised: handRaised => {
            refs.raiseHandBtn.querySelector("span:last-child").textContent = handRaised ? "Lower hand" : "Raise hand";
            refs.raiseHandBtn.classList.toggle("is-active", handRaised);
        },
        onToggleMicrophone: handler => refs.muteBtn.addEventListener("click", handler),
        onToggleCamera: handler => refs.cameraBtn.addEventListener("click", handler),
        onShareScreen: handler => refs.shareScreenBtn.addEventListener("click", handler),
        onRaiseHand: handler => refs.raiseHandBtn.addEventListener("click", handler),
        onOpenChat: handler => refs.bottomChatBtn.addEventListener("click", handler),
        onOpenParticipants: handler => refs.bottomParticipantsBtn.addEventListener("click", handler),
        onOpenSettings: handler => refs.settingsBtn.addEventListener("click", handler),
        onLeave: handler => refs.leaveRoomBtn.addEventListener("click", handler),
        onMuteAll: handler => refs.muteAllBtn.addEventListener("click", handler),
        setRoomLocked: locked => {
            refs.lockRoomBtn.querySelector("span:last-child").textContent = locked ? "Unlock meeting" : "Lock meeting";
            refs.lockRoomBtn.classList.toggle("is-active", locked);
        },
        onLockRoom: handler => refs.lockRoomBtn.addEventListener("click", handler),
        onEndMeeting: handler => refs.endMeetingBtn.addEventListener("click", handler)
    };

}
