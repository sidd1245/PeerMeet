export function createActivityPanel() {

    const element = document.createElement("section");
    element.className = "panel-view";
    element.dataset.panelView = "activity";
    element.setAttribute("role", "tabpanel");
    element.innerHTML = `
        <div class="panel-heading">
            <h3>Activity</h3>
        </div>
        <div
                id="activity"
                class="activity-feed"
                aria-live="polite"
        ></div>
        <details class="debug-log">
            <summary>Connection log</summary>
            <div id="messages"></div>
        </details>
    `;

    const refs = {
        activity: element.querySelector("#activity"),
        log: element.querySelector("#messages")
    };

    function showEmpty() {
        refs.activity.innerHTML = `<div class="empty-state">Meeting events will appear here.</div>`;
    }

    return {
        element,
        showEmpty,
        render: notifications => {
            refs.activity.innerHTML = "";

            if (!notifications.length) {
                showEmpty();
                return;
            }

            notifications
                .slice()
                .reverse()
                .forEach(notification => {
                    refs.activity.appendChild(createActivityItem(notification));
                });
        },
        log: message => {
            const item = document.createElement("div");
            item.textContent = message;
            refs.log.appendChild(item);
            refs.log.scrollTop = refs.log.scrollHeight;
        }
    };

}

function createActivityItem(notification) {

    const item = document.createElement("div");
    item.className = "activity-item";

    const message = document.createElement("p");
    message.textContent = notification.message;

    const time = document.createElement("time");
    time.textContent = new Date(notification.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    item.append(message, time);
    return item;

}
