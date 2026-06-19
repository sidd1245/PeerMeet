export function createNotificationCenter() {

    const element = document.createElement("div");
    element.className = "notification-center";
    element.setAttribute("aria-live", "polite");

    function notify(message) {
        const item = document.createElement("div");
        item.className = "toast-notification";
        item.textContent = message;
        element.appendChild(item);

        setTimeout(() => {
            item.classList.add("is-leaving");
            setTimeout(() => item.remove(), 180);
        }, 3600);
    }

    return {
        element,
        notify
    };

}
