const sendResponse = require("../../utils/sendResponse");

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: "Doctor signed up successfully",
            data: { name, email, password }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: error.message
        });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: "Doctor logged in successfully",
            data: { email, password }
        });
    } catch (error) {
        sendResponse({
            res,
            statusCode: 500,
            success: false,
            message: error.message
        });
    }
}