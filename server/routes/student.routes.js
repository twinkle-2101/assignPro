import express from "express"
const router = express.Router();
import Classroom from "../models/classroom.js"
import authMiddleware from "../middleware/auth.middleware.js";
import Assignment from "../models/assignment.js"
import {sendSubmissionConfirmation} from "../utils/emailService.js";
import User from "../models/user.js";
import multer from "multer"
import path from "path"
import fs from "fs"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/submissions';
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Get enrolled classrooms
router.get('/classrooms/enrolled', authMiddleware('Student'), async (req, res) => {
    try {
        const studentId = req.user._id;
        
        const enrolledClassrooms = await Classroom.find({
            students: studentId
        }).populate('faculty', 'name email');

        res.json({
            success: true,
            classrooms: enrolledClassrooms
        });
    } catch (error) {
        console.error('Error fetching enrolled classrooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrolled classrooms'
        });
    }
});

// Join classroom
router.post('/classrooms/join', authMiddleware('Student'), async (req, res) => {
    try {
        const { roomCode } = req.body;
        const studentId = req.user._id;

        // Find classroom with the given room code
        const classroom = await Classroom.findOne({ roomCode });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Invalid room code'
            });
        }

        // Check if student is already enrolled
        if (classroom.students.includes(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Already enrolled in this classroom'
            });
        }

        // Add student to classroom
        classroom.students.push(studentId);
        await classroom.save();

        res.json({
            success: true,
            message: 'Successfully joined classroom',
            classroom
        });
    } catch (error) {
        console.error('Error joining classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join classroom'
        });
    }
});

// Get classroom details
router.get('/classrooms/:classroomId', authMiddleware('Student'), async (req, res) => {
    try {
        const { classroomId } = req.params;
        const studentId = req.user._id;

        const classroom = await Classroom.findOne({
            _id: classroomId,
            students: studentId
        }).populate('faculty', 'name email');

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found or access denied'
            });
        }

        res.json({
            success: true,
            classroom
        });
    } catch (error) {
        console.error('Error fetching classroom details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classroom details'
        });
    }
});

// Get assignments for a classroom
router.get('/classrooms/:classroomId/assignments', authMiddleware('Student'), async (req, res) => {
    try {
        const { classroomId } = req.params;
        const studentId = req.user._id;

        // Verify student is enrolled in classroom
        const classroom = await Classroom.findOne({
            _id: classroomId,
            students: studentId
        });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found or not enrolled'
            });
        }

        const assignments = await Assignment.find({ classroom: classroomId })
            .populate('createdBy', 'name');

        // Add submission status for each assignment
        const assignmentsWithStatus = assignments.map(assignment => {
            const submission = assignment.submissions.find(
                sub => sub.student.toString() === studentId.toString()
            );
            return {
                ...assignment.toObject(),
                submitted: !!submission,
                submission: submission || null
            };
        });

        res.json({
            success: true,
            assignments: assignmentsWithStatus
        });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments'
        });
    }
});

// File upload route
router.post('/upload', authMiddleware('Student'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const fileUrl = `/uploads/submissions/${req.file.filename}`;
        
        res.json({
            success: true,
            fileUrl,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload file'
        });
    }
});

