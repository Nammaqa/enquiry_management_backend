module.exports = (roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role; // ✅ SAFE ACCESS

    // 🔥 HANDLE MISSING ROLE
    if (!userRole) {
      return res.status(401).json({
        message: "User role missing in token",
      });
    }

    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // ✅ SAFE COMPARISON
    const hasAccess = allowedRoles.some(
      role => role.toUpperCase() === userRole.toUpperCase()
    );

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};