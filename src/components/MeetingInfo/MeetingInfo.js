export function createMeetingInfo() {

    const element = document.createElement("div");
    element.className = "meeting-link-card";
    element.innerHTML = `
        <div class="meeting-link-content">
            <span class="section-label">Invite link</span>
            <strong id="meetingLinkText">No meeting created yet</strong>
        </div>
        <button
                id="copyMeetingLinkBtn"
                class="icon-btn"
                title="Copy meeting link"
                aria-label="Copy meeting link"
        >
            Copy
        </button>
    `;

    const refs = {
        text: element.querySelector("#meetingLinkText"),
        copyButton: element.querySelector("#copyMeetingLinkBtn")
    };

    return {
        element,
        setLink: link => {
            refs.text.textContent = link || "No meeting created yet";
        },
        markCopied: () => {
            refs.copyButton.textContent = "Copied";

            setTimeout(() => {
                refs.copyButton.textContent = "Copy";
            }, 1400);
        },
        onCopy: handler => refs.copyButton.addEventListener("click", handler)
    };

}