// Submit assignment route
router.post('/assignments/:assignmentId/submit', authMiddleware('Student'), upload.single('file'), async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const studentId = req.user._id;

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const assignment = await Assignment.findById(assignmentId)
            .populate('classroom', 'name')
            .populate('createdBy', 'email');

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Check submission deadline
        if (new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({
                success: false,
                message: 'Assignment submission deadline has passed'
            });
        }

        // Create submission URL
        const submissionUrl = `/uploads/submissions/${req.file.filename}`;

        // Update or create submission
        const submissionIndex = assignment.submissions.findIndex(
            sub => sub.student.toString() === studentId.toString()
        );

        if (submissionIndex > -1) {
            assignment.submissions[submissionIndex].submissionUrl = submissionUrl;
            assignment.submissions[submissionIndex].submittedAt = new Date();
        } else {
            assignment.submissions.push({
                student: studentId,
                submissionUrl: submissionUrl,
                submittedAt: new Date()
            });
        }

        await assignment.save();

        // Send submission confirmation emails
        try {
            const facultyEmail = assignment.createdBy?.email;
            const className = assignment.classroom?.name || "Classroom";
            await sendSubmissionConfirmation(
                req.user.email,
                req.user.name || "Student",
                facultyEmail,
                assignment.title,
                className
            );
        } catch (emailError) {
            console.error('Error sending submission confirmation email:', emailError);
        }

        res.json({
            success: true,
            message: 'Assignment submitted successfully'
        });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit assignment'
        });
    }
});

// Add exit classroom route
router.post('/classrooms/:classroomId/exit', authMiddleware('Student'), async (req, res) => {
    try {
        const { classroomId } = req.params;
        const studentId = req.user._id;

        // Find the classroom and remove the student
        const classroom = await Classroom.findByIdAndUpdate(
            classroomId,
            {
                $pull: { students: studentId }
            },
            { new: true }
        );

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        res.json({
            success: true,
            message: 'Successfully exited classroom'
        });
    } catch (error) {
        console.error('Error exiting classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to exit classroom'
        });
    }
});

