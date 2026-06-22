export function createTopBar() {

    const element = document.createElement("div");
    element.className = "meeting-topbar";
    element.innerHTML = `
        <div class="meeting-title">
            <div class="brand-mini">P</div>
            <div>
                <span class="section-label">Meeting</span>
                <h2 id="currentRoom">None</h2>
            </div>
        </div>

        <div class="meeting-meta">
            <span
                    id="meetingStatus"
                    class="status-pill is-live"
            >
                Live
            </span>
            <span class="meta-chip">Host: <strong id="hostName">Unknown</strong></span>
            <span class="meta-chip"><strong id="participantCount">0</strong> participants</span>
        </div>
    `;

    const refs = {
        roomId: element.querySelector("#currentRoom"),
        status: element.querySelector("#meetingStatus"),
        hostName: element.querySelector("#hostName"),
    };

    return {
        element,
        setRoomId: roomId => {
            refs.roomId.textContent = roomId || "None";
        },
        getRoomId: () => refs.roomId.textContent,
        setStatus: status => {
            refs.status.textContent = status;
        },
        setHostName: name => {
            refs.hostName.textContent = name || "Unknown";
        },
        getHostName: () => refs.hostName.textContent,
    };

}
