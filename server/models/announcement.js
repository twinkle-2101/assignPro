import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
    classroom:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom' ,
        required: true
    },
    faculty:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;