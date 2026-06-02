const express = require("express");
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = require("../controllers/notificationController");
const protect = require("../middleware/auth");

router.use(protect);

router.get("/", getNotifications);
router.delete("/", clearAllNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
