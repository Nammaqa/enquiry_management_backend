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

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body;
        const userrole = req.user.role;
        
        if (userrole !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (phone_number !== undefined && phone_number !== user.phone_number) {
            // Check if phone number already exists for another user
            const existingUser = await User.findOne({ where: { phone_number } });
            if (existingUser && existingUser.id.toString() !== id.toString()) {
                return res.status(400).json({ success: false, message: 'Phone number already exists' });
            }
            user.phone_number = phone_number || null;
        }
        
        await user.save();
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET current authenticated user profile
exports.getMe = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'phone_number', 'role', 'createdAt', 'updatedAt']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userData = user.toJSON();

        // If user is instructor, include instructorProfile details
        if (String(user.role || '').toLowerCase() === 'instructor') {
            const { Instructor } = require('../models');
            const instructorProfile = await Instructor.findOne({
                where: { userId: user.id }
            });
            if (instructorProfile) {
                userData.instructorProfile = instructorProfile;
                userData.image = instructorProfile.image;
                userData.description = instructorProfile.description;
                userData.bio = instructorProfile.description;
            }
        }

        res.status(200).json({
            success: true,
            data: userData,
            user: userData
        });
    } catch (error) {
        console.error('Error in getMe:', error);
        res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
    }
};

// PUT / PATCH current authenticated user profile
exports.updateMe = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const {
            name,
            email,
            phone_number,
            phoneNumber,
            password,
            image,
            profileImage,
            avatar,
            description,
            bio
        } = req.body;

        const phone = phone_number !== undefined ? phone_number : phoneNumber;
        const profileImg = image !== undefined ? image : (profileImage !== undefined ? profileImage : avatar);
        const profileBio = description !== undefined ? description : bio;

        if (name !== undefined) user.name = name;
        if (email !== undefined) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail && existingEmail.id.toString() !== user.id.toString()) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
            user.email = email;
        }
        if (phone !== undefined) {
            if (phone) {
                const existingPhone = await User.findOne({ where: { phone_number: phone } });
                if (existingPhone && existingPhone.id.toString() !== user.id.toString()) {
                    return res.status(400).json({ success: false, message: 'Phone number already exists' });
                }
            }
            user.phone_number = phone || null;
        }
        if (password) {
            user.password = await hashPassword(password);
        }

        await user.save();

        // If instructor, also update instructor profile
        const { Instructor } = require('../models');
        let instructor = await Instructor.findOne({ where: { userId: user.id } });

        if (!instructor && (String(user.role || '').toLowerCase() === 'instructor' || profileImg !== undefined || profileBio !== undefined)) {
            instructor = await Instructor.create({
                userId: user.id,
                name: user.name,
                image: profileImg || null,
                description: profileBio || null
            });
        } else if (instructor) {
            if (name !== undefined) instructor.name = name;
            if (profileImg !== undefined) instructor.image = profileImg;
            if (profileBio !== undefined) instructor.description = profileBio;
            await instructor.save();
        }

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
            image: instructor?.image || null,
            description: instructor?.description || null,
            bio: instructor?.description || null,
            instructorProfile: instructor || null,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: userData,
            user: userData
        });
    } catch (error) {
        console.error('Error in updateMe:', error);
        res.status(500).json({ message: 'Failed to update user profile', error: error.message });
    }
};