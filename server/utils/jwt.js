import jwt from "jsonwebtoken";

export function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}