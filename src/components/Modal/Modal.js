export function createModal({title = "", body = "", confirmLabel = "OK"} = {}) {

    const element = document.createElement("dialog");
    element.className = "modal";
    element.innerHTML = `
        <form method="dialog" class="modal-card">
            <header class="modal-header">
                <h2>${title}</h2>
            </header>
            <div class="modal-body">${body}</div>
            <footer class="modal-actions">
                <button class="btn btn-primary" value="confirm">${confirmLabel}</button>
            </footer>
        </form>
    `;

    return {
        element,
        open: () => element.showModal(),
        close: () => element.close()
    };

}
