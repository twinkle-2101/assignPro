import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getApiUrl, getBaseUrl } from '../../config/api.config.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import './StudentProgressTracker.css';

const StudentProgressTracker = ({ onOpenSubmission, onSelectClassroom }) => {
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFeedbackModal, setSelectedFeedbackModal] = useState(null);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            const sessionId = sessionStorage.getItem('sessionId');
            const token = sessionStorage.getItem(`token_${sessionId}`);

            const response = await axios.get(getApiUrl('/student/progress'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'X-Session-ID': sessionId
                }
            });

            if (response.data.success) {
                setProgressData(response.data.progress);
            }
        } catch (err) {
            console.error('Error fetching student progress:', err);
            setError(err.response?.data?.message || 'Failed to load progress analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgress();
    }, []);

    // Color helpers
    const getGradeColor = (percentage) => {
        if (percentage === null || percentage === undefined) return '#94a3b8';
        if (percentage >= 90) return '#10b981'; // Emerald
        if (percentage >= 80) return '#6366f1'; // Indigo
        if (percentage >= 70) return '#0ea5e9'; // Sky
        if (percentage >= 60) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const getStatusBadge = (status, isLate) => {
        switch (status) {
            case 'graded':
                return <span className="spt-badge spt-badge-graded"><i className="fas fa-check-circle me-1"></i> Graded</span>;
            case 'submitted':
                return (
                    <span className="spt-badge spt-badge-submitted">
                        <i className="fas fa-hourglass-half me-1"></i> Awaiting Grade {isLate && <span className="spt-late-tag">Late</span>}
                    </span>
                );
            case 'overdue':
                return <span className="spt-badge spt-badge-overdue"><i className="fas fa-exclamation-triangle me-1"></i> Past Due</span>;
            default:
                return <span className="spt-badge spt-badge-pending"><i className="fas fa-clock me-1"></i> Pending</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTimeLeft = (dueDateString) => {
        const now = new Date();
        const due = new Date(dueDateString);
        const diff = due - now;

        if (diff < 0) return 'Past due';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 1) return `${days} days left`;
        if (days === 1) return 'Tomorrow';
        if (hours > 0) return `${hours} hrs left`;
        return 'Due today';
    };

    // Filter assignments
    const filteredAssignments = useMemo(() => {
        if (!progressData?.assignments) return [];

        return progressData.assignments.filter(item => {
            // Status tab filter
            if (activeFilter === 'graded' && item.status !== 'graded') return false;
            if (activeFilter === 'submitted' && item.status !== 'submitted') return false;
            if (activeFilter === 'pending' && item.status !== 'pending') return false;
            if (activeFilter === 'overdue' && item.status !== 'overdue') return false;

            // Subject / Classroom filter
            if (selectedSubjectFilter !== 'all' && item.classroomId !== selectedSubjectFilter) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title?.toLowerCase().includes(q);
                const matchClass = item.classroomName?.toLowerCase().includes(q);
                const matchSubject = item.subject?.toLowerCase().includes(q);
                if (!matchTitle && !matchClass && !matchSubject) return false;
            }

            return true;
        });
    }, [progressData, activeFilter, selectedSubjectFilter, searchQuery]);

    if (loading) {
        return (
            <div className="spt-loading-container">
                <LoadingSpinner />
                <p className="mt-3 text-muted">Calculating your academic progress...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger p-4 rounded-3 shadow-sm my-4">
                <div className="d-flex align-items-center">
                    <i className="fas fa-exclamation-circle fa-2x me-3 text-danger"></i>
                    <div>
                        <h5 className="mb-1">Unable to load Progress Tracker</h5>
                        <p className="mb-0 text-muted">{error}</p>
                    </div>
                </div>
                <button onClick={fetchProgress} className="btn btn-outline-danger btn-sm mt-3">
                    <i className="fas fa-redo me-1"></i> Try Again
                </button>
            </div>
        );
    }

    const {
        totalClassrooms = 0,
        totalAssignments = 0,
        submittedCount = 0,
        gradedCount = 0,
        pendingCount = 0,
        overdueCount = 0,
        completionRate = 0,
        averageScorePercentage = null,
        onTimeRate = 100,
        performanceRating = 'N/A',
        gradeLetter = 'N/A',
        classroomBreakdown = []
    } = progressData || {};

    return (
        <div className="student-progress-tracker-root">
            {/* Header Hero Banner */}
            <div className="spt-hero-card">
                <div className="spt-hero-overlay"></div>
                <div className="spt-hero-content">
                    <div className="spt-hero-text">
                        <div className="spt-badge-pill">
                            <i className="fas fa-chart-pie me-1"></i> Performance Overview
                        </div>
                        <h2 className="spt-hero-title">Academic Progress & Mastery</h2>
                        <p className="spt-hero-subtitle">
                            Track submission milestones, view detailed teacher evaluations, and maintain consistency across your courses.
                        </p>
                    </div>
                    <div className="spt-hero-badge-box">
                        <div className="spt-standing-tag">Overall Standing</div>
                        <div className="spt-standing-grade" style={{ color: getGradeColor(averageScorePercentage) }}>
                            {gradeLetter !== 'N/A' ? gradeLetter : '--'}
                        </div>
                        <div className="spt-standing-desc">
                            {performanceRating} {averageScorePercentage !== null ? `(${averageScorePercentage}%)` : ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top KPI Cards Grid */}
            <div className="spt-metrics-grid">
                {/* Metric 1: Average Score */}
                <div className="spt-metric-card">
                    <div className="spt-metric-header">
                        <span className="spt-metric-label">Cumulative Average</span>
                        <div className="spt-metric-icon bg-indigo-soft">
                            <i className="fas fa-star text-indigo"></i>
                        </div>
                    </div>
                    <div className="spt-metric-val-row">
                        <span className="spt-metric-val" style={{ color: getGradeColor(averageScorePercentage) }}>
                            {averageScorePercentage !== null ? `${averageScorePercentage}%` : '--'}
                        </span>
                        <span className="spt-metric-sub">{gradedCount} graded of {submittedCount} submitted</span>
                    </div>
                    <div className="spt-progress-bar-bg mt-3">
                        <div 
                            className="spt-progress-bar-fill bg-indigo"
                            style={{ width: `${averageScorePercentage || 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* Metric 2: Completion Rate */}
                <div className="spt-metric-card">
                    <div className="spt-metric-header">
                        <span className="spt-metric-label">Completion Rate</span>
                        <div className="spt-metric-icon bg-emerald-soft">
                            <i className="fas fa-check-double text-emerald"></i>
                        </div>
                    </div>
                    <div className="spt-metric-val-row">
                        <span className="spt-metric-val text-emerald">
                            {completionRate}%
                        </span>
                        <span className="spt-metric-sub">{submittedCount} of {totalAssignments} assignments turned in</span>
                    </div>
                    <div className="spt-progress-bar-bg mt-3">
                        <div 
                            className="spt-progress-bar-fill bg-emerald"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                </div>

                {/* Metric 3: On-Time Delivery */}
                <div className="spt-metric-card">
                    <div className="spt-metric-header">
                        <span className="spt-metric-label">Timeliness Rate</span>
                        <div className="spt-metric-icon bg-sky-soft">
                            <i className="fas fa-stopwatch text-sky"></i>
                        </div>
                    </div>
                    <div className="spt-metric-val-row">
                        <span className="spt-metric-val text-sky">
                            {onTimeRate}%
                        </span>
                        <span className="spt-metric-sub">Submitted strictly before deadlines</span>
                    </div>
                    <div className="spt-progress-bar-bg mt-3">
                        <div 
                            className="spt-progress-bar-fill bg-sky"
                            style={{ width: `${onTimeRate}%` }}
                        ></div>
                    </div>
                </div>

                {/* Metric 4: Workload Status */}
                <div className="spt-metric-card">
                    <div className="spt-metric-header">
                        <span className="spt-metric-label">Active Workload</span>
                        <div className="spt-metric-icon bg-amber-soft">
                            <i className="fas fa-tasks text-amber"></i>
                        </div>
                    </div>
                    <div className="spt-workload-stats mt-2">
                        <div className="spt-workload-item">
                            <span className="spt-workload-num text-amber">{pendingCount}</span>
                            <span className="spt-workload-label">Due Soon</span>
                        </div>
                        <div className="spt-workload-divider"></div>
                        <div className="spt-workload-item">
                            <span className="spt-workload-num text-danger">{overdueCount}</span>
                            <span className="spt-workload-label">Overdue</span>
                        </div>
                        <div className="spt-workload-divider"></div>
                        <div className="spt-workload-item">
                            <span className="spt-workload-num text-indigo">{totalClassrooms}</span>
                            <span className="spt-workload-label">Classes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Mastery / Classroom Breakdown Cards */}
            <div className="spt-section-header-row mt-5 mb-3">
                <div className="d-flex align-items-center">
                    <div className="spt-section-icon bg-indigo-soft me-2">
                        <i className="fas fa-book-reader text-indigo"></i>
                    </div>
                    <h4 className="spt-section-title mb-0">Course Progress Breakdown</h4>
                </div>
                <span className="text-muted small">Tracking {classroomBreakdown.length} Enrolled Courses</span>
            </div>

            <div className="spt-courses-grid">
                {classroomBreakdown.length > 0 ? (
                    classroomBreakdown.map((course) => {
                        const scoreColor = getGradeColor(course.averageScorePercentage);
                        return (
                            <div key={course.classroomId} className="spt-course-card">
                                <div className="spt-course-header">
                                    <div>
                                        <h5 className="spt-course-name">{course.name}</h5>
                                        <span className="spt-course-subject">{course.subject}</span>
                                    </div>
                                    <div className="spt-course-score-pill" style={{ borderColor: scoreColor }}>
                                        <span style={{ color: scoreColor, fontWeight: 700 }}>
                                            {course.averageScorePercentage !== null ? `${course.averageScorePercentage}%` : '--'}
                                        </span>
                                    </div>
                                </div>

                                <div className="spt-course-instructor">
                                    <i className="fas fa-user-tie me-1"></i> {course.facultyName}
                                </div>

                                <div className="spt-course-progress-wrap mt-3">
                                    <div className="d-flex justify-content-between text-muted small mb-1">
                                        <span>Submissions ({course.submittedCount}/{course.totalAssignments})</span>
                                        <span className="fw-semibold">{course.completionRate}%</span>
                                    </div>
                                    <div className="spt-progress-bar-bg">
                                        <div 
                                            className="spt-progress-bar-fill bg-indigo"
                                            style={{ width: `${course.completionRate}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="spt-course-footer mt-3">
                                    <button 
                                        className="spt-course-filter-btn"
                                        onClick={() => setSelectedSubjectFilter(course.classroomId)}
                                    >
                                        <i className="fas fa-filter me-1"></i> Filter Assignments
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-12 p-4 text-center text-muted bg-white rounded-3 shadow-sm">
                        You have not joined any classrooms yet.
                    </div>
                )}
            </div>

            {/* Assignments Ledger Section */}
            <div className="spt-ledger-container mt-5">
                <div className="spt-ledger-header">
                    <div className="d-flex align-items-center mb-2 mb-md-0">
                        <div className="spt-section-icon bg-emerald-soft me-2">
                            <i className="fas fa-clipboard-list text-emerald"></i>
                        </div>
                        <div>
                            <h4 className="spt-section-title mb-0">Assignment Performance Ledger</h4>
                            <p className="text-muted small mb-0">Detailed view of marks, dates, and instructor evaluations</p>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="spt-filter-pills-row">
                        <button 
                            className={`spt-pill ${activeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            All ({totalAssignments})
                        </button>
                        <button 
                            className={`spt-pill ${activeFilter === 'graded' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('graded')}
                        >
                            Graded ({gradedCount})
                        </button>
                        <button 
                            className={`spt-pill ${activeFilter === 'submitted' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('submitted')}
                        >
                            Awaiting Grade ({submittedCount - gradedCount})
                        </button>
                        <button 
                            className={`spt-pill ${activeFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('pending')}
                        >
                            Pending ({pendingCount})
                        </button>
                        <button 
                            className={`spt-pill ${activeFilter === 'overdue' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('overdue')}
                        >
                            Past Due ({overdueCount})
                        </button>
                    </div>
                </div>

                {/* Sub-filters: Subject Filter Dropdown and Live Search */}
                <div className="spt-subfilters-bar">
                    <div className="row g-2 align-items-center w-100">
                        <div className="col-12 col-md-5">
                            <div className="spt-search-box">
                                <i className="fas fa-search spt-search-icon"></i>
                                <input
                                    type="text"
                                    className="spt-search-input"
                                    placeholder="Search by assignment title or classroom..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button className="spt-search-clear" onClick={() => setSearchQuery('')}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="col-12 col-md-5">
                            <select 
                                className="form-select spt-select"
                                value={selectedSubjectFilter}
                                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                            >
                                <option value="all">All Classrooms & Subjects</option>
                                {classroomBreakdown.map(c => (
                                    <option key={c.classroomId} value={c.classroomId}>
                                        {c.name} ({c.subject})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12 col-md-2 text-md-end text-muted small">
                            Showing {filteredAssignments.length} item{filteredAssignments.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>

                {/* Table / List */}
                <div className="spt-table-responsive">
                    {filteredAssignments.length > 0 ? (
                        <table className="spt-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '28%' }}>Assignment & Course</th>
                                    <th style={{ width: '16%' }}>Due Date</th>
                                    <th style={{ width: '15%' }}>Status</th>
                                    <th style={{ width: '16%' }}>Score / Marks</th>
                                    <th style={{ width: '13%' }}>Evaluation</th>
                                    <th style={{ width: '12%' }} className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssignments.map((item) => {
                                    const scoreColor = getGradeColor(item.scorePercentage);
                                    return (
                                        <tr key={item._id} className="spt-table-row">
                                            {/* Assignment Info */}
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="spt-file-icon-box me-3">
                                                        <i className="fas fa-file-alt text-indigo"></i>
                                                    </div>
                                                    <div>
                                                        <div className="spt-item-title">{item.title}</div>
                                                        <div className="spt-item-course">
                                                            <span className="fw-semibold text-secondary">{item.classroomName}</span>
                                                            {item.subject && <span className="ms-1 spt-subject-tag">{item.subject}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Due Date */}
                                            <td>
                                                <div className="spt-date-primary">{formatDate(item.dueDate)}</div>
                                                <small className="spt-date-time-left">
                                                    {getTimeLeft(item.dueDate)}
                                                </small>
                                            </td>

                                            {/* Status Badge */}
                                            <td>
                                                {getStatusBadge(item.status, item.isLate)}
                                            </td>

                                            {/* Score Column */}
                                            <td>
                                                {item.isGraded ? (
                                                    <div className="d-flex align-items-center">
                                                        <span className="spt-score-text" style={{ color: scoreColor }}>
                                                            {item.grade} <span className="text-muted small">/ {item.maxMarks}</span>
                                                        </span>
                                                        <span className="spt-score-badge ms-2" style={{ backgroundColor: `${scoreColor}18`, color: scoreColor }}>
                                                            {item.scorePercentage}%
                                                        </span>
                                                    </div>
                                                ) : item.isSubmitted ? (
                                                    <span className="text-muted small italic">Under Review</span>
                                                ) : (
                                                    <span className="text-muted small">Not submitted</span>
                                                )}
                                            </td>

                                            {/* Feedback Button */}
                                            <td>
                                                {item.feedback ? (
                                                    <button 
                                                        className="btn btn-sm spt-feedback-btn"
                                                        onClick={() => setSelectedFeedbackModal({
                                                            title: item.title,
                                                            grade: item.grade,
                                                            maxMarks: item.maxMarks,
                                                            feedback: item.feedback,
                                                            classroomName: item.classroomName
                                                        })}
                                                    >
                                                        <i className="fas fa-comment-dots me-1 text-primary"></i> View Feedback
                                                    </button>
                                                ) : item.isGraded ? (
                                                    <span className="text-muted small">No feedback</span>
                                                ) : (
                                                    <span className="text-muted small">--</span>
                                                )}
                                            </td>

                                            {/* Action Button */}
                                            <td className="text-end">
                                                {item.isSubmitted ? (
                                                    item.submissionUrl ? (
                                                        <a 
                                                            href={getBaseUrl(item.submissionUrl)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm spt-action-btn spt-action-view"
                                                            title="View your submitted file"
                                                        >
                                                            <i className="fas fa-external-link-alt me-1"></i> Work
                                                        </a>
                                                    ) : (
                                                        <span className="text-success small"><i className="fas fa-check"></i> Done</span>
                                                    )
                                                ) : (
                                                    <button 
                                                        className="btn btn-sm spt-action-btn spt-action-submit"
                                                        onClick={() => onOpenSubmission && onOpenSubmission(item)}
                                                    >
                                                        <i className="fas fa-upload me-1"></i> Submit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="spt-empty-state">
                            <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                            <h5>No assignments found</h5>
                            <p className="text-muted mb-0">No assignments match your active filters or search query.</p>
                            {(activeFilter !== 'all' || selectedSubjectFilter !== 'all' || searchQuery) && (
                                <button 
                                    className="btn btn-outline-primary btn-sm mt-3"
                                    onClick={() => {
                                        setActiveFilter('all');
                                        setSelectedSubjectFilter('all');
                                        setSearchQuery('');
                                    }}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Modal */}
            {selectedFeedbackModal && (
                <div className="spt-modal-backdrop" onClick={() => setSelectedFeedbackModal(null)}>
                    <div className="spt-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="spt-modal-header">
                            <div>
                                <span className="spt-modal-badge">{selectedFeedbackModal.classroomName}</span>
                                <h5 className="spt-modal-title mb-0">{selectedFeedbackModal.title}</h5>
                            </div>
                            <button className="spt-modal-close" onClick={() => setSelectedFeedbackModal(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="spt-modal-body">
                            <div className="spt-modal-score-box">
                                <span className="text-muted small text-uppercase">Awarded Grade</span>
                                <div className="spt-modal-score">
                                    {selectedFeedbackModal.grade} <span className="text-muted" style={{ fontSize: '18px' }}>/ {selectedFeedbackModal.maxMarks}</span>
                                </div>
                            </div>
                            <div className="spt-modal-feedback-content">
                                <label className="spt-modal-feedback-label">
                                    <i className="fas fa-quote-left me-2 text-indigo"></i> Instructor Evaluation & Feedback:
                                </label>
                                <p className="spt-modal-feedback-text">
                                    {selectedFeedbackModal.feedback}
                                </p>
                            </div>
                        </div>
                        <div className="spt-modal-footer">
                            <button className="btn btn-primary px-4" onClick={() => setSelectedFeedbackModal(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProgressTracker;
