import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SENDER_NAME = "AssignPro";

// Helper to check if email credentials are configured
const isEmailConfigured = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;
    return !!(user && pass && user !== 'your_email' && pass !== 'your_email_password' && pass !== 'your_password');
};

// Create transporter only if configured, otherwise create a mock/fallback transporter
let transporter = null;

const getTransporter = () => {
    if (!transporter && isEmailConfigured()) {
        try {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD
                }
            });
        } catch (err) {
            console.error('[EmailService] Failed to create nodemailer transporter:', err);
            transporter = null;
        }
    }
    return transporter;
};

// Helper for safe mail sending with friendly logs
const safeSendMail = async (mailOptions) => {
    const sender = process.env.EMAIL_USER ? `"${SENDER_NAME}" <${process.env.EMAIL_USER}>` : `"${SENDER_NAME}" <noreply@assignpro.ai>`;
    mailOptions.from = mailOptions.from || sender;

    const emailClient = getTransporter();

    if (!emailClient) {
        console.warn(`[EmailService] SMTP not fully configured or invalid credentials. Simulated email to: ${mailOptions.to} (Subject: "${mailOptions.subject}")`);
        return { success: true, simulated: true };
    }

    try {
        const info = await emailClient.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully to ${mailOptions.to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EmailService] Error sending email to ${mailOptions.to}:`, error.message);
        return { success: false, error: error.message };
    }
};

// Helper: Common responsive email template wrapper
const emailLayout = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 30px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Assign<span style="color: #a5b4fc;">Pro</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">AI-Assisted Educational Decision Support</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; color: #1f2937; line-height: 1.6; font-size: 15px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 32px; text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">This is an automated notification from <strong>AssignPro</strong>.</p>
              <p style="margin: 0;">Designed to empower educators and students with transparent, AI-assisted feedback.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 1. Send Invite Email
const sendInviteEmail = async (recipientEmail, roomCode, facultyName, className) => {
    if (!recipientEmail || typeof recipientEmail !== 'string') return false;

    const bodyHtml = `
        <h2 style="color: #111827; margin: 0 0 14px 0; font-size: 20px; font-weight: 600;">You've been invited to join a classroom!</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
            Professor <strong>${facultyName || 'Your Instructor'}</strong> has invited you to enroll in their class <strong>${className}</strong>.
        </p>
        <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="margin: 0 0 6px 0; color: #4338ca; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Classroom Code</p>
            <div style="font-size: 32px; font-weight: 700; color: #3730a3; letter-spacing: 4px; font-family: monospace;">${roomCode}</div>
        </div>
        <p style="margin: 0 0 8px 0; color: #4b5563;">To join:</p>
        <ol style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 6px;">Sign in to your AssignPro Student Dashboard.</li>
            <li style="margin-bottom: 6px;">Click on <strong>Join Classroom</strong>.</li>
            <li>Enter the 6-character room code above.</li>
        </ol>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Happy learning,<br>The AssignPro Team</p>
    `;

    const mailOptions = {
        to: recipientEmail,
        subject: `Invitation to join ${className} - AssignPro`,
        html: emailLayout(`Classroom Invitation - ${className}`, bodyHtml)
    };

    const res = await safeSendMail(mailOptions);
    return res.success;
};

// 2. New Assignment Notification
const notifyNewAssignment = async (studentEmail, studentName, assignmentTitle, dueDate, className) => {
    if (!studentEmail || typeof studentEmail !== 'string') return false;

    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : 'Check dashboard';

    const bodyHtml = `
        <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">New Assignment Posted</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #4b5563;">A new assignment has been posted in <strong>${className}</strong>:</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">${assignmentTitle}</h3>
            <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 500;">
                &#9200; Due Date: <strong>${formattedDueDate}</strong>
            </p>
        </div>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
            Please log in to your student dashboard to review the prompt and submit your solution before the deadline.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>Your Faculty & AssignPro</p>
    `;

    const mailOptions = {
        to: studentEmail,
        subject: `New Assignment: ${assignmentTitle} (${className})`,
        html: emailLayout(`New Assignment - ${assignmentTitle}`, bodyHtml)
    };

    const res = await safeSendMail(mailOptions);
    return res.success;
};

// 3. Assignment Update Notification
const notifyAssignmentUpdated = async (studentEmail, studentName, assignmentTitle, dueDate, className) => {
    if (!studentEmail || typeof studentEmail !== 'string') return false;

    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : 'Updated';

    const bodyHtml = `
        <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">Assignment Updated</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #4b5563;">The assignment <strong>${assignmentTitle}</strong> in <strong>${className}</strong> has been updated by your instructor.</p>
        
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px; font-weight: 600;">${assignmentTitle}</h3>
            <p style="margin: 0; color: #b45309; font-size: 14px;">
                &#9200; Updated Deadline: <strong>${formattedDueDate}</strong>
            </p>
        </div>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
            Please visit your dashboard to view the latest instructions.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>Your Faculty & AssignPro</p>
    `;

    const mailOptions = {
        to: studentEmail,
        subject: `Assignment Updated: ${assignmentTitle} (${className})`,
        html: emailLayout(`Assignment Update - ${assignmentTitle}`, bodyHtml)
    };

    const res = await safeSendMail(mailOptions);
    return res.success;
};

// 4. Submission Confirmation (Sends to student and alerts faculty)
const sendSubmissionConfirmation = async (
    studentEmail, 
    studentName, 
    facultyEmail,
    assignmentTitle, 
    className
) => {
    const submissionTime = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const tasks = [];

    // Send confirmation to student
    if (studentEmail && typeof studentEmail === 'string') {
        const studentHtml = `
            <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">Submission Received!</h2>
            <p style="margin: 0 0 16px 0; color: #4b5563;">Hello <strong>${studentName || 'Student'}</strong>,</p>
            <p style="margin: 0 0 20px 0; color: #4b5563;">Your submission for <strong>${assignmentTitle}</strong> in <strong>${className}</strong> was successfully received.</p>
            
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 17px; font-weight: 600;">&#10003; Confirmation Summary</h3>
                <p style="margin: 0 0 4px 0; color: #047857; font-size: 14px;"><strong>Assignment:</strong> ${assignmentTitle}</p>
                <p style="margin: 0 0 4px 0; color: #047857; font-size: 14px;"><strong>Classroom:</strong> ${className}</p>
                <p style="margin: 0; color: #047857; font-size: 14px;"><strong>Submitted at:</strong> ${submissionTime}</p>
            </div>
            
            <p style="margin: 0 0 16px 0; color: #4b5563;">
                You will be notified once your faculty evaluates and releases your grade and feedback.
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>The AssignPro Team</p>
        `;

        tasks.push(safeSendMail({
            to: studentEmail,
            subject: `Submission Confirmed: ${assignmentTitle} - AssignPro`,
            html: emailLayout(`Submission Confirmation - ${assignmentTitle}`, studentHtml)
        }));
    }

    // Send notification to faculty if email exists
    if (facultyEmail && typeof facultyEmail === 'string') {
        const facultyHtml = `
            <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">New Student Submission</h2>
            <p style="margin: 0 0 16px 0; color: #4b5563;">Hello,</p>
            <p style="margin: 0 0 20px 0; color: #4b5563;">A student has submitted their solution for <strong>${assignmentTitle}</strong>:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; color: #334155; font-size: 14px;"><strong>Student:</strong> ${studentName || 'Student'} (${studentEmail || 'N/A'})</p>
                <p style="margin: 0 0 6px 0; color: #334155; font-size: 14px;"><strong>Classroom:</strong> ${className}</p>
                <p style="margin: 0; color: #334155; font-size: 14px;"><strong>Submitted On:</strong> ${submissionTime}</p>
            </div>
            
            <p style="margin: 0 0 16px 0; color: #4b5563;">
                You can review, trigger AI auto-grading, and post feedback from your Faculty Dashboard.
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>AssignPro</p>
        `;

        tasks.push(safeSendMail({
            to: facultyEmail,
            subject: `New Submission: ${studentName || 'Student'} for ${assignmentTitle}`,
            html: emailLayout(`New Submission Alert - ${assignmentTitle}`, facultyHtml)
        }));
    }

    const results = await Promise.allSettled(tasks);
    const anySuccess = results.some(r => r.status === 'fulfilled' && r.value.success);
    return anySuccess || results.length === 0;
};

// 5. Grade Posted Notification
const notifyGradePosted = async (studentEmail, studentName, assignmentTitle, grade, maxMarks, feedback, className) => {
    if (!studentEmail || typeof studentEmail !== 'string') return false;

    const percentage = maxMarks > 0 ? Math.round((Number(grade) / Number(maxMarks)) * 100) : 0;
    const gradeColor = percentage >= 80 ? '#059669' : percentage >= 60 ? '#d97706' : '#dc2626';

    const bodyHtml = `
        <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">Your Grade is Ready</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #4b5563;">Your submission for <strong>${assignmentTitle}</strong> in <strong>${className}</strong> has been evaluated and graded by your instructor.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600;">Score Awarded</p>
            <div style="font-size: 36px; font-weight: 800; color: ${gradeColor}; margin: 8px 0;">
                ${grade} <span style="font-size: 20px; color: #94a3b8; font-weight: 500;">/ ${maxMarks} (${percentage}%)</span>
            </div>
            ${feedback ? `
                <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: left;">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155; font-size: 14px;">Instructor Feedback:</p>
                    <p style="margin: 0; color: #475569; font-size: 14px; background: #ffffff; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.5;">${feedback}</p>
                </div>
            ` : ''}
        </div>
        
        <p style="margin: 0 0 16px 0; color: #4b5563;">
            Check your Student Progress Tracker on AssignPro to view detailed insights and performance across all assignments.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>Your Faculty & AssignPro</p>
    `;

    const mailOptions = {
        to: studentEmail,
        subject: `Grade Released: ${assignmentTitle} - ${grade}/${maxMarks} (${percentage}%)`,
        html: emailLayout(`Grade Notification - ${assignmentTitle}`, bodyHtml)
    };

    const res = await safeSendMail(mailOptions);
    return res.success;
};

// 6. Submission Reminder
const sendSubmissionReminder = async (studentEmail, studentName, assignmentTitle, dueDate, className) => {
    if (!studentEmail || typeof studentEmail !== 'string') return false;

    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : 'Approaching soon';

    const bodyHtml = `
        <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">Reminder: Upcoming Assignment Deadline</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p style="margin: 0 0 20px 0; color: #4b5563;">This is a friendly reminder that the following assignment is due soon in <strong>${className}</strong>:</p>
        
        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #9f1239; font-size: 18px; font-weight: 600;">${assignmentTitle}</h3>
            <p style="margin: 0; color: #be123c; font-size: 14px; font-weight: 600;">
                &#9200; Deadline: ${formattedDueDate}
            </p>
        </div>
        
        <p style="margin: 0 0 16px 0; color: #4b5563;">
            Please ensure you upload and finalize your submission before the deadline to avoid late submission penalties.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Best regards,<br>The AssignPro Team</p>
    `;

    const mailOptions = {
        to: studentEmail,
        subject: `Reminder: ${assignmentTitle} is due soon! (${className})`,
        html: emailLayout(`Deadline Reminder - ${assignmentTitle}`, bodyHtml)
    };

    const res = await safeSendMail(mailOptions);
    return res.success;
};

export {
    sendInviteEmail,
    notifyNewAssignment,
    notifyAssignmentUpdated,
    sendSubmissionConfirmation,
    notifyGradePosted,
    sendSubmissionReminder,
    isEmailConfigured
};