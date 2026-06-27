import template from "./auth.html?raw";

export function createAuthPage() {

    const host = document.createElement("div");
    host.innerHTML = template.trim();

    const element = host.firstElementChild;
    const refs = {
        name: element.querySelector("#authNameInput"),
        email: element.querySelector("#authEmailInput"),
        signIn: element.querySelector("#signInBtn"),
        password: element.querySelector("#authPasswordInput"),
        register: element.querySelector("#registerBtn"),
    };

    return {
        element,
        show: () => element.classList.remove("is-hidden"),
        hide: () => element.classList.add("is-hidden"),
        getProfile: () => ({
            name: refs.name.value.trim(), email: refs.email.value.trim(), password: refs.password.value
        }),
        setName: name => {
            refs.name.value = name || "";
        },
        setEmail: email => {
            refs.email.value = email || "";
        },
        clear: () => {
            refs.name.value = "";
            refs.email.value = "";
            refs.password.value = "";
        },
        focusName: () => refs.name.focus(),
        onSignIn: handler => refs.signIn.addEventListener("click", handler),
        onRegister: handler => refs.register.addEventListener("click", handler)
    };

}
