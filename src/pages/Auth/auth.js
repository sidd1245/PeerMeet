import template from "./auth.html?raw";

export function createAuthPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const refs = {
        name: element.querySelector("#authNameInput"),
        email: element.querySelector("#authEmailInput"),
        signIn: element.querySelector("#signInBtn"),
        guest: element.querySelector("#guestBtn")
    };

    return {
        element,
        show: () => element.classList.remove("is-hidden"),
        hide: () => element.classList.add("is-hidden"),
        getProfile: () => ({
            name: refs.name.value.trim(),
            email: refs.email.value.trim(),
            authType: "signed-in"
        }),
        getGuestProfile: () => ({
            name: refs.name.value.trim() || "Guest",
            email: "",
            authType: "guest"
        }),
        setName: name => {
            refs.name.value = name || "";
        },
        setEmail: email => {
            refs.email.value = email || "";
        },
        focusName: () => refs.name.focus(),
        onSignIn: handler => refs.signIn.addEventListener("click", handler),
        onGuest: handler => refs.guest.addEventListener("click", handler)
    };

}
