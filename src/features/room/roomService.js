export function createRoom() {

    return crypto
        .randomUUID()
        .slice(0, 8);

}