import {
    setMediaStatus
}
    from "./mediaStatusState.js";

export function updateMediaStatus(
    userId,
    audioEnabled,
    videoEnabled
) {

    setMediaStatus(
        userId,
        {
            audioEnabled,
            videoEnabled
        }
    );

}