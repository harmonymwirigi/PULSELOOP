// frontend/App.tsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Feed from './components/Feed';
import AdminDashboard from './components/AdminDashboard';
import Profile, { ProfessionalsDirectory } from './components/Profile';
import Resources from './components/Resources';
import Blogs from './components/Blogs';
import LandingPage from './components/LandingPage';
// FIX: Import shared View type to resolve conflict with Header component.
import { Post, Role, Resource, View, Blog, NclexCourse, NclexCourseResource, NclexQuestion } from './types';
import Spinner from './components/Spinner';
import SinglePostView from './components/SinglePostView';
import Chatbot from './components/Chatbot';
import SingleResourceView from './components/SingleResourceView';
import SingleBlogView from './components/SingleBlogView';
import ResetPasswordPage from './components/ResetPasswordPage';
import ProfileCompletionBanner from './components/ProfileCompletionBanner';
import InviteModal from './components/InviteModal';
import Invitations from './components/Invitations';
import TrendingTopics from './components/TrendingTopics';
import NotificationBell from './components/NotificationBell';
import NotificationCenter from './components/NotificationCenter';
import DarkModeToggle from './components/DarkModeToggle';
import MobileNav from './components/MobileNav';
import SearchBar from './components/SearchBar';
import BroadcastMessageComponent from './components/BroadcastMessage';
import UserProfilePage from './components/UserProfilePage';
import Conversations from './components/Conversations';
import MobileConversations from './components/MobileConversations';
import { getNclexCourses, getNclexCourse, subscribeToNclexCourse, submitNclexAttempt, SubmitNclexAttemptResponse, updateNclexResourceProgress } from './services/mockApi';

// FIX: Removed local View type definition. The shared type is now imported from types.ts.

