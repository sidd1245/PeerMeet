import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";

export async function register(req, res) {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    const existingUser = await prisma.user.findUnique({
        where: {
            email: email
        }
    });
    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email already registered"
        });
    }

    await prisma.user.create({
        data: {
            name,
            email,
            passwordHash: hashedPassword
        }
    });

    return res.status(201).json({
        success: true,
        message: "User created"
    });

}