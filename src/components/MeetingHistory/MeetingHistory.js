export function createMeetingHistory() {

    const element = document.createElement("div");

    element.className = "meeting-history";

    return {

        element,

        render(meetings) {

            if (!meetings.length) {

                element.innerHTML = `
                    <p>No meetings yet.</p>
                `;

                return;

            }

            element.innerHTML = meetings.map(meeting => `

                <div class="meeting-card">

                    <h3>${meeting.roomId}</h3>

                    <p>
                        Duration:
                        ${meeting.durationSeconds ?? 0}s
                    </p>

                    <p>
                        Participants:
                        ${meeting.participantCount}
                    </p>

                    <p>
                        ${new Date(meeting.startedAt)
                .toLocaleString()}
                    </p>
                    <hr>
                </div>

            `).join("");

        }

    };

}