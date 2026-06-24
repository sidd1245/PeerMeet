import {
    onActiveSpeakerChanged
} from "./activeSpeakerState.js";

let previousSpeakerId = null;

onActiveSpeakerChanged(
    activeSpeakerId => {

        if (previousSpeakerId) {

            document
                .getElementById(
                    `video-${previousSpeakerId}Tile`
                )
                ?.classList.remove(
                "speaking"
            );

        }

        if (activeSpeakerId) {

            document
                .getElementById(
                    `video-${activeSpeakerId}Tile`
                )
                ?.classList.add(
                "speaking"
            );

        }

        previousSpeakerId =
            activeSpeakerId;

    }
);