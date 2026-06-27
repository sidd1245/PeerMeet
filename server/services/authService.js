import bcrypt from "bcrypt";
import {prisma} from "../db/prisma.js";
import {generateToken} from "../utils/jwt.js";

export async function registerUser(data) {

    const {name, email, password} = data;

    if (!name || !email || !password) {
        throw new Error("All fields are required");
    }

    const existingUser = await prisma.user.findUnique({
        where: {
            email
        }
    });

    if (existingUser) {
        throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name, email, passwordHash
        }
    });

    return user;

}

export async function loginUser(email, password) {
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    if (!user) {
        throw new Error("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
        throw new Error("Invalid email or password");
    }

    const token = generateToken(user);

    return {
        user, token
    };
}