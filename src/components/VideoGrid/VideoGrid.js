export function getOrCreateVideoTile({
    id,
    label,
    isLocal = false
}) {

    let tile = document.getElementById(`${id}Tile`);

    if (!tile) {
        tile = document.createElement("div");
        tile.id = `${id}Tile`;
        tile.className = "video-tile";

        const video = document.createElement("video");
        video.id = id;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal;

        const labelEl = document.createElement("span");
        labelEl.className = "video-label";
        labelEl.textContent = label;

        tile.append(video, labelEl);

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