// Student Overall Progress & Performance Analytics Endpoint
router.get('/progress', authMiddleware('Student'), async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. Get all classrooms student is enrolled in
        const enrolledClassrooms = await Classroom.find({ students: studentId })
            .populate('faculty', 'name email');

        const classroomIds = enrolledClassrooms.map(c => c._id);

        // 2. Fetch all assignments across these classrooms
        const assignments = await Assignment.find({ classroom: { $in: classroomIds } })
            .populate('classroom', 'name subject')
            .populate('createdBy', 'name email')
            .sort({ dueDate: 1 });

        const now = new Date();
        let totalAssignments = assignments.length;
        let submittedCount = 0;
        let gradedCount = 0;
        let totalScoreAchieved = 0;
        let totalMaxScoreGraded = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let pendingCount = 0;
        let overdueCount = 0;

        // Per-classroom analytics map
        const classroomMap = {};
        enrolledClassrooms.forEach(c => {
            classroomMap[c._id.toString()] = {
                classroomId: c._id,
                name: c.name,
                subject: c.subject,
                facultyName: c.faculty?.name || 'Instructor',
                roomCode: c.roomCode,
                totalAssignments: 0,
                submittedCount: 0,
                gradedCount: 0,
                totalScoreAchieved: 0,
                totalMaxScoreGraded: 0,
                assignments: []
            };
        });

        const processedAssignments = assignments.map(assignment => {
            const cId = assignment.classroom?._id ? assignment.classroom._id.toString() : assignment.classroom?.toString();
            const sub = assignment.submissions.find(s => s.student.toString() === studentId.toString());
            
            const isSubmitted = !!sub;
            const isGraded = isSubmitted && sub.grade !== undefined && sub.grade !== null;
            const dueDate = new Date(assignment.dueDate);
            const isPastDue = now > dueDate;
            
            let status = 'pending';
            if (isGraded) {
                status = 'graded';
            } else if (isSubmitted) {
                status = 'submitted';
            } else if (isPastDue) {
                status = 'overdue';
            }

            let isLate = false;
            if (isSubmitted && sub.submittedAt) {
                isLate = new Date(sub.submittedAt) > dueDate;
            }

            if (isSubmitted) {
                submittedCount++;
                if (isLate) {
                    lateCount++;
                } else {
                    onTimeCount++;
                }
            } else {
                if (isPastDue) {
                    overdueCount++;
                } else {
                    pendingCount++;
                }
            }

            let scorePercentage = null;
            if (isGraded) {
                gradedCount++;
                const max = Number(assignment.maxMarks) || 100;
                const score = Number(sub.grade) || 0;
                totalScoreAchieved += score;
                totalMaxScoreGraded += max;
                scorePercentage = Math.round((score / max) * 100);
            }

            const item = {
                _id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                dueDate: assignment.dueDate,
                maxMarks: assignment.maxMarks,
                assignmentFile: assignment.assignmentFile,
                classroomId: cId,
                classroomName: assignment.classroom?.name || 'Classroom',
                subject: assignment.classroom?.subject || '',
                facultyName: assignment.createdBy?.name || 'Instructor',
                status,
                isSubmitted,
                isGraded,
                isLate,
                submittedAt: sub ? sub.submittedAt : null,
                submissionUrl: sub ? sub.submissionUrl : null,
                grade: sub && sub.grade !== undefined ? sub.grade : null,
                feedback: sub ? sub.feedback : null,
                scorePercentage
            };

            // Aggregate into classroom breakdown
            if (classroomMap[cId]) {
                classroomMap[cId].totalAssignments++;
                if (isSubmitted) classroomMap[cId].submittedCount++;
                if (isGraded) {
                    classroomMap[cId].gradedCount++;
                    classroomMap[cId].totalScoreAchieved += (Number(sub.grade) || 0);
                    classroomMap[cId].totalMaxScoreGraded += (Number(assignment.maxMarks) || 100);
                }
                classroomMap[cId].assignments.push(item);
            }

            return item;
        });

        // Calculate aggregated metrics
        const completionRate = totalAssignments > 0 
            ? Math.round((submittedCount / totalAssignments) * 100) 
            : 0;

        const averageScorePercentage = totalMaxScoreGraded > 0 
            ? Math.round((totalScoreAchieved / totalMaxScoreGraded) * 100) 
            : null;

        const onTimeRate = submittedCount > 0 
            ? Math.round((onTimeCount / submittedCount) * 100) 
            : 100;

        // Determine performance rating and grade letter
        let performanceRating = 'Not Graded Yet';
        let gradeLetter = 'N/A';
        if (averageScorePercentage !== null) {
            if (averageScorePercentage >= 90) {
                performanceRating = 'Exceptional';
                gradeLetter = 'A+';
            } else if (averageScorePercentage >= 80) {
                performanceRating = 'Superior';
                gradeLetter = 'A';
            } else if (averageScorePercentage >= 70) {
                performanceRating = 'Proficient';
                gradeLetter = 'B';
            } else if (averageScorePercentage >= 60) {
                performanceRating = 'Satisfactory';
                gradeLetter = 'C';
            } else {
                performanceRating = 'Needs Attention';
                gradeLetter = 'D';
            }
        }

        // Process classroom breakdowns
        const classroomBreakdown = Object.values(classroomMap).map(c => {
            const classCompletion = c.totalAssignments > 0
                ? Math.round((c.submittedCount / c.totalAssignments) * 100)
                : 0;
            const classAvgScore = c.totalMaxScoreGraded > 0
                ? Math.round((c.totalScoreAchieved / c.totalMaxScoreGraded) * 100)
                : null;
            return {
                classroomId: c.classroomId,
                name: c.name,
                subject: c.subject,
                facultyName: c.facultyName,
                roomCode: c.roomCode,
                totalAssignments: c.totalAssignments,
                submittedCount: c.submittedCount,
                gradedCount: c.gradedCount,
                completionRate: classCompletion,
                averageScorePercentage: classAvgScore,
                assignments: c.assignments
            };
        });

        res.json({
            success: true,
            progress: {
                totalClassrooms: enrolledClassrooms.length,
                totalAssignments,
                submittedCount,
                gradedCount,
                pendingCount,
                overdueCount,
                onTimeCount,
                lateCount,
                completionRate,
                averageScorePercentage,
                onTimeRate,
                performanceRating,
                gradeLetter,
                classroomBreakdown,
                assignments: processedAssignments
            }
        });
    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student progress data'
        });
    }
});

export default router;