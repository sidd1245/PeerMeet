export function createChatPanel() {

    const element = document.createElement("section");
    element.className = "panel-view is-active";
    element.dataset.panelView = "chat";
    element.setAttribute("role", "tabpanel");
    element.innerHTML = `
        <div class="panel-heading">
            <h3>Meeting chat</h3>
        </div>
        <div
                id="chatMessages"
                class="chat-messages"
                aria-live="polite"
        ></div>
        <div class="chat-composer">
            <input
                    id="message"
                    class="text-input"
                    placeholder="Message everyone..."
                    autocomplete="off"
            >
            <button
                    id="sendBtn"
                    class="btn btn-primary"
            >
                Send
            </button>
        </div>
    `;

    const refs = {
        messages: element.querySelector("#chatMessages"),
        input: element.querySelector("#message"),
        sendButton: element.querySelector("#sendBtn")
    };

    function showEmpty() {
        refs.messages.innerHTML = `<div class="chat-empty">Messages will appear here.</div>`;
    }

    return {
        element,
        showEmpty,
        getText: () => refs.input.value.trim(),
        clear: () => {
            refs.input.value = "";
        },
        addMessage: ({sender, text, isYou = false}) => {
            refs.messages.querySelector(".chat-empty")?.remove();

            const message = document.createElement("div");
            message.className = `chat-message${isYou ? " is-you" : ""}`;

            const label = document.createElement("span");
            label.className = "chat-sender";
            label.textContent = sender;

            const body = document.createElement("div");
            body.className = "chat-text";
            body.textContent = text;

            message.append(label, body);
            refs.messages.appendChild(message);
            refs.messages.scrollTop = refs.messages.scrollHeight;
        },
        onSend: handler => {
            refs.sendButton.addEventListener("click", handler);
            refs.input.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    handler();
                }
            });
        }
    };

}
