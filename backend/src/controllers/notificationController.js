const Notification = require("../models/Notification");

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.sub;
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        if (notification.user.toString() !== req.user.sub.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to access this notification" });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.sub, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete single notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        if (notification.user.toString() !== req.user.sub.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to access this notification" });
        }

        await Notification.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Clear all notifications for user
// @route   DELETE /api/notifications
// @access  Private
exports.clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user.sub });

        res.status(200).json({ success: true, message: "All notifications cleared" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
