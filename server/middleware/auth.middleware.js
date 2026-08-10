import jwt from "jsonwebtoken"
import User from "../models/user.js";

const authMiddleware = (requiredRole) => async (req,res,next) => {
    try{
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided or invalid format'});
        }

    const token = authHeader.split(' ')[1];

    if (!token) {
            return res.status(401).json({success: false,  message: 'No token provided' });
     }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

       // Verify user still exists and has required role
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if role matches if a specific role is required
        if (requiredRole && user.role !== requiredRole) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        req.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
  } 
  catch(error){
       console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
  }
};

export default authMiddleware;