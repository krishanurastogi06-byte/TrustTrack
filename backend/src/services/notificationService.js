const User = require("../models/User");
const Notification = require("../models/Notification");
const socket = require("../lib/socket");

/**
 * Creates a notification for a specific user
 * @param {Object} options
 * @param {ObjectId|String} options.user - The recipient User ID
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} [options.type='info'] - 'info', 'success', 'warning', 'error'
 * @param {String} [options.link=null] - Optional URL to redirect upon click
 */
exports.createNotification = async ({ user, title, message, type = "info", link = null }) => {
    try {
        if (!user) return null;

        const notification = await Notification.create({
            user,
            title,
            message,
            type,
            link
        });

        // Emit real-time notification
        socket.emitToUser(user, "new_notification", notification);

        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
};

/**
 * Creates a notification for all Admin users
 * @param {Object} options
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} [options.type='info'] - 'info', 'success', 'warning', 'error'
 * @param {String} [options.link=null] - Optional URL to redirect upon click
 */
exports.notifyAdmins = async ({ title, message, type = "info", link = null }) => {
    try {
        const admins = await User.find({ role: "admin" }).select("_id");

        // Use insertMany for bulk operation
        const notifications = admins.map(admin => ({
            user: admin._id,
            title,
            message,
            type,
            link
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);

            // Emit real-time notification to all admins
            socket.emitToRole("admin", "new_notification", {
                title,
                message,
                type,
                link
            });
        }

    } catch (error) {
        console.error("Error notifying admins:", error);
    }
};
