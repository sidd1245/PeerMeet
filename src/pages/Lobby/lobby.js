import template from "./lobby.html?raw";
import {
    createMeetingHistory
} from "../../components/MeetingHistory/MeetingHistory.js";


export function createLobbyPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const meetingHistory = createMeetingHistory();

    const refs = {
        status: element.querySelector("#appStatus"),
        roomInput: element.querySelector("#roomInput"),
        createRoomBtn: element.querySelector("#createRoomBtn"),
        joinRoomBtn: element.querySelector("#joinRoomBtn"),
        signedInName: element.querySelector("#signedInName"),
        signedInEmail: element.querySelector("#signedInEmail"),
        logoutBtn: element.querySelector("#logoutBtn"),
        meetingHistoryMount: element.querySelector("#meetingHistoryMount")
    };
    refs.meetingHistoryMount.appendChild(meetingHistory.element);
    return {
        element,
        show: () => element.classList.remove("is-hidden"),
        hide: () => element.classList.add("is-hidden"),
        setStatus: (label, state = "idle") => {
            refs.status.textContent = label;
            refs.status.dataset.state = state;
        },
        setUser(user) {
            refs.signedInName.textContent = user.name;
            refs.signedInEmail.textContent = user.email;
        },
        getRoomId: () => refs.roomInput.value.trim(),
        setRoomId: roomId => {
            refs.roomInput.value = roomId;
        },
        focusRoomInput: () => refs.roomInput.focus(),
        onCreate: handler => refs.createRoomBtn.addEventListener("click", handler),
        onJoin: handler => refs.joinRoomBtn.addEventListener("click", handler),
        onLogout: handler => refs.logoutBtn.addEventListener("click", handler),
        onRoomInput: handler => refs.roomInput.addEventListener("input", handler),
        renderMeetingHistory: meetingHistory.render
    };

}
