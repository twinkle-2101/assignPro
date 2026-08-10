import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissionUrl: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    grade: {
        type: Number
    },
    feedback: {
        type: String
    },
    isAutoGraded: {
        type: Boolean,
        default: false
    }  
});

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    maxMarks: {
        type: Number,
        required: true
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissions: [submissionSchema],

    assignmentFile: {
        type: String
    },
    idealAnswers: {
        type: Object,
        required: true
    }
}, {timestamps: true});

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;