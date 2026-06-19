export function createParticipantPanel() {

    const element = document.createElement("section");
    element.className = "panel-view";
    element.dataset.panelView = "participants";
    element.setAttribute("role", "tabpanel");
    element.innerHTML = `
        <div class="panel-heading">
            <h3>Participants</h3>
        </div>
        <div
                id="participants"
                class="participants-list"
        ></div>
    `;

    const list = element.querySelector("#participants");

    function showEmpty() {
        list.innerHTML = `<div class="empty-state">Participants will appear here.</div>`;
    }

    return {
        element,
        showEmpty,
        render: ({participants, mediaStatusFor, hostName}) => {
            list.innerHTML = "";

            const topBarCount = document.getElementById("participantCount");
            topBarCount.textContent = participants.size;

            if (!participants.size) {
                showEmpty();
                return;
            }

            participants.forEach(participant => {
                list.appendChild(createParticipantCard({
                    participant,
                    media: mediaStatusFor(participant.id) || {
                        audioEnabled: true,
                        videoEnabled: true
                    },
                    isHost: participant.name === hostName
                }));
            });
        }
    };

}

function createParticipantCard({participant, media, isHost}) {

    const card = document.createElement("div");
    card.className = "participant-card";

    const avatar = document.createElement("div");
    avatar.className = "participant-avatar";
    avatar.textContent = participant.name?.charAt(0)?.toUpperCase() || "?";

    const content = document.createElement("div");
    content.className = "participant-content";

    const name = document.createElement("div");
    name.className = "participant-name";
    name.textContent = participant.name;

    if (isHost) {
        name.appendChild(createBadge("Host", "host"));
    }

    if (participant.handRaised) {
        name.appendChild(createBadge("Hand raised", "hand"));
    }

    const status = document.createElement("div");
    status.className = "participant-status";
    status.append(
        createStatus(media.audioEnabled ? "Mic on" : "Muted", !media.audioEnabled),
        createStatus(media.videoEnabled ? "Camera on" : "Camera off", !media.videoEnabled)
    );

    content.append(name, status);
    card.append(avatar, content);

    return card;

}

function createBadge(text, variant) {

    const badge = document.createElement("span");
    badge.className = `badge ${variant}`;
    badge.textContent = text;
    return badge;

}

function createStatus(text, isOff) {

    const status = document.createElement("span");
    status.className = `status-dot${isOff ? " off" : ""}`;
    status.textContent = text;
    return status;

}
