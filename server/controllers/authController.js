import {registerUser, loginUser} from "../services/authService.js";

export async function register(req, res) {

    try {

        const user = await registerUser(req.body);

        return res.status(201).json({
            success: true, message: "User created successfully", user: {
                id: user.id, name: user.name, email: user.email
            }
        });

    } catch (error) {

        return res.status(400).json({
            success: false, message: error.message
        });

    }

}

export async function login(req, res) {

    try {

        const {email, password} = req.body;

        const {user, token} = await loginUser(email, password);

        return res.json({
            success: true, message: "Login successful", token, user: {
                id: user.id, name: user.name, email: user.email
            }
        });

    } catch (error) {

        return res.status(401).json({
            success: false, message: error.message
        });

    }

}

export async function getCurrentUser(req, res) {

    return res.json({
        success: true, user: req.user
    });

}