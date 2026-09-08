const { User } = require('../models');
const { hashPassword } = require('../utils/password');


exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({ where: { role: { [require('sequelize').Op.ne]: 'ADMIN' } } });
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, phone_number, password, role } = req.body;
        const userRole = req.user.role;

        const hashed = await hashPassword(password);

        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email },
                    ...(phone_number ? [{ phone_number }] : []),
                ],
            },
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // If creating an instructor, only ADMIN and COUNSELLOR can do it
        if (role === 'instructor') {
            if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
                return res.status(403).json({ message: 'Access denied. Only Admin and Counsellor can create instructors' });
            }
        }

        const existingadmin = await User.findOne({ where: { role: 'ADMIN' } });

        if (role === 'ADMIN' && existingadmin) {
            return res.status(400).json({ message: 'Admin user already exists' });
        }
        const user = await User.create({
            name,
            email,
            phone_number: phone_number || null,
            password: hashed,
            role,
        });

        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        console.log("Inside change password controller");
        const { id, newPassword } = req.body;
        const userrole = req.user.role;
        if (userrole !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const hashed = await hashPassword(newPassword);
        user.password = hashed;
        await user.save();
        res.status(200).json({ message: 'Password changed successfully' });

    }

    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userrole = req.user.role;
        
        if (userrole !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await user.destroy();
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstructors = async (req, res) => {
    try {
        const instructors = await User.findAll({
            where: { role: 'INSTRUCTOR' },
            attributes: ['id', 'name', 'email', 'role', 'createdAt'],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            message: 'Instructors retrieved successfully',
            total: instructors.length,
            data: instructors,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to fetch instructors' });
    }
};