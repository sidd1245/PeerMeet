export function saveUser(user) {

    localStorage.setItem("user", JSON.stringify(user));

}

export function getUser() {

    return JSON.parse(localStorage.getItem("user"));

}

export function removeUser() {

    localStorage.removeItem("user");

}

export function saveToken(token) {

    localStorage.setItem("token", token);

}

export function getToken() {

    return localStorage.getItem("token");

}

export function removeToken() {

    localStorage.removeItem("token");

}

export function isLoggedIn() {

    return !!getToken();

}