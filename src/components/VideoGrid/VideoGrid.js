export function getOrCreateVideoTile({
                                         id, label, isLocal = false
                                     }) {

    let tile = document.getElementById(`${id}Tile`);

    if (!tile) {
        tile = document.createElement("div");
        tile.id = `${id}Tile`;
        tile.className = "video-tile";

        const video = document.createElement("video");

        const avatar = document.createElement("div");

        avatar.className = "avatar-placeholder";

        avatar.textContent = label.charAt(0).toUpperCase();

        const micBadge = document.createElement("div");

        micBadge.className = "mic-indicator";

        micBadge.textContent = "🔇";

        video.id = id;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal;

        const labelEl = document.createElement("span");
        labelEl.className = "video-label";
        labelEl.textContent = label;

        tile.append(video, avatar, micBadge, labelEl);

        document
            .getElementById("videoGrid")
            .appendChild(tile);
    }

    return tile.querySelector("video");

}

export function removeVideoTile(id) {

    const tile = document.getElementById(`${id}Tile`);
    const video = document.getElementById(id);

    if (tile) {
        tile.remove();
        return;
    }

    video?.remove();

}

export function showAvatar(id) {

    const tile = document.getElementById(`${id}Tile`);

    if (!tile) {
        return;
    }

    tile.classList.add("camera-off");

}

export function hideAvatar(id) {

    const tile = document.getElementById(`${id}Tile`);

    if (!tile) {
        return;
    }

    tile.classList.remove("camera-off");

}

export function setMicMuted(id) {

    document
        .getElementById(`${id}Tile`)
        ?.classList.add("mic-muted");

}

export function setMicUnmuted(id) {

    document
        .getElementById(`${id}Tile`)
        ?.classList.remove("mic-muted");

}

export function setPresenter(id) {

    document
        .querySelectorAll(".video-tile")
        .forEach(tile => tile.classList.remove("is-presenting"));

    document
        .getElementById(`${id}Tile`)
        ?.classList.add("is-presenting");

}

// --- Presentation stage -------------------------------------------------
// Screen-share tracks render here instead of in a participant video tile.
// Uses a separate id namespace ("stage-<identity>") so it can never collide
// with a participant's own camera tile, even when they share both at once.

export function getOrCreatePresentationStage({
                                                 id, label
                                             }) {

    const stageId = `stage-${id}`;

    let tile = document.getElementById(`${stageId}Tile`);

    if (!tile) {
        tile = document.createElement("div");
        tile.id = `${stageId}Tile`;
        tile.className = "stage-tile";

        const video = document.createElement("video");

        video.id = stageId;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;

        const labelEl = document.createElement("span");
        labelEl.className = "video-label";
        labelEl.textContent = `${label} is presenting`;

        tile.append(video, labelEl);

        document
            .getElementById("presentationStage")
            .appendChild(tile);
    }

    showStage();

    return tile.querySelector("video");

}

export function removePresentationStage(id) {

    const stageId = `stage-${id}`;

    document.getElementById(`${stageId}Tile`)?.remove();

    if (!document.querySelector("#presentationStage .stage-tile")) {
        hideStage();
    }

}

export function showStage() {

    document.getElementById("presentationStage")?.classList.remove("is-hidden");

}

export function hideStage() {

    document.getElementById("presentationStage")?.classList.add("is-hidden");

}