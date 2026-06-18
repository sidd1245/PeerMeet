export function renderLocalVideo(stream) {

    let video = document.getElementById("localVideo");

    if (!video) {

        video = document.createElement("video");

        video.id = "localVideo";

        video.autoplay = true;

        video.playsInline = true;

        video.muted = true;

        video.style.width = "300px";

        document
            .getElementById("videoGrid")
            .appendChild(video);

    }

    video.srcObject = stream;

    video.play()
        .catch(console.error);

}

export function renderRemoteVideo(peerId, stream) {

    let video = document.getElementById(`video-${peerId}`);

    if (!video) {

        video = document.createElement("video");

        video.id = `video-${peerId}`;

        video.autoplay = true;

        video.playsInline = true;

        video.style.width = "320px";
        video.style.height = "240px";
        video.style.objectFit = "cover";
        video.style.border = "1px solid black";
        video.style.margin = "5px";

        document
            .getElementById("videoGrid")
            .appendChild(video);

    }

    video.srcObject = stream;
    video.volume = 1;
    video.muted = false;

}

export function removeRemoteVideo(
    peerId
) {

    const video =
        document.getElementById(
            `video-${peerId}`
        );

    if (
        video
    ) {

        video.remove();

    }

}