const NclexCoursesView: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = React.useState<NclexCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = React.useState(true);
    const [selectedCourse, setSelectedCourse] = React.useState<NclexCourse | null>(null);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [examMode, setExamMode] = React.useState(false);
    const [reviewMode, setReviewMode] = React.useState(false);
    const [answers, setAnswers] = React.useState<Record<string, string>>({});
    const [attemptResult, setAttemptResult] = React.useState<SubmitNclexAttemptResponse | null>(null);
    const [subscribing, setSubscribing] = React.useState(false);
    const [submittingExam, setSubmittingExam] = React.useState(false);
    const [activeResourceId, setActiveResourceId] = React.useState<string | null>(null);
    const [resourceCompletion, setResourceCompletion] = React.useState<Record<string, Record<string, boolean>>>({});
    const [updatingResourceId, setUpdatingResourceId] = React.useState<string | null>(null);

    const loadCourseDetail = React.useCallback(async (courseId: string, preserveAnswers = false) => {
        try {
            setLoadingDetail(true);
            setError(null);
            const detail = await getNclexCourse(courseId);
            setSelectedCourse(detail);
            setCourses(prev => prev.map(course => course.id === detail.id ? detail : course));
            setResourceCompletion(prev => {
                const updated: Record<string, boolean> = {};
                (detail.resources || []).forEach(resource => {
                    updated[resource.id] = resource.progressStatus === 'COMPLETED';
                });
                return {
                    ...prev,
                    [detail.id]: updated,
                };
            });
            setActiveResourceId(prevId => {
                if (preserveAnswers && prevId && detail.resources?.some(resource => resource.id === prevId)) {
                    return prevId;
                }
                return detail.resources?.[0]?.id || null;
            });
            if (!preserveAnswers) {
                setExamMode(false);
                setAnswers({});
                // Load latest attempt if it exists in enrollment
                if (detail.enrollment?.latestAttempt) {
                    setAttemptResult({
                        attempt: detail.enrollment.latestAttempt,
                        enrollment: detail.enrollment
                    });
                } else {
                    setAttemptResult(null);
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load course details.');
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const loadCourses = React.useCallback(async (courseIdToSelect?: string) => {
        try {
            setLoadingCourses(true);
            setError(null);
            const data = await getNclexCourses();
            setCourses(data);
            if (data.length > 0) {
                const initialId = courseIdToSelect || data[0].id;
                await loadCourseDetail(initialId);
            } else {
                setSelectedCourse(null);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load NCLEX courses.');
        } finally {
            setLoadingCourses(false);
        }
    }, [loadCourseDetail]);

    React.useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    const handleSelectCourse = async (courseId: string) => {
        await loadCourseDetail(courseId);
    };

    const handleSubscribe = async () => {
        if (!selectedCourse) return;
        setSubscribing(true);
        setError(null);
        try {
            await subscribeToNclexCourse(selectedCourse.id);
            await loadCourseDetail(selectedCourse.id);
        } catch (err: any) {
            setError(err?.message || 'Failed to subscribe to course.');
        } finally {
            setSubscribing(false);
        }
    };

    const handleSelectResource = (resourceId: string) => {
        setActiveResourceId(resourceId);
    };

    const handleMarkResourceComplete = async (resourceId: string) => {
        if (!selectedCourse) return;
        if (!selectedCourse.enrollment) {
            setError('Subscribe to this course to track your learning progress.');
            return;
        }
        if (resourceCompletion[selectedCourse.id]?.[resourceId]) {
            return;
        }

        setUpdatingResourceId(resourceId);
        setError(null);
        try {
            const updatedCourse = await updateNclexResourceProgress(selectedCourse.id, resourceId, 'COMPLETED');
            setSelectedCourse(updatedCourse);
            setCourses(prev => prev.map(course => course.id === updatedCourse.id ? updatedCourse : course));
            setResourceCompletion(prev => ({
                ...prev,
                [updatedCourse.id]: (updatedCourse.resources || []).reduce<Record<string, boolean>>((acc, resource) => {
                    acc[resource.id] = resource.progressStatus === 'COMPLETED';
                    return acc;
                }, {}),
            }));
            setActiveResourceId(prev => {
                if (prev && updatedCourse.resources?.some(resource => resource.id === prev)) {
                    return prev;
                }
                return updatedCourse.resources?.[0]?.id || null;
            });
        } catch (err: any) {
            setError(err?.message || 'Failed to update resource progress.');
        } finally {
            setUpdatingResourceId(null);
        }
    };

    const extractYouTubeId = (rawUrl: string): string | null => {
        if (!rawUrl) return null;
        try {
            const url = rawUrl.trim();

            // Quick regex path for common patterns (watch, embed, shorts, youtu.be)
            const pattern = /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/|live\/|v\/|.*[?&]v=))([^#&?/\s]+)/i;
            const regexMatch = url.match(pattern);
            if (regexMatch && regexMatch[1]) {
                return regexMatch[1];
            }

            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();

            if (host.includes('youtu.be')) {
                const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
                return id || null;
            }

            if (host.includes('youtube.com')) {
                const vParam = parsed.searchParams.get('v');
                if (vParam) {
                    return vParam;
                }

                const pathParts = parsed.pathname.split('/').filter(Boolean);
                if (pathParts.length > 1 && (pathParts[0] === 'embed' || pathParts[0] === 'shorts' || pathParts[0] === 'live' || pathParts[0] === 'v')) {
                    return pathParts[1];
                }
                if (pathParts.length === 1) {
                    return pathParts[0];
                }
            }
        } catch (error) {
            console.warn('Failed to parse YouTube URL', error);
        }
        return null;
    };

    const renderResourceViewer = (resource: NclexCourseResource | null) => {
        if (!resource) {
            return (
                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-500">
                    Select a resource to begin learning.
                </div>
            );
        }

        if (!resource.url) {
            return (
                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-red-200 text-red-500">
                    This resource does not have a valid URL.
                </div>
            );
        }

        switch (resource.resourceType) {
            case 'YOUTUBE': {
                const videoId = extractYouTubeId(resource.url);
                if (!videoId) {
                    return (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">Unable to embed this YouTube video. You can open it directly below:</p>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-semibold">Watch on YouTube</a>
                        </div>
                    );
                }
                return (
                    <div className="relative w-full rounded-xl overflow-hidden pt-[56.25%] bg-black">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={resource.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>
                );
            }
            case 'VIDEO_UPLOAD': {
                return (
                    <video controls className="w-full rounded-xl border border-gray-200 shadow-sm" src={resource.url}>
                        Your browser does not support embedded videos. <a href={resource.url}>Download the video</a> to watch it.
                    </video>
                );
            }
            case 'PDF_UPLOAD': {
                return (
                    <div className="space-y-3">
                        <div className="h-96 rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                            <iframe
                                src={`${resource.url}#toolbar=0&navpanes=0&scrollbar=0`}
                                title={resource.title}
                                className="w-full h-full"
                            />
                        </div>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-teal-600 hover:text-teal-700 font-semibold text-sm">
                            Open PDF in a new tab
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16m-4 0h10" />
                            </svg>
                        </a>
                    </div>
                );
            }
            case 'ARTICLE': {
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{resource.description || 'Review the notes provided for this topic.'}</p>
                        {resource.url && (
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-teal-600 hover:text-teal-700 font-semibold text-sm">
                                Open full article
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H7m6-4v1a3 3 0 01-3 3H4a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </a>
                        )}
                    </div>
                );
            }
            case 'LINK':
            default: {
                return (
                    <div className="space-y-3">
                        {resource.description && <p className="text-sm text-gray-700">{resource.description}</p>}
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-teal-600 hover:text-teal-700 font-semibold text-sm">
                            Open resource
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H7m6-4v1a3 3 0 01-3 3H4a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </a>
                    </div>
                );
            }
        }
    };

    const handleStartExam = () => {
         if (!selectedCourse || !selectedCourse.questions || selectedCourse.questions.length === 0) {
             setError('This course does not have any questions yet.');
             return;
         }
        const courseResources = selectedCourse.resources || [];
        if (courseResources.length > 0) {
            const completionMap = resourceCompletion[selectedCourse.id] || {};
            const completedCount = courseResources.filter(resource => completionMap[resource.id] || resource.progressStatus === 'COMPLETED').length;
            if (completedCount < courseResources.length) {
                setError('Please complete all course resources before starting the exam.');
                return;
            }
        }
        setError(null);
        setAttemptResult(null);
        setReviewMode(false);
        setExamMode(true);
        const initial: Record<string, string> = {};
        selectedCourse.questions.forEach(question => {
            initial[question.id] = '';
        });
        setAnswers(initial);
    };

    const handleAnswerChange = (questionId: string, optionId: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    const handleSubmitExam = async () => {
        if (!selectedCourse || !selectedCourse.questions) return;
        const unanswered = selectedCourse.questions.filter(question => !answers[question.id]);
        if (unanswered.length > 0) {
            setError('Please answer all questions before submitting the exam.');
            return;
        }
        setSubmittingExam(true);
        setError(null);
        try {
            const payload = {
                answers: selectedCourse.questions.map((question: NclexQuestion) => ({
                    questionId: question.id,
                    selectedOptionId: answers[question.id] || null
                }))
            };
            const result = await submitNclexAttempt(selectedCourse.id, payload);
            setAttemptResult(result);
            setExamMode(false);
            setReviewMode(false);
            setAnswers({});
            await loadCourseDetail(selectedCourse.id, true);
        } catch (err: any) {
            setError(err?.message || 'Failed to submit exam.');
        } finally {
            setSubmittingExam(false);
        }
    };

    const selectedEnrollment = selectedCourse?.enrollment;
    const courseCompletion = React.useMemo(() => {
        if (!selectedCourse) return {};
        const base: Record<string, boolean> = {};
        (selectedCourse.resources || []).forEach(resource => {
            base[resource.id] = resource.progressStatus === 'COMPLETED';
        });
        const stored = resourceCompletion[selectedCourse.id] || {};
        return { ...base, ...stored };
    }, [resourceCompletion, selectedCourse]);
    const totalResources = selectedCourse?.resources?.length ?? 0;
    const completedResources = selectedCourse?.resources ? selectedCourse.resources.filter(resource => courseCompletion[resource.id]).length : 0;
    const allResourcesCompleted = totalResources === 0 || completedResources >= totalResources;
    const activeResource = selectedCourse?.resources?.find(resource => resource.id === activeResourceId) || null;
    const activeResourceCompleted = activeResource ? !!courseCompletion[activeResource.id] : false;
    const activeResourceUpdating = activeResource ? updatingResourceId === activeResource.id : false;
    const isEnrolled = !!selectedEnrollment;

    if (loadingCourses) {
        return (
            <div className="flex justify-center py-16">
                <Spinner size="lg" color="teal" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            <div className="grid lg:grid-cols-[320px,1fr] gap-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">NCLEX Courses</h3>
                    {courses.length === 0 ? (
                        <p className="text-gray-500 text-sm">No NCLEX courses available yet. Please check back later.</p>
                    ) : (
                        <div className="space-y-3">
                            {courses.map(course => (
                                <button
                                    key={course.id}
                                    onClick={() => handleSelectCourse(course.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                                        selectedCourse?.id === course.id
                                            ? 'border-teal-500 bg-teal-50 shadow-md'
                                            : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-800">{course.title}</h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            course.status === 'PUBLISHED'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {course.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                        <span>Resources: {course.resourceCount ?? (course.resources?.length || 0)}</span>
                                        <span>Questions: {course.questionCount ?? (course.questions?.length || 0)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    {loadingDetail ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="md" color="teal" />
                        </div>
                    ) : selectedCourse ? (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">{selectedCourse.title}</h3>
                                    {selectedEnrollment && (
                                        <p className="text-gray-600 mt-2 whitespace-pre-line">{selectedCourse.description}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                        selectedCourse.status === 'PUBLISHED'
                                            ? 'bg-teal-100 text-teal-700'
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {selectedCourse.status}
                                    </span>
                                    {selectedCourse.publishedAt && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Published {new Date(selectedCourse.publishedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-teal-700">Enrollment</h4>
                                {selectedEnrollment ? (
                                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                                        <p>Status: <span className="font-semibold text-teal-700">{selectedEnrollment.status}</span></p>
                                        <p>Progress: {Math.round(selectedEnrollment.progressPercent)}%</p>
                                        {selectedEnrollment.latestScorePercent !== null && selectedEnrollment.latestScorePercent !== undefined && (
                                            <p>Last Score: {Math.round(selectedEnrollment.latestScorePercent)}%</p>
                                        )}
                                        <p>Attempts: {selectedEnrollment.attemptCount}</p>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-3">
                                        <p className="text-sm text-gray-600">You are not enrolled in this course yet.</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{selectedCourse.description}</p>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSubscribe}
                                                disabled={subscribing || selectedCourse.status !== 'PUBLISHED'}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                {subscribing ? 'Subscribing...' : 'Subscribe'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedEnrollment && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-semibold text-gray-800">Course Resources</h4>
                                    {totalResources > 0 && (
                                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                                            {completedResources}/{totalResources} completed
                                        </span>
                                    )}
                                </div>
                                {selectedCourse.resources && selectedCourse.resources.length > 0 ? (
                                    <div className="grid lg:grid-cols-[260px,1fr] gap-4">
                                        <div className="space-y-3">
                                            {selectedCourse.resources.map(resource => {
                                                const isActive = activeResource?.id === resource.id;
                                                const isCompleted = !!courseCompletion[resource.id];
                                                return (
                                                    <button
                                                        type="button"
                                                        key={resource.id}
                                                        onClick={() => handleSelectResource(resource.id)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                                                            isActive
                                                                ? 'border-teal-500 bg-teal-50 shadow-md'
                                                                : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <h5 className="font-semibold text-gray-800">{resource.title}</h5>
                                                                {resource.description && (
                                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{resource.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end space-y-1">
                                                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                                                                    {resource.resourceType.replace('_', ' ')}
                                                                </span>
                                                                <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                                    isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        className="h-3 w-3 mr-1"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        {isCompleted ? (
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        ) : (
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                                                                        )}
                                                                    </svg>
                                                                    {isCompleted ? 'Completed' : 'Pending'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Learning Viewer</h5>
                                                {renderResourceViewer(activeResource)}
                                            </div>
                                            {activeResource && (
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="text-xs text-gray-500">
                                                        {isEnrolled
                                                            ? 'Mark this resource as completed after you finish reviewing it to unlock the exam.'
                                                            : 'Subscribe to this course to track your progress and unlock the exam.'}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkResourceComplete(activeResource.id)}
                                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                                            activeResourceCompleted
                                                                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                                                : activeResourceUpdating
                                                                    ? 'bg-teal-400 text-white cursor-wait'
                                                                    : isEnrolled
                                                                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                        disabled={!isEnrolled || activeResourceCompleted || activeResourceUpdating}
                                                    >
                                                        {activeResourceCompleted
                                                            ? 'Completed'
                                                            : activeResourceUpdating
                                                                ? 'Saving...'
                                                                : 'Mark as Completed'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No resources have been added yet.</p>
                                )}
                            </div>
                            )}

                            {selectedEnrollment && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-semibold text-gray-800">Course Exam</h4>
                                    {selectedCourse.questions && selectedCourse.questions.length > 0 && (
                                        <div className="flex items-center space-x-2">
                                            {!examMode && !reviewMode ? (
                                                selectedEnrollment.attemptCount > 0 ? (
                                                    <button
                                                        onClick={() => setReviewMode(true)}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Review Exam
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleStartExam}
                                                        disabled={!allResourcesCompleted}
                                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                                            allResourcesCompleted
                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        Start Exam
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setExamMode(false);
                                                        setReviewMode(false);
                                                        setAnswers({});
                                                        setError(null);
                                                    }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!allResourcesCompleted && selectedCourse.resources && selectedCourse.resources.length > 0 && (
                                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        Complete all course resources before attempting the exam.
                                    </p>
                                )}
                                {selectedCourse.questions && selectedCourse.questions.length === 0 && (
                                    <p className="text-sm text-gray-500">Questions for this course are not available yet.</p>
                                )}
                                {attemptResult && !examMode && !reviewMode && (
                                    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50">
                                        <h5 className="font-semibold text-teal-700">Latest Attempt</h5>
                                        <p className="text-sm text-teal-600 mt-2">
                                            Score: <span className="text-xl font-bold">{Math.round(attemptResult.attempt.scorePercent)}%</span> ({attemptResult.attempt.correctAnswers}/{attemptResult.attempt.totalQuestions} correct)
                                        </p>
                                        <p className="text-xs text-teal-500 mt-2">
                                            Submitted on {new Date(attemptResult.attempt.submittedAt).toLocaleString()}
                                        </p>
                                        <button
                                            onClick={() => setReviewMode(true)}
                                            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                                        >
                                            Review Exam
                                        </button>
                                    </div>
                                )}
                                {examMode && selectedCourse.questions && (
                                    <div className="border border-gray-200 rounded-xl p-4 space-y-6">
                                        {selectedCourse.questions.map((question, index) => (
                                            <div key={question.id} className="space-y-3">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{index + 1}. {question.questionText}</p>
                                                    {question.explanation && (
                                                        <p className="text-xs text-gray-500 mt-1">Explanation available after submission.</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    {question.options.map(option => (
                                                        <label
                                                            key={option.id}
                                                            className={`flex items-center space-x-3 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                                                                answers[question.id] === option.id
                                                                    ? 'border-indigo-500 bg-indigo-50'
                                                                    : 'border-gray-200 hover:border-indigo-300'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={question.id}
                                                                value={option.id}
                                                                checked={answers[question.id] === option.id}
                                                                onChange={() => handleAnswerChange(question.id, option.id)}
                                                                className="text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-sm text-gray-700">{option.optionText}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSubmitExam}
                                                disabled={submittingExam}
                                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                {submittingExam ? 'Submitting...' : 'Submit Exam'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {reviewMode && attemptResult && attemptResult.attempt.answers && (
                                    <div className="border border-gray-200 rounded-xl p-4 space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h5 className="text-lg font-semibold text-gray-800">Exam Review</h5>
                                            <button
                                                onClick={() => setReviewMode(false)}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                                            >
                                                Close Review
                                            </button>
                                        </div>
                                        {attemptResult.attempt.answers.map((answer, index) => {
                                            const isCorrect = answer.isCorrect;
                                            const selectedOptionId = answer.selectedOptionId;
                                            const correctOptionId = answer.correctOptionId;
                                            
                                            return (
                                                <div key={answer.id} className={`border rounded-xl p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <p className="font-semibold text-gray-800">
                                                            {index + 1}. {answer.questionText}
                                                        </p>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                            isCorrect 
                                                                ? 'bg-emerald-500 text-white' 
                                                                : 'bg-red-500 text-white'
                                                        }`}>
                                                            {isCorrect ? 'Correct' : 'Incorrect'}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 mt-3">
                                                        {answer.options?.map(option => {
                                                            const isSelected = option.id === selectedOptionId;
                                                            const isCorrectAnswer = option.id === correctOptionId;
                                                            
                                                            let borderColor = 'border-gray-200';
                                                            let bgColor = 'bg-white';
                                                            let textColor = 'text-gray-700';
                                                            
                                                            if (isCorrectAnswer) {
                                                                borderColor = 'border-emerald-500';
                                                                bgColor = 'bg-emerald-100';
                                                                textColor = 'text-emerald-800';
                                                            } else if (isSelected && !isCorrect) {
                                                                borderColor = 'border-red-500';
                                                                bgColor = 'bg-red-100';
                                                                textColor = 'text-red-800';
                                                            }
                                                            
                                                            return (
                                                                <div
                                                                    key={option.id}
                                                                    className={`flex items-center space-x-3 border rounded-lg px-3 py-2 ${borderColor} ${bgColor}`}
                                                                >
                                                                    <div className="flex items-center space-x-2 flex-1">
                                                                        {isCorrectAnswer && (
                                                                            <span className="text-emerald-600 font-bold">✓</span>
                                                                        )}
                                                                        {isSelected && !isCorrect && (
                                                                            <span className="text-red-600 font-bold">✗</span>
                                                                        )}
                                                                        <span className={`text-sm ${textColor}`}>{option.optionText}</span>
                                                                    </div>
                                                                    {isCorrectAnswer && (
                                                                        <span className="text-xs font-semibold text-emerald-700 px-2 py-1 bg-emerald-200 rounded">
                                                                            Correct Answer
                                                                        </span>
                                                                    )}
                                                                    {isSelected && !isCorrectAnswer && (
                                                                        <span className="text-xs font-semibold text-red-700 px-2 py-1 bg-red-200 rounded">
                                                                            Your Answer
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {answer.explanation && (
                                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <p className="text-sm font-semibold text-blue-800 mb-1">Explanation:</p>
                                                            <p className="text-sm text-blue-700">{answer.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Select a course to see details.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const [currentView, setCurrentView] = useState<View>('FEED');
    
    // Check for reset password token in URL
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('reset_token');
        const invitationToken = urlParams.get('token');
        const pathname = window.location.pathname;
        
        // Check if this is a reset password URL
        if (resetToken && pathname === '/reset-password') {
            console.log('Reset password token detected:', resetToken);
            setCurrentView('RESET_PASSWORD');
        }
        // Check if this is an invitation URL (only if no reset_token)
        else if (invitationToken && pathname === '/' && !resetToken) {
            console.log('Invitation token detected:', invitationToken);
            // Handle invitation logic here if needed
        }
    }, []);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [feedTagFilter, setFeedTagFilter] = useState<string | null>(null);
    const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

    const navigateTo = (view: View) => {
        console.log('Navigating to:', view);
        setCurrentView(view);
    };

    const navigateToPost = (post: Post) => {
        setSelectedPost(post);
        setCurrentView('SINGLE_POST');
    };

    const navigateToResource = (resource: Resource) => {
        setSelectedResource(resource);
        setCurrentView('SINGLE_RESOURCE');
    };

    const navigateToBlog = (blog: Blog) => {
        setSelectedBlog(blog);
        setCurrentView('SINGLE_BLOG');
    };

    const handleOpenNotifications = () => {
        setIsNotificationCenterOpen(true);
    };

    const handleCloseNotifications = () => {
        setIsNotificationCenterOpen(false);
    };

    const handleNavigateToPost = (postId: string) => {
        // Placeholder for potential deep-linking to a specific post
        console.log('Navigate to post:', postId);
        setCurrentView('FEED');
    };

    const handleSearchResult = (result: any) => {
        if (!result || !result.type) return;

        if (result.type === 'post') {
            console.log('Navigate to post search result:', result.id);
            navigateTo('FEED');
        } else if (result.type === 'resource') {
            console.log('Navigate to resource search result:', result.id);
            navigateTo('RESOURCES');
        } else if (result.type === 'blog') {
            console.log('Navigate to blog search result:', result.id);
            navigateTo('BLOGS');
        } else if (result.type === 'user') {
            console.log('Navigate to professional search result:', result.id);
            setSelectedUserId(result.id);
            navigateTo('PROFESSIONALS');
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-cyan-50">
                <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-8">
                    <Spinner size="lg" color="teal"/>
                </div>
            </div>
        );
    }

    if (!user) {
        // Show reset password page if there's a token in the URL
        if (currentView === 'RESET_PASSWORD') {
            return <ResetPasswordPage navigateTo={navigateTo} />;
        }
        return <LandingPage />;
    }

    const MainContent: React.FC = () => {
        switch (currentView) {
            case 'FEED': return <Feed navigateToPost={navigateToPost} initialTagFilter={feedTagFilter} onTagFilterChange={setFeedTagFilter} onSearchResult={handleSearchResult} />;
            case 'PROFILE': return <Profile />;
            case 'RESOURCES': return <Resources navigateToResource={navigateToResource} onSearchResult={handleSearchResult} />;
            case 'BLOGS': return <Blogs navigateToBlog={navigateToBlog} onSearchResult={handleSearchResult} />;
            case 'NCLEX': return <NclexCoursesView />;
            case 'INVITATIONS': return <Invitations openInviteModal={() => setIsInviteModalOpen(true)} />;
            case 'SINGLE_POST': return selectedPost && <SinglePostView post={selectedPost} navigateTo={navigateTo} />;
            case 'SINGLE_RESOURCE': return selectedResource && <SingleResourceView resource={selectedResource} navigateTo={navigateTo} />;
            case 'SINGLE_BLOG': return selectedBlog && <SingleBlogView blog={selectedBlog} navigateTo={navigateTo} />;
            case 'RESET_PASSWORD': return <ResetPasswordPage navigateTo={navigateTo} />;
            case 'PROFESSIONALS': return <ProfessionalsDirectory initialUserId={selectedUserId || undefined} />;
            case 'USER_PROFILE': 
                return user.role === Role.ADMIN 
                    ? <UserProfilePage onNavigate={navigateTo} /> 
                    : <p className="text-center text-red-500">Access Denied. You are not an admin.</p>;
            case 'ADMIN': 
                return user.role === Role.ADMIN 
                    ? <AdminDashboard navigateTo={navigateTo} /> 
                    : <p className="text-center text-red-500">Access Denied. You are not an admin.</p>;
            default: return <Feed navigateToPost={navigateToPost} initialTagFilter={feedTagFilter} onTagFilterChange={setFeedTagFilter} />;
        }
    };

    const NavLink: React.FC<{ view?: View; label: string; icon: React.ReactElement; onClick?: () => void }> = ({ view, label, icon, onClick }) => {
        const isCurrent = view && currentView === view;
        const action = onClick || (view ? () => navigateTo(view) : () => {});
        
        return (
            <button
                onClick={action}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left font-semibold transition-all duration-200 ${
                    isCurrent
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md transform scale-105'
                        : 'text-slate-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50 dark:hover:from-indigo-900/20 dark:hover:to-cyan-900/20 hover:text-indigo-900 dark:hover:text-indigo-300 hover:shadow-sm'
                }`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    };


    return (
        <div className="min-h-screen font-sans text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">

            <Header 
                navigateTo={navigateTo} 
                currentView={currentView} 
                onOpenNotifications={handleOpenNotifications}
            />
            <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
            <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 lg:py-8 flex-grow relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), 
                                         radial-gradient(circle at 75% 75%, #06b6d4 0%, transparent 50%),
                                         radial-gradient(circle at 50% 50%, #8b5cf6 0%, transparent 50%)`,
                        backgroundSize: '400px 400px, 300px 300px, 500px 500px'
                    }}></div>
                </div>
                 {user && (user.profileCompletionPercentage ?? 0) < 100 && currentView !== 'PROFILE' && (
                    <ProfileCompletionBanner user={user} navigateTo={navigateTo} />
                )}
                
                {/* Broadcast Message for logged-in users */}
                <BroadcastMessageComponent />
                
                {currentView === 'FEED' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                        {/* Left Sidebar */}
                        <aside className="hidden lg:block lg:col-span-1">
                            <div className="sticky top-24 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 space-y-4">
                                <NavLink view="FEED" label="Feed" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>} />
                                <NavLink view="RESOURCES" label="Resources" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h9" /></svg>} />
                                <NavLink view="BLOGS" label="Blogs" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
                                <NavLink view="NCLEX" label="NCLEX" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" /></svg>} />
                                <NavLink view="INVITATIONS" label="My Invitations" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                                <NavLink label="Invite a Colleague" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} onClick={() => setIsInviteModalOpen(true)} />
                                {user.role === Role.ADMIN && <NavLink view="ADMIN" label="Admin Panel" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />}
                                
                                {/* Dark Mode Toggle */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
                                        <DarkModeToggle />
                                    </div>
                                </div>
                                
                                {/* Notification Bell */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Notifications</span>
                                        <NotificationBell onOpenNotifications={handleOpenNotifications} />
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div className="lg:col-span-2 relative">
                           <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
                               <MainContent />
                           </div>
                        </div>
                        
                        {/* Right Sidebar - Trending Topics and Conversations */}
                        <aside className="hidden lg:block lg:col-span-1 space-y-6">
                            <div className="sticky top-24 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6">
                                <TrendingTopics 
                                    onTagClick={(tag) => {
                                        // Set the tag filter and navigate to feed
                                        setFeedTagFilter(tag);
                                        navigateTo('FEED');
                                    }}
                                />
                            </div>
                            <div className="sticky top-24">
                                <Conversations isAdmin={user?.role === 'ADMIN'} />
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
                            <MainContent />
                        </div>
                        {/* Mobile Trending Topics and Conversations - Show below main content on mobile */}
                        <div className="mt-4 lg:hidden space-y-4">
                            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-3 sm:p-4">
                                <TrendingTopics 
                                    onTagClick={(tag) => {
                                        setFeedTagFilter(tag);
                                        navigateTo('FEED');
                                    }}
                                />
                            </div>
                            <MobileConversations isAdmin={user?.role === 'ADMIN'} />
                        </div>
                    </div>
                )}
            </main>
            <Chatbot />
            <NotificationCenter 
                isOpen={isNotificationCenterOpen}
                onClose={handleCloseNotifications}
                onNavigateToPost={handleNavigateToPost}
            />
            <MobileNav 
                currentView={currentView}
                navigateTo={navigateTo}
                onOpenNotifications={handleOpenNotifications}
                onInviteClick={() => setIsInviteModalOpen(true)}
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;