import template from "./lobby.html?raw";

import {
    createMeetingInfo
} from "../../components/MeetingInfo/MeetingInfo.js";

export function createLobbyPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const meetingInfo = createMeetingInfo();

    element
        .querySelector("#meetingInfoMount")
        .appendChild(meetingInfo.element);

    const refs = {
        status: element.querySelector("#appStatus"),
        userNameInput: element.querySelector("#userNameInput"),
        roomInput: element.querySelector("#roomInput"),
        createRoomBtn: element.querySelector("#createRoomBtn"),
        joinRoomBtn: element.querySelector("#joinRoomBtn")
    };

    return {
        element,
        show: () => element.classList.remove("is-hidden"),
        hide: () => element.classList.add("is-hidden"),
        setStatus: (label, state = "idle") => {
            refs.status.textContent = label;
            refs.status.dataset.state = state;
        },
        getUserName: () => refs.userNameInput.value.trim(),
        setUserName: name => {
            refs.userNameInput.value = name;
        },
        focusUserName: () => refs.userNameInput.focus(),
        getRoomId: () => refs.roomInput.value.trim(),
        setRoomId: roomId => {
            refs.roomInput.value = roomId;
        },
        focusRoomInput: () => refs.roomInput.focus(),
        setMeetingLink: meetingInfo.setLink,
        markLinkCopied: meetingInfo.markCopied,
        onCreate: handler => refs.createRoomBtn.addEventListener("click", handler),
        onJoin: handler => refs.joinRoomBtn.addEventListener("click", handler),
        onCopyLink: meetingInfo.onCopy,
        onRoomInput: handler => refs.roomInput.addEventListener("input", handler)
    };

}
