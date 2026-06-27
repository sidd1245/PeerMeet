import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createMeeting({
                                        roomId,
                                        hostId,
                                        title = null
                                    }) {

    return prisma.meeting.create({
        data: {
            roomId,
            hostId,
            title
        }
    });

}

export async function endMeeting(roomId) {

    const meeting = await prisma.meeting.findUnique({
        where: {
            roomId
        }
    });

    if (!meeting || meeting.endedAt) {
        return;
    }

    const endedAt = new Date();

    const durationSeconds = Math.floor(
        (endedAt - meeting.startedAt) / 1000
    );

    return prisma.meeting.update({
        where: {
            roomId
        },
        data: {
            endedAt,
            durationSeconds
        }
    });

}

export async function updateParticipantCount(
    roomId,
    participantCount
) {

    return prisma.meeting.update({
        where: {
            roomId
        },
        data: {
            participantCount
        }
    });

}

export async function getMeetingHistory(hostId) {

    return prisma.meeting.findMany({
        where: {
            hostId
        },
        orderBy: {
            startedAt: "desc"
        }
    });

}