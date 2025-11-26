import React, { useState, useEffect, useCallback } from 'react';
import { getPendingUsers, approveUser, getAllUsers, updateUserRole, deleteUser, getPendingResources, approveResource, rejectResource, inactivateResource, reactivateResource, getPendingBlogs, approveBlog, rejectBlog, inactivateBlog, reactivateBlog, getAllBroadcastMessages, createBroadcastMessage, updateBroadcastMessage, deleteBroadcastMessage, toggleBroadcastMessageVisibility, getAllFeedbacks, updateFeedbackStatus, uploadImage, getAllPosts, adminDeletePost, getAllResources, getAllBlogs, getAbsoluteUrl, createNclexCourse, updateNclexCourse, deleteNclexCourse, getAdminNclexCourses, addNclexCourseResource, deleteNclexCourseResource, generateNclexQuestions, getNclexCourse, createNclexQuestion, updateNclexQuestion, deleteNclexQuestion, getPromotions, adminUpdatePromotionStatus, generateNewsletter, sendNewsletter, NewsletterDraft } from '../services/mockApi';
import { User, Resource, Blog, BroadcastMessage, Feedback, Post, View, NclexCourse, NclexCourseStatus, NclexResourceType, NclexQuestion, Promotion } from '../types';
import Spinner from './Spinner';
import ApprovalDetailView from './ApprovalDetailView';

type Tab = 'PENDING_USERS' | 'ALL_USERS' | 'POSTS' | 'RESOURCES' | 'BLOGS' | 'BROADCAST_MESSAGES' | 'FEEDBACKS' | 'PROMOTIONS' | 'NEWSLETTERS' | 'NCLEX';

interface AdminDashboardProps {
    navigateTo: (view: View) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<Tab>('PENDING_USERS');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [pendingResources, setPendingResources] = useState<Resource[]>([]);
    const [pendingBlogs, setPendingBlogs] = useState<Blog[]>([]);
    const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [viewingItem, setViewingItem] = useState<Resource | Blog | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<{show: boolean, type: 'delete' | 'role', user: User | null, newRole?: string}>({show: false, type: 'delete', user: null});
    const [showBroadcastModal, setShowBroadcastModal] = useState<{show: boolean, editing?: BroadcastMessage}>({show: false});
    const [broadcastForm, setBroadcastForm] = useState<{title: string, message: string, imageUrl: string}>({title: '', message: '', imageUrl: ''});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState<{show: boolean, type: 'resource' | 'blog', item: Resource | Blog | null}>({show: false, type: 'resource', item: null});
    const [rejectionReason, setRejectionReason] = useState('');
    const [nclexCourses, setNclexCourses] = useState<NclexCourse[]>([]);
    const [loadingNclex, setLoadingNclex] = useState(false);
    const [nclexError, setNclexError] = useState<string | null>(null);
    const [showNclexCourseForm, setShowNclexCourseForm] = useState(false);
    const [showNclexResourceForm, setShowNclexResourceForm] = useState(false);
    const [loadingNclexDetail, setLoadingNclexDetail] = useState(false);
    const [nclexMessage, setNclexMessage] = useState<string | null>(null);
    const [selectedNclexCourse, setSelectedNclexCourse] = useState<NclexCourse | null>(null);
    const [nclexCourseForm, setNclexCourseForm] = useState<{ title: string; description: string; status: NclexCourseStatus }>({ title: '', description: '', status: 'DRAFT' });
    const [nclexResourceForm, setNclexResourceForm] = useState<{ resourceType: NclexResourceType; title: string; description: string; url: string; file: File | null }>({
        resourceType: 'YOUTUBE',
        title: '',
        description: '',
        url: '',
        file: null,
    });
    const [savingCourse, setSavingCourse] = useState(false);
    const [addingNclexResource, setAddingNclexResource] = useState(false);
    const [generatingNclexQuestions, setGeneratingNclexQuestions] = useState(false);
    const [questionCount, setQuestionCount] = useState<number>(5);
    const [questionPrompt, setQuestionPrompt] = useState<string>('');
    const [showNclexEditModal, setShowNclexEditModal] = useState<{show: boolean, course: NclexCourse | null}>({show: false, course: null});
    const [showNclexDeleteModal, setShowNclexDeleteModal] = useState<{show: boolean, course: NclexCourse | null}>({show: false, course: null});
    const [editingNclexCourse, setEditingNclexCourse] = useState(false);
    const [deletingNclexCourse, setDeletingNclexCourse] = useState(false);
    const [showNclexQuestionForm, setShowNclexQuestionForm] = useState(false);
    const [editingNclexQuestion, setEditingNclexQuestion] = useState<NclexQuestion | null>(null);
    const [deletingNclexQuestionId, setDeletingNclexQuestionId] = useState<string | null>(null);
    const [savingNclexQuestion, setSavingNclexQuestion] = useState(false);
    const [nclexQuestionForm, setNclexQuestionForm] = useState<{
        questionText: string;
        explanation: string;
        options: Array<{ optionText: string; isCorrect: boolean }>;
    }>({
        questionText: '',
        explanation: '',
        options: [
            { optionText: '', isCorrect: false },
            { optionText: '', isCorrect: false },
            { optionText: '', isCorrect: false },
            { optionText: '', isCorrect: false },
        ],
    });
    const [newsletterDraft, setNewsletterDraft] = useState<NewsletterDraft | null>(null);
    const [newsletterLoading, setNewsletterLoading] = useState(false);
    const [newsletterSending, setNewsletterSending] = useState(false);
    const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingUsersData, allUsersData, postsData, resources, blogs, broadcastData, feedbacksData, promotionsData] = await Promise.all([
                getPendingUsers(),
                getAllUsers(),
                getAllPosts(),
                getAllResources(),
                getAllBlogs(),
                getAllBroadcastMessages(),
                getAllFeedbacks(),
                // Load all promotions (pending, approved, rejected), including inactive ones,
                // so admin can see full promotion lifecycle.
                getPromotions('ALL', { includeInactive: true })
            ]);
            setPendingUsers(pendingUsersData);
            setAllUsers(allUsersData);
            setPosts(postsData);
            setPendingResources(resources);
            setPendingBlogs(blogs);
            setBroadcastMessages(broadcastData);
            setFeedbacks(feedbacksData);
            setPromotions(promotionsData);
        } catch (err) {
            setError(`Failed to fetch data.`);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadNclexCourses = useCallback(async () => {
        setLoadingNclex(true);
        setNclexError(null);
        try {
            const courses = await getAdminNclexCourses();
            setNclexCourses(courses);
        } catch (err: any) {
            setNclexError(`Failed to load NCLEX courses: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoadingNclex(false);
        }
    }, []);

    const refreshNclexCourse = useCallback(async (courseId: string) => {
        setLoadingNclexDetail(true);
        try {
            const course = await getNclexCourse(courseId);
            setSelectedNclexCourse(course);
        } catch (err: any) {
            setNclexError(`Failed to load course details: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoadingNclexDetail(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeTab === 'NCLEX') {
            loadNclexCourses();
        }
    }, [activeTab, loadNclexCourses]);

    const handleApprove = async (id: string, type: 'USER' | 'RESOURCE' | 'BLOG') => {
        setApprovingId(id);
        try {
            if (type === 'USER') {
                await approveUser(id);
                setPendingUsers(prev => prev.filter(item => item.id !== id));
                // Refresh all users to update the list
                const updatedUsers = await getAllUsers();
                setAllUsers(updatedUsers);
            } else if (type === 'RESOURCE') {
                await approveResource(id);
                setPendingResources(prev => prev.filter(item => item.id !== id));
                // Refresh resources data
                const updatedResources = await getPendingResources();
                setPendingResources(updatedResources);
            } else if (type === 'BLOG') {
                await approveBlog(id);
                setPendingBlogs(prev => prev.filter(item => item.id !== id));
                // Refresh blogs data
                const updatedBlogs = await getPendingBlogs();
                setPendingBlogs(updatedBlogs);
            }
            setViewingItem(null); // Return to list view after approval
        } catch (err: any) {
            console.error('Approval error:', err);
            // Check if the error is because the item is already approved
            if (err.message && err.message.includes('already approved')) {
                // If already approved, just remove from pending list
                if (type === 'RESOURCE') {
                    setPendingResources(prev => prev.filter(item => item.id !== id));
                } else if (type === 'BLOG') {
                    setPendingBlogs(prev => prev.filter(item => item.id !== id));
                }
                setViewingItem(null);
            } else {
                setError(`Failed to approve item: ${err.message || 'Unknown error'}`);
            }
        } finally {
            setApprovingId(null);
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        setApprovingId(userId);
        try {
            await updateUserRole(userId, newRole);
            // Refresh all users to update the list
            const updatedUsers = await getAllUsers();
            setAllUsers(updatedUsers);
            setShowConfirmModal({show: false, type: 'role', user: null});
        } catch (err) {
            setError(`Failed to update user role.`);
        } finally {
            setApprovingId(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setApprovingId(userId);
        try {
            await deleteUser(userId);
            // Refresh all users to update the list
            const updatedUsers = await getAllUsers();
            setAllUsers(updatedUsers);
            setShowConfirmModal({show: false, type: 'delete', user: null});
        } catch (err) {
            setError(`Failed to delete user.`);
        } finally {
            setApprovingId(null);
        }
    };
    
    if (viewingItem) {
        return (
            <ApprovalDetailView
                item={viewingItem}
                onApprove={handleApprove}
                onBack={() => setViewingItem(null)}
                isApproving={approvingId === viewingItem.id}
            />
        );
    }
    
    const handleCreateBroadcastMessage = async () => {
        if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
            setError('Title and message are required');
            return;
        }
        
        try {
            await createBroadcastMessage(broadcastForm);
            resetBroadcastForm();
            setShowBroadcastModal({show: false});
            fetchData();
        } catch (err) {
            setError('Failed to create broadcast message');
        }
    };

    const handleUpdateBroadcastMessage = async () => {
        if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
            setError('Title and message are required');
            return;
        }
        
        if (!showBroadcastModal.editing) return;
        
        try {
            await updateBroadcastMessage(showBroadcastModal.editing.id, broadcastForm);
            resetBroadcastForm();
            setShowBroadcastModal({show: false});
            fetchData();
        } catch (err) {
            setError('Failed to update broadcast message');
        }
    };

    const handleFeedbackStatusUpdate = async (feedbackId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        setApprovingId(feedbackId);
        try {
            await updateFeedbackStatus(feedbackId, status);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to update feedback status.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleDeleteBroadcastMessage = async (messageId: string) => {
        try {
            await deleteBroadcastMessage(messageId);
            fetchData();
        } catch (err) {
            setError('Failed to delete broadcast message');
        }
    };

    const handleToggleBroadcastMessage = async (messageId: string, isActive: boolean) => {
        try {
            await updateBroadcastMessage(messageId, { is_active: isActive });
            fetchData();
        } catch (err) {
            setError('Failed to toggle broadcast message');
        }
    };

    const handleToggleBroadcastVisibility = async (messageId: string) => {
        try {
            await toggleBroadcastMessageVisibility(messageId);
            fetchData();
        } catch (err) {
            setError('Failed to toggle broadcast message visibility');
        }
    };

    const handleDeletePost = async (postId: string) => {
        setApprovingId(postId);
        try {
            await adminDeletePost(postId);
            fetchData();
        } catch (err) {
            setError('Failed to delete post');
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectResource = async () => {
        if (!showRejectModal.item) return;
        
        setApprovingId(showRejectModal.item.id);
        try {
            await rejectResource(showRejectModal.item.id, rejectionReason);
            setShowRejectModal({show: false, type: 'resource', item: null});
            setRejectionReason('');
            fetchData();
        } catch (err) {
            setError('Failed to reject resource');
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectBlog = async () => {
        if (!showRejectModal.item) return;
        
        setApprovingId(showRejectModal.item.id);
        try {
            await rejectBlog(showRejectModal.item.id, rejectionReason);
            setShowRejectModal({show: false, type: 'blog', item: null});
            setRejectionReason('');
            fetchData();
        } catch (err) {
            setError('Failed to reject blog');
        } finally {
            setApprovingId(null);
        }
    };

    const handleInactivateResource = async (resourceId: string) => {
        setApprovingId(resourceId);
        try {
            await inactivateResource(resourceId);
            fetchData();
        } catch (err) {
            setError('Failed to inactivate resource');
        } finally {
            setApprovingId(null);
        }
    };

    const handleInactivateBlog = async (blogId: string) => {
        setApprovingId(blogId);
        try {
            await inactivateBlog(blogId);
            fetchData();
        } catch (err) {
            setError('Failed to inactivate blog');
        } finally {
            setApprovingId(null);
        }
    };

    const handleReactivateResource = async (resourceId: string) => {
        setApprovingId(resourceId);
        try {
            await reactivateResource(resourceId);
            fetchData();
        } catch (err) {
            setError('Failed to reactivate resource');
        } finally {
            setApprovingId(null);
        }
    };

    const handleReactivateBlog = async (blogId: string) => {
        setApprovingId(blogId);
        try {
            await reactivateBlog(blogId);
            fetchData();
        } catch (err) {
            setError('Failed to reactivate blog');
        } finally {
            setApprovingId(null);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            setUploadingImage(true);
            const response = await uploadImage(file);
            setBroadcastForm(prev => ({ ...prev, imageUrl: response.imageUrl }));
            setImagePreview(URL.createObjectURL(file));
        } catch (err) {
            setError('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            handleImageUpload(file);
        }
    };

    const resetBroadcastForm = () => {
        setBroadcastForm({ title: '', message: '', imageUrl: '' });
        setImageFile(null);
        setImagePreview(null);
    };

    const handleViewProfile = (user: User) => {
        // Navigate to the user profile page
        navigateTo('USER_PROFILE');
        // Store the user ID in sessionStorage for the profile page to access
        sessionStorage.setItem('selectedUserId', user.id);
    };

    const populateBroadcastForm = (message: BroadcastMessage) => {
        setBroadcastForm({
            title: message.title,
            message: message.message,
            imageUrl: message.imageUrl || ''
        });
        setImagePreview(message.imageUrl || null);
        setImageFile(null);
    };

    const handlePromotionStatusChange = async (
        promotionId: string,
        status: 'APPROVED' | 'REJECTED',
        options?: { durationDays?: number; isActive?: boolean }
    ) => {
        setApprovingId(promotionId);
        try {
            const updated = await adminUpdatePromotionStatus(promotionId, {
                status,
                durationDays: options?.durationDays,
                isActive: options?.isActive,
            });
            // Keep the promotion in the list and just update its fields
            setPromotions(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        } catch (err: any) {
            setError(err?.message || 'Failed to update promotion status.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleCreateNclexCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingCourse(true);
        setNclexError(null);
        setNclexMessage(null);
         try {
            const newCourse = await createNclexCourse(nclexCourseForm);
            setNclexCourseForm({ title: '', description: '', status: 'DRAFT' });
            setShowNclexCourseForm(false);
            setShowNclexResourceForm(false);
            setNclexMessage('Course created successfully.');
            await loadNclexCourses();
            setSelectedNclexCourse(newCourse);
            await refreshNclexCourse(newCourse.id);
        } catch (err: any) {
            setNclexError(`Failed to create NCLEX course: ${err?.message || 'Unknown error'}`);
        } finally {
            setSavingCourse(false);
        }
    };

    const handleUpdateNclexStatus = async (course: NclexCourse, newStatus: NclexCourseStatus) => {
        setApprovingId(course.id);
        setNclexError(null);
        setNclexMessage(null);
         try {
             await updateNclexCourse(course.id, { status: newStatus });
             setNclexMessage(`Course status updated to ${newStatus}.`);
             await loadNclexCourses();
             if (selectedNclexCourse && selectedNclexCourse.id === course.id) {
                 await refreshNclexCourse(course.id);
             }
         } catch (err: any) {
             setNclexError(`Failed to update NCLEX course status: ${err?.message || 'Unknown error'}`);
         } finally {
             setApprovingId(null);
         }
     };

    const handleEditNclexCourse = (course: NclexCourse) => {
        setShowNclexEditModal({ show: true, course });
        setNclexCourseForm({
            title: course.title,
            description: course.description,
            status: course.status
        });
    };

    const handleSaveNclexCourseEdit = async () => {
        if (!showNclexEditModal.course) return;
        
        const { title, description, status } = nclexCourseForm;
        if (!title.trim() || !description.trim()) {
            setNclexError('Title and description are required.');
            return;
        }

        setEditingNclexCourse(true);
        setNclexError(null);
        setNclexMessage(null);
        
        try {
            await updateNclexCourse(showNclexEditModal.course.id, {
                title: title.trim(),
                description: description.trim(),
                status
            });
            setNclexMessage('Course updated successfully.');
            setShowNclexEditModal({ show: false, course: null });
            await loadNclexCourses();
            if (selectedNclexCourse && selectedNclexCourse.id === showNclexEditModal.course.id) {
                await refreshNclexCourse(showNclexEditModal.course.id);
            }
        } catch (err: any) {
            setNclexError(`Failed to update course: ${err?.message || 'Unknown error'}`);
        } finally {
            setEditingNclexCourse(false);
        }
    };

    const handleDeleteNclexCourse = async () => {
        if (!showNclexDeleteModal.course) return;

        setDeletingNclexCourse(true);
        setNclexError(null);
        setNclexMessage(null);
        
        try {
            await deleteNclexCourse(showNclexDeleteModal.course.id);
            setNclexMessage('Course deleted successfully.');
            setShowNclexDeleteModal({ show: false, course: null });
            if (selectedNclexCourse && selectedNclexCourse.id === showNclexDeleteModal.course.id) {
                setSelectedNclexCourse(null);
            }
            await loadNclexCourses();
        } catch (err: any) {
            setNclexError(`Failed to delete course: ${err?.message || 'Unknown error'}`);
        } finally {
            setDeletingNclexCourse(false);
        }
    };

    const handleSelectNclexCourse = (courseId: string) => {
         const course = nclexCourses.find(c => c.id === courseId);
         if (course) {
             setSelectedNclexCourse(course);
             setShowNclexCourseForm(false);
             setShowNclexResourceForm(false);
             setNclexError(null);
             setNclexMessage(null);
             setNclexResourceForm({ resourceType: 'YOUTUBE', title: '', description: '', url: '', file: null });
             refreshNclexCourse(courseId);
         }
     };

    const handleAddNclexResource = async (e: React.FormEvent) => {
        e.preventDefault();
        const { resourceType, title, url, file, description } = nclexResourceForm;

        if (!title.trim()) {
            setNclexError('Please provide a resource title.');
            return;
        }

        if ((resourceType === 'YOUTUBE' || resourceType === 'LINK') && !url.trim()) {
            setNclexError('Please provide a valid URL for this resource.');
            return;
        }

        if ((resourceType === 'VIDEO_UPLOAD' || resourceType === 'PDF_UPLOAD') && !file) {
            setNclexError('Please upload a file for this resource.');
            return;
        }

        if (resourceType === 'ARTICLE' && !description.trim()) {
            setNclexError('Please add content or notes for the article resource.');
            return;
        }

        setAddingNclexResource(true);
        setNclexError(null);
        setNclexMessage(null);
        try {
            await addNclexCourseResource(selectedNclexCourse!.id, nclexResourceForm);
            setNclexResourceForm({ resourceType: 'YOUTUBE', title: '', description: '', url: '', file: null });
            setShowNclexResourceForm(false);
            setNclexMessage('Resource added successfully.');
            await loadNclexCourses();
            await refreshNclexCourse(selectedNclexCourse!.id);
        } catch (err: any) {
            setNclexError(`Failed to add NCLEX resource: ${err?.message || 'Unknown error'}`);
        } finally {
            setAddingNclexResource(false);
        }
    };

    const handleDeleteNclexResource = async (resourceId: string) => {
        setApprovingId(resourceId);
        setNclexError(null);
        setNclexMessage(null);
        try {
            await deleteNclexCourseResource(selectedNclexCourse!.id, resourceId);
            setNclexMessage('Resource removed successfully.');
            await loadNclexCourses();
            await refreshNclexCourse(selectedNclexCourse!.id);
        } catch (err: any) {
            setNclexError(`Failed to remove NCLEX resource: ${err?.message || 'Unknown error'}`);
        } finally {
            setApprovingId(null);
        }
    };

    const handleGenerateNclexQuestions = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneratingNclexQuestions(true);
        setNclexError(null);
        setNclexMessage(null);
        try {
            const result = await generateNclexQuestions(selectedNclexCourse!.id, { 
                questionCount,
                prompt: questionPrompt.trim() || undefined
            });
            const generatedQuestions = Array.isArray(result) ? result : ((result as any)?.questions ?? []);
            const successMessage = !Array.isArray(result) && (result as any)?.message
                ? (result as any).message
                : `Generated ${generatedQuestions.length} question${generatedQuestions.length === 1 ? '' : 's'} successfully.`;
            setNclexMessage(successMessage);
            await loadNclexCourses();
            await refreshNclexCourse(selectedNclexCourse!.id);
        } catch (err: any) {
            setNclexError(`Failed to generate NCLEX questions: ${err?.message || 'Unknown error'}`);
        } finally {
            setGeneratingNclexQuestions(false);
        }
    };

    const resetNclexQuestionForm = () => {
        setNclexQuestionForm({
            questionText: '',
            explanation: '',
            options: [
                { optionText: '', isCorrect: false },
                { optionText: '', isCorrect: false },
                { optionText: '', isCorrect: false },
                { optionText: '', isCorrect: false },
            ],
        });
        setEditingNclexQuestion(null);
    };

    const handleEditNclexQuestion = (question: NclexQuestion) => {
        setEditingNclexQuestion(question);
        setNclexQuestionForm({
            questionText: question.questionText,
            explanation: question.explanation || '',
            options: (question.options || []).map(opt => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect || false,
            })),
        });
        setShowNclexQuestionForm(true);
    };

    const handleSaveNclexQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNclexCourse) return;

        const { questionText, options } = nclexQuestionForm;
        if (!questionText.trim()) {
            setNclexError('Question text is required.');
            return;
        }

        const validOptions = options.filter(opt => opt.optionText.trim());
        if (validOptions.length < 2) {
            setNclexError('At least 2 options are required.');
            return;
        }

        const correctCount = validOptions.filter(opt => opt.isCorrect).length;
        if (correctCount !== 1) {
            setNclexError('Exactly one option must be marked as correct.');
            return;
        }

        setSavingNclexQuestion(true);
        setNclexError(null);
        setNclexMessage(null);

        try {
            const payload = {
                questionText: questionText.trim(),
                explanation: nclexQuestionForm.explanation.trim() || undefined,
                options: validOptions.map(opt => ({
                    optionText: opt.optionText.trim(),
                    isCorrect: opt.isCorrect,
                })),
            };

            if (editingNclexQuestion) {
                await updateNclexQuestion(selectedNclexCourse.id, editingNclexQuestion.id, payload);
                setNclexMessage('Question updated successfully.');
            } else {
                await createNclexQuestion(selectedNclexCourse.id, payload);
                setNclexMessage('Question created successfully.');
            }

            setShowNclexQuestionForm(false);
            resetNclexQuestionForm();
            await refreshNclexCourse(selectedNclexCourse.id);
        } catch (err: any) {
            setNclexError(`Failed to ${editingNclexQuestion ? 'update' : 'create'} question: ${err?.message || 'Unknown error'}`);
        } finally {
            setSavingNclexQuestion(false);
        }
    };

    const handleDeleteNclexQuestion = async (questionId: string) => {
        if (!selectedNclexCourse) return;

        setDeletingNclexQuestionId(questionId);
        setNclexError(null);
        setNclexMessage(null);

        try {
            await deleteNclexQuestion(selectedNclexCourse.id, questionId);
            setNclexMessage('Question deleted successfully.');
            setDeletingNclexQuestionId(null);
            await refreshNclexCourse(selectedNclexCourse.id);
        } catch (err: any) {
            setNclexError(`Failed to delete question: ${err?.message || 'Unknown error'}`);
            setDeletingNclexQuestionId(null);
        }
    };

    const renderNclexAdminPanel = () => {
        const selectedCourseResources = selectedNclexCourse?.resources ?? [];
        const selectedCourseQuestions = selectedNclexCourse?.questions ?? [];
        const selectedCourseQuestionCount = selectedCourseQuestions.length || selectedNclexCourse?.questionCount || 0;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">NCLEX Courses</h3>
                    <button
                        onClick={() => {
                            setSelectedNclexCourse(null);
                            setShowNclexCourseForm((prev) => !prev);
                            setNclexCourseForm({ title: '', description: '', status: 'DRAFT' });
                            setNclexError(null);
                            setNclexMessage(null);
                            setShowNclexResourceForm(false);
                        }}
                        className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
                    >
                        {showNclexCourseForm ? 'Close Form' : 'Create New Course'}
                    </button>
                </div>

                {showNclexCourseForm && (
                    <div className="border border-teal-200 rounded-2xl p-5 bg-teal-50">
                        <h4 className="text-md font-semibold text-teal-700 mb-3">New NCLEX Course</h4>
                        <form onSubmit={handleCreateNclexCourse} className="grid md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={nclexCourseForm.title}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Course title"
                                    required
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <select
                                    value={nclexCourseForm.status}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, status: e.target.value as NclexCourseStatus }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="ARCHIVED">Archived</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={nclexCourseForm.description}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    rows={3}
                                    placeholder="Outline what this NCLEX prep course covers"
                                    required
                                />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNclexCourseForm(false);
                                        setNclexCourseForm({ title: '', description: '', status: 'DRAFT' });
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCourse}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {savingCourse ? 'Creating...' : 'Create Course'}
                                </button>
                            </div>
                        </form>
                        {nclexError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {nclexError}
                            </div>
                        )}
                    </div>
                )}

                {nclexError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {nclexError}
                    </div>
                )}

                {nclexMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg">
                        {nclexMessage}
                    </div>
                )}

                {loadingNclex ? (
                    <div className="flex justify-center py-10"><Spinner size="md" color="teal" /></div>
                ) : nclexCourses.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No NCLEX courses found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resources</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {nclexCourses.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                                {course.title}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {course.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                course.status === 'DRAFT'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : course.status === 'PUBLISHED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {course.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {course.resources?.length ?? 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => handleSelectNclexCourse(course.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                View Resources
                                            </button>
                                            <button
                                                onClick={() => handleEditNclexCourse(course)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setShowNclexDeleteModal({ show: true, course })}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                            {course.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleUpdateNclexStatus(course, 'PUBLISHED')}
                                                    disabled={approvingId === course.id}
                                                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                >
                                                    Publish
                                                </button>
                                            )}
                                            {course.status === 'PUBLISHED' && (
                                                <button
                                                    onClick={() => handleUpdateNclexStatus(course, 'ARCHIVED')}
                                                    disabled={approvingId === course.id}
                                                    className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                                                >
                                                    Archive
                                                </button>
                                            )}
                                            {course.status === 'ARCHIVED' && (
                                                <button
                                                    onClick={() => handleUpdateNclexStatus(course, 'DRAFT')}
                                                    disabled={approvingId === course.id}
                                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                >
                                                    Restore to Draft
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedNclexCourse && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-sm">
                        <h4 className="text-md font-bold text-gray-800 mb-2">
                            {selectedNclexCourse.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            {selectedNclexCourse.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 justify-between mb-4">
                            <span className="text-sm text-gray-700">Status: <StatusBadge text={selectedNclexCourse.status} /></span>
                            <span className="text-sm text-gray-700">Resources: {selectedCourseResources.length}</span>
                            <span className="text-sm text-gray-700">Questions: {selectedCourseQuestionCount}</span>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-semibold text-gray-800">Resources</h5>
                            <button
                                onClick={() => {
                                    const next = !showNclexResourceForm;
                                    setShowNclexResourceForm(next);
                                    setNclexError(null);
                                    setNclexMessage(null);
                                    if (next) {
                                        setNclexResourceForm({ resourceType: 'YOUTUBE', title: '', description: '', url: '', file: null });
                                    }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-teal-500 text-teal-600 hover:bg-teal-50"
                            >
                                {showNclexResourceForm ? 'Close Resource Form' : 'Add Resource'}
                            </button>
                        </div>

                        {selectedCourseResources.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedCourseResources.map((resource) => (
                                            <tr key={resource.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {resource.resourceType}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                                        {resource.title}
                                                    </div>
                                                    {resource.description && (
                                                        <div className="text-sm text-gray-500">
                                                            {resource.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleDeleteNclexResource(resource.id)}
                                                        disabled={approvingId === resource.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No resources added for this course yet.</p>
                        )}

                        {showNclexResourceForm && (
                            <div className="mt-4 border border-teal-200 rounded-lg bg-white p-4">
                                <h6 className="text-sm font-semibold text-teal-700 mb-3">New Resource</h6>
                                <form onSubmit={handleAddNclexResource} className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                                        <select
                                            value={nclexResourceForm.resourceType}
                                            onChange={(e) => setNclexResourceForm(prev => ({ ...prev, resourceType: e.target.value as NclexResourceType, url: '', file: null }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="YOUTUBE">YouTube Video</option>
                                            <option value="VIDEO_UPLOAD">Upload Video</option>
                                            <option value="PDF_UPLOAD">Upload PDF</option>
                                            <option value="ARTICLE">Article / Notes</option>
                                            <option value="LINK">External Link</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={nclexResourceForm.title}
                                            onChange={(e) => setNclexResourceForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            placeholder="Enter resource title"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={nclexResourceForm.description}
                                            onChange={(e) => setNclexResourceForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 h-24"
                                            placeholder="Add a short description or summary"
                                        />
                                    </div>
                                    {(nclexResourceForm.resourceType === 'YOUTUBE' || nclexResourceForm.resourceType === 'LINK') && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Resource URL</label>
                                            <input
                                                type="url"
                                                value={nclexResourceForm.url}
                                                onChange={(e) => setNclexResourceForm(prev => ({ ...prev, url: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    )}
                                    {(nclexResourceForm.resourceType === 'VIDEO_UPLOAD' || nclexResourceForm.resourceType === 'PDF_UPLOAD') && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                                            <input
                                                type="file"
                                                accept={nclexResourceForm.resourceType === 'VIDEO_UPLOAD' ? 'video/*' : '.pdf'}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setNclexResourceForm(prev => ({ ...prev, file }));
                                                }}
                                                className="w-full"
                                            />
                                            {nclexResourceForm.file && (
                                                <p className="text-xs text-gray-500 mt-1">Selected: {nclexResourceForm.file.name}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="md:col-span-2 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowNclexResourceForm(false);
                                                setNclexResourceForm({ resourceType: 'YOUTUBE', title: '', description: '', url: '', file: null });
                                            }}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={addingNclexResource}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            {addingNclexResource ? 'Saving...' : 'Save Resource'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="mt-6">
                            <h5 className="text-sm font-semibold text-gray-800 mb-2">Generate Questions</h5>
                            <form onSubmit={handleGenerateNclexQuestions} className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                                        <input
                                            type="number"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                                            min="1"
                                            max="100"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prompt/Description (Optional)
                                        <span className="text-gray-500 text-xs font-normal ml-1">- Provide a custom prompt to guide question generation</span>
                                    </label>
                                    <textarea
                                        value={questionPrompt}
                                        onChange={(e) => setQuestionPrompt(e.target.value)}
                                        placeholder="Enter a description or prompt to guide the AI in generating questions. If left empty, the course description will be used."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={generatingNclexQuestions}
                                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
                                    >
                                        {generatingNclexQuestions ? 'Generating...' : 'Generate Questions'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-semibold text-gray-800">Question Bank</h5>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">Total {selectedCourseQuestionCount}</span>
                                    <button
                                        onClick={() => {
                                            resetNclexQuestionForm();
                                            setShowNclexQuestionForm(!showNclexQuestionForm);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-purple-500 text-purple-600 hover:bg-purple-50"
                                    >
                                        {showNclexQuestionForm ? 'Close Form' : 'Add Question'}
                                    </button>
                                </div>
                            </div>

                            {showNclexQuestionForm && (
                                <div className="mb-6 border border-purple-200 rounded-lg bg-white p-4">
                                    <h6 className="text-sm font-semibold text-purple-700 mb-3">
                                        {editingNclexQuestion ? 'Edit Question' : 'New Question'}
                                    </h6>
                                    <form onSubmit={handleSaveNclexQuestion} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                            <textarea
                                                value={nclexQuestionForm.questionText}
                                                onChange={(e) => setNclexQuestionForm(prev => ({ ...prev, questionText: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
                                                placeholder="Enter the question..."
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                                            <textarea
                                                value={nclexQuestionForm.explanation}
                                                onChange={(e) => setNclexQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                                                placeholder="Explain why the correct answer is right..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                                            <div className="space-y-2">
                                                {nclexQuestionForm.options.map((option, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={option.optionText}
                                                            onChange={(e) => {
                                                                const newOptions = [...nclexQuestionForm.options];
                                                                newOptions[index].optionText = e.target.value;
                                                                setNclexQuestionForm(prev => ({ ...prev, options: newOptions }));
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                                        />
                                                        <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                                                            <input
                                                                type="radio"
                                                                name="correctOption"
                                                                checked={option.isCorrect}
                                                                onChange={() => {
                                                                    const newOptions = nclexQuestionForm.options.map((opt, idx) => ({
                                                                        ...opt,
                                                                        isCorrect: idx === index,
                                                                    }));
                                                                    setNclexQuestionForm(prev => ({ ...prev, options: newOptions }));
                                                                }}
                                                                className="w-4 h-4 text-purple-600"
                                                            />
                                                            Correct
                                                        </label>
                                                        {nclexQuestionForm.options.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newOptions = nclexQuestionForm.options.filter((_, idx) => idx !== index);
                                                                    setNclexQuestionForm(prev => ({ ...prev, options: newOptions }));
                                                                }}
                                                                className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {nclexQuestionForm.options.length < 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNclexQuestionForm(prev => ({
                                                            ...prev,
                                                            options: [...prev.options, { optionText: '', isCorrect: false }],
                                                        }));
                                                    }}
                                                    className="mt-2 px-3 py-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-300 rounded-md"
                                                >
                                                    + Add Option
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowNclexQuestionForm(false);
                                                    resetNclexQuestionForm();
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingNclexQuestion}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                {savingNclexQuestion ? 'Saving...' : editingNclexQuestion ? 'Update Question' : 'Save Question'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            {loadingNclexDetail ? (
                                <div className="flex justify-center py-6"><Spinner size="sm" color="teal" /></div>
                            ) : selectedCourseQuestions.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedCourseQuestions.map((question, index) => (
                                        <div key={question.id} className="border border-gray-200 rounded-lg bg-white p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm font-semibold text-gray-800">Q{index + 1}. {question.questionText}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-indigo-600">{question.source === 'AI' ? 'AI Generated' : 'Manual'}</span>
                                                    <button
                                                        onClick={() => handleEditNclexQuestion(question)}
                                                        className="text-xs text-blue-600 hover:text-blue-900 px-2 py-1 border border-blue-300 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
                                                                handleDeleteNclexQuestion(question.id);
                                                            }
                                                        }}
                                                        disabled={deletingNclexQuestionId === question.id}
                                                        className="text-xs text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded disabled:opacity-50"
                                                    >
                                                        {deletingNclexQuestionId === question.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                            <ul className="mt-3 space-y-2">
                                                {question.options?.map((option, optionIndex) => {
                                                    const labelIndex = typeof option.orderIndex === 'number' ? option.orderIndex : optionIndex;
                                                    return (
                                                        <li
                                                            key={option.id}
                                                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border ${option.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                                                        >
                                                            <span className="font-medium">{String.fromCharCode(65 + labelIndex)}</span>
                                                            <span className="flex-1">{option.optionText}</span>
                                                            {option.isCorrect && <span className="text-xs font-semibold text-emerald-700">Correct</span>}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            {question.explanation && (
                                                <p className="mt-3 text-sm text-gray-700"><span className="font-semibold text-gray-800">Explanation:</span> {question.explanation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No questions generated for this course yet. Use the generator above to create AI-powered practice items.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center mt-8"><Spinner size="lg" color="teal" /></div>;
        if (error) return <p className="text-center text-red-500 mt-4">{error}</p>;

        switch(activeTab) {
            case 'PENDING_USERS':
                return pendingUsers.length > 0 ? (
                    <UserTable users={pendingUsers} onApprove={handleApprove} approvingId={approvingId} />
                ) : <p className="text-gray-500 text-center py-8">No pending user approvals.</p>;
            case 'ALL_USERS':
                return allUsers.length > 0 ? (
                    <AllUsersTable 
                        users={allUsers} 
                        onUpdateRole={handleUpdateUserRole}
                        onDeleteUser={handleDeleteUser}
                        onShowConfirmModal={setShowConfirmModal}
                        onViewProfile={handleViewProfile}
                        approvingId={approvingId}
                    />
                ) : <p className="text-gray-500 text-center py-8">No users found.</p>;
            case 'POSTS':
                return posts.length > 0 ? (
                    <PostsTable 
                        posts={posts} 
                        onDelete={handleDeletePost}
                        approvingId={approvingId}
                    />
                ) : <p className="text-gray-500 text-center py-8">No posts found.</p>;
            case 'RESOURCES':
                 return pendingResources.length > 0 ? (
                    <ResourceTable 
                        resources={pendingResources} 
                        onView={setViewingItem} 
                        onApprove={handleApprove}
                        onReject={(resource) => setShowRejectModal({show: true, type: 'resource', item: resource})}
                        onInactivate={handleInactivateResource}
                        onReactivate={handleReactivateResource}
                        approvingId={approvingId}
                    />
                ) : <p className="text-gray-500 text-center py-8">No resources found.</p>;
            case 'BLOGS':
                return pendingBlogs.length > 0 ? (
                    <BlogTable 
                        blogs={pendingBlogs} 
                        onView={setViewingItem} 
                        onApprove={handleApprove}
                        onReject={(blog) => setShowRejectModal({show: true, type: 'blog', item: blog})}
                        onInactivate={handleInactivateBlog}
                        onReactivate={handleReactivateBlog}
                        approvingId={approvingId}
                    />
                ) : <p className="text-gray-500 text-center py-8">No blogs found.</p>;
            case 'BROADCAST_MESSAGES':
                return <BroadcastMessagesTable 
                    messages={broadcastMessages} 
                    onCreateNew={() => {
                        resetBroadcastForm();
                        setShowBroadcastModal({show: true});
                    }}
                    onEdit={(message) => {
                        populateBroadcastForm(message);
                        setShowBroadcastModal({show: true, editing: message});
                    }}
                    onDelete={handleDeleteBroadcastMessage}
                    onToggleActive={handleToggleBroadcastMessage}
                    onToggleVisibility={handleToggleBroadcastVisibility}
                />;
            case 'FEEDBACKS':
                return <FeedbackTable 
                    feedbacks={feedbacks} 
                    onStatusUpdate={handleFeedbackStatusUpdate}
                    isUpdating={approvingId !== null}
                />;
            case 'PROMOTIONS':
                return (
                    <PromotionsTable
                        promotions={promotions}
                        onChangeStatus={handlePromotionStatusChange}
                        approvingId={approvingId}
                    />
                );
            case 'NEWSLETTERS':
                return (
                    <NewsletterPanel
                        draft={newsletterDraft}
                        loading={newsletterLoading}
                        sending={newsletterSending}
                        message={newsletterMessage}
                        error={error}
                        onGenerate={async () => {
                            setNewsletterMessage(null);
                            setError(null);
                            setNewsletterLoading(true);
                            try {
                                const draft = await generateNewsletter();
                                setNewsletterDraft(draft);
                            } catch (err: any) {
                                setError(err?.message || 'Failed to generate newsletter.');
                            } finally {
                                setNewsletterLoading(false);
                            }
                        }}
                        onChange={(updated) => {
                            setNewsletterDraft(updated);
                        }}
                        onSend={async () => {
                            if (!newsletterDraft) return;
                            setNewsletterSending(true);
                            setNewsletterMessage(null);
                            setError(null);
                            try {
                                const result = await sendNewsletter(newsletterDraft);
                                setNewsletterMessage(`Newsletter sent to ${result.recipients} of ${result.total} users.`);
                            } catch (err: any) {
                                setError(err?.message || 'Failed to send newsletter.');
                            } finally {
                                setNewsletterSending(false);
                            }
                        }}
                    />
                );
            case 'NCLEX':
                return renderNclexAdminPanel();
            default:
                return null;
        }
    }

    return (
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Admin Dashboard</h2>
            <div className="flex border-b mb-6">
                <TabButton title="Pending Users" count={pendingUsers.length} activeTab={activeTab} onClick={() => setActiveTab('PENDING_USERS')} />
                <TabButton title="All Users" count={allUsers.length} activeTab={activeTab} onClick={() => setActiveTab('ALL_USERS')} />
                <TabButton title="Posts" count={posts.length} activeTab={activeTab} onClick={() => setActiveTab('POSTS')} />
                <TabButton title="Resources" count={pendingResources.length} activeTab={activeTab} onClick={() => setActiveTab('RESOURCES')} />
                <TabButton title="Blogs" count={pendingBlogs.length} activeTab={activeTab} onClick={() => setActiveTab('BLOGS')} />
                <TabButton title="Broadcast Messages" count={broadcastMessages.length} activeTab={activeTab} onClick={() => setActiveTab('BROADCAST_MESSAGES')} />
                <TabButton title="Feedbacks" count={feedbacks.length} activeTab={activeTab} onClick={() => setActiveTab('FEEDBACKS')} />
                <TabButton title="Promotions" count={promotions.length} activeTab={activeTab} onClick={() => setActiveTab('PROMOTIONS')} />
                <TabButton title="Newsletters" count={0} activeTab={activeTab} onClick={() => setActiveTab('NEWSLETTERS')} />
                <TabButton title="NCLEX" count={nclexCourses.length} activeTab={activeTab} onClick={() => setActiveTab('NCLEX')} />
            </div>
            {renderContent()}
            
            {/* Rejection Reason Modal */}
            {showRejectModal.show && showRejectModal.item && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            Reject {showRejectModal.type === 'resource' ? 'Resource' : 'Blog'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting "{showRejectModal.item.title}":
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
                            rows={4}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex justify-end space-x-3 mt-6">
                            <button 
                                onClick={() => {
                                    setShowRejectModal({show: false, type: 'resource', item: null});
                                    setRejectionReason('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={showRejectModal.type === 'resource' ? handleRejectResource : handleRejectBlog}
                                disabled={!rejectionReason.trim() || approvingId === showRejectModal.item.id}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center w-24"
                            >
                                {approvingId === showRejectModal.item.id ? <Spinner /> : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NCLEX Edit Course Modal */}
            {showNclexEditModal.show && showNclexEditModal.course && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Edit NCLEX Course</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={nclexCourseForm.title}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Enter course title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={nclexCourseForm.description}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 h-32"
                                    placeholder="Enter course description"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={nclexCourseForm.status}
                                    onChange={(e) => setNclexCourseForm(prev => ({ ...prev, status: e.target.value as NclexCourseStatus }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="ARCHIVED">Archived</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowNclexEditModal({ show: false, course: null })}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNclexCourseEdit}
                                disabled={editingNclexCourse}
                                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center w-24"
                            >
                                {editingNclexCourse ? <Spinner /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NCLEX Delete Confirmation Modal */}
            {showNclexDeleteModal.show && showNclexDeleteModal.course && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Delete NCLEX Course</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete "{showNclexDeleteModal.course.title}"? This will permanently delete:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All course resources (videos, PDFs, etc.)</li>
                                <li>All questions and answers</li>
                                <li>All user enrollments and progress</li>
                                <li>All exam attempts</li>
                            </ul>
                            <strong className="text-red-600">This action cannot be undone.</strong>
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowNclexDeleteModal({ show: false, course: null })}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteNclexCourse}
                                disabled={deletingNclexCourse}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center w-24"
                            >
                                {deletingNclexCourse ? <Spinner /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirmation Modal */}
            {showConfirmModal.show && showConfirmModal.user && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            {showConfirmModal.type === 'delete' ? 'Delete User' : 'Change User Role'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {showConfirmModal.type === 'delete' 
                                ? `Are you sure you want to delete ${showConfirmModal.user.name}? This action cannot be undone.`
                                : `Are you sure you want to change ${showConfirmModal.user.name}'s role to ${showConfirmModal.newRole}?`
                            }
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowConfirmModal({show: false, type: 'delete', user: null})}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (showConfirmModal.type === 'delete') {
                                        handleDeleteUser(showConfirmModal.user!.id);
                                    } else if (showConfirmModal.newRole) {
                                        handleUpdateUserRole(showConfirmModal.user!.id, showConfirmModal.newRole);
                                    }
                                }}
                                disabled={approvingId === showConfirmModal.user!.id}
                                className={`px-4 py-2 text-white rounded-md font-semibold flex items-center justify-center w-24 ${
                                    showConfirmModal.type === 'delete' 
                                        ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300' 
                                        : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                                }`}
                            >
                                {approvingId === showConfirmModal.user!.id ? <Spinner /> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Broadcast Message Modal */}
            {showBroadcastModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            {showBroadcastModal.editing ? 'Edit Broadcast Message' : 'Create New Broadcast Message'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter message title..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Image Upload (Optional)</label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="image-upload"
                                        disabled={uploadingImage}
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className={`px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                                            uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {uploadingImage ? 'Uploading...' : 'Choose Image'}
                                    </label>
                                    {broadcastForm.imageUrl && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBroadcastForm(prev => ({ ...prev, imageUrl: '' }));
                                                setImagePreview(null);
                                                setImageFile(null);
                                            }}
                                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Upload a logo or advertisement image for your broadcast message</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                                    placeholder="Enter your message to all users..."
                                />
                            </div>
                            {(imagePreview || broadcastForm.imageUrl) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Preview</label>
                                    <img 
                                        src={imagePreview || (broadcastForm.imageUrl.startsWith('http') ? broadcastForm.imageUrl : `${getAbsoluteUrl(broadcastForm.imageUrl)}`)} 
                                        alt="Preview" 
                                        className="h-32 w-32 object-cover rounded-md border"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button 
                                onClick={() => {
                                    setShowBroadcastModal({show: false});
                                    resetBroadcastForm();
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={showBroadcastModal.editing ? handleUpdateBroadcastMessage : handleCreateBroadcastMessage}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
                            >
                                {showBroadcastModal.editing ? 'Update' : 'Create'} Message
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const TabButton: React.FC<{title: string, count: number, activeTab: string, onClick: () => void}> = ({ title, count, activeTab, onClick }) => {
    const isActive = activeTab === title.toUpperCase();
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm ${isActive ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            <span>{title}</span>
            {count > 0 && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
        </button>
    );
}

const UserTable: React.FC<{users: User[], onApprove: (id: string, type: 'USER') => void, approvingId: string | null}> = ({ users, onApprove, approvingId }) => (
    <TableWrapper headers={["User", "Email", "Status", "Action"]}>
        {users.map(user => (
            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">
                    <div className="flex items-center">
                        <img src={user.avatarUrl || "/avatar.jpg"} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                        <span>{user.name}</span>
                    </div>
                </td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4"><StatusBadge text={user.role} /></td>
                <td className="py-3 px-4"><ApproveButton id={user.id} onApprove={() => onApprove(user.id, 'USER')} approvingId={approvingId} /></td>
            </tr>
        ))}
    </TableWrapper>
);

const AllUsersTable: React.FC<{
    users: User[], 
    onUpdateRole: (userId: string, role: string) => void,
    onDeleteUser: (userId: string) => void,
    onShowConfirmModal: (modal: {show: boolean, type: 'delete' | 'role', user: User | null, newRole?: string}) => void,
    onViewProfile: (user: User) => void,
    approvingId: string | null
}> = ({ users, onUpdateRole, onDeleteUser, onShowConfirmModal, onViewProfile, approvingId }) => (
    <TableWrapper headers={["User", "Email", "Role", "Title", "Actions"]}>
        {users.map(user => (
            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">
                    <div className="flex items-center">
                        <img src={user.avatarUrl || "/avatar.jpg"} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                        <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.department || 'No department'}</div>
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4"><StatusBadge text={user.role} /></td>
                <td className="py-3 px-4">{user.title || 'No title'}</td>
                <td className="py-3 px-4">
                    <div className="flex space-x-2">
                        <ViewProfileButton 
                            user={user} 
                            onViewProfile={onViewProfile}
                        />
                        <RoleSelectButton 
                            user={user} 
                            onShowConfirmModal={onShowConfirmModal}
                            disabled={approvingId === user.id}
                        />
                        <DeleteButton 
                            user={user} 
                            onShowConfirmModal={onShowConfirmModal}
                            disabled={approvingId === user.id}
                        />
                    </div>
                </td>
            </tr>
        ))}
    </TableWrapper>
);

const ResourceTable: React.FC<{resources: Resource[], onView: (resource: Resource) => void, onApprove: (resourceId: string) => void, onReject: (resource: Resource) => void, onInactivate: (resourceId: string) => void, onReactivate: (resourceId: string) => void, approvingId: string | null}> = ({ resources, onView, onApprove, onReject, onInactivate, onReactivate, approvingId }) => (
    <TableWrapper headers={["Author", "Title", "Type", "Status", "Actions"]}>
        {resources.map(res => (
            <tr key={res.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">{res.author.name}</td>
                <td className="py-3 px-4">{res.title}</td>
                <td className="py-3 px-4">{res.type}</td>
                <td className="py-3 px-4">
                    <StatusBadge text={res.status} />
                    {res.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1">
                            Reason: {res.rejectionReason}
                        </div>
                    )}
                </td>
                <td className="py-3 px-4">
                    <div className="flex space-x-2">
                        <ViewButton onView={() => onView(res)} />
                        {res.status === 'PENDING' && (
                            <>
                                <button
                                    onClick={() => onApprove(res.id)}
                                    disabled={approvingId === res.id}
                                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => onReject(res)}
                                    disabled={approvingId === res.id}
                                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-300"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {(res.status === 'APPROVED' || res.status === 'REJECTED') && (
                            <button
                                onClick={() => onInactivate(res.id)}
                                disabled={approvingId === res.id}
                                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-gray-300"
                            >
                                Inactivate
                            </button>
                        )}
                        {res.status === 'INACTIVE' && (
                            <button
                                onClick={() => onReactivate(res.id)}
                                disabled={approvingId === res.id}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300"
                            >
                                Reactivate
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ))}
    </TableWrapper>
);

const BlogTable: React.FC<{blogs: Blog[], onView: (blog: Blog) => void, onApprove: (blogId: string) => void, onReject: (blog: Blog) => void, onInactivate: (blogId: string) => void, onReactivate: (blogId: string) => void, approvingId: string | null}> = ({ blogs, onView, onApprove, onReject, onInactivate, onReactivate, approvingId }) => (
     <TableWrapper headers={["Author", "Title", "Status", "Actions"]}>
        {blogs.map(blog => (
            <tr key={blog.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">{blog.author.name}</td>
                <td className="py-3 px-4">{blog.title}</td>
                <td className="py-3 px-4">
                    <StatusBadge text={blog.status} />
                    {blog.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1">
                            Reason: {blog.rejectionReason}
                        </div>
                    )}
                </td>
                <td className="py-3 px-4">
                    <div className="flex space-x-2">
                        <ViewButton onView={() => onView(blog)} />
                        {blog.status === 'PENDING' && (
                            <>
                                <button
                                    onClick={() => onApprove(blog.id)}
                                    disabled={approvingId === blog.id}
                                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => onReject(blog)}
                                    disabled={approvingId === blog.id}
                                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-300"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {(blog.status === 'APPROVED' || blog.status === 'REJECTED') && (
                            <button
                                onClick={() => onInactivate(blog.id)}
                                disabled={approvingId === blog.id}
                                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-gray-300"
                            >
                                Inactivate
                            </button>
                        )}
                        {blog.status === 'INACTIVE' && (
                            <button
                                onClick={() => onReactivate(blog.id)}
                                disabled={approvingId === blog.id}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300"
                            >
                                Reactivate
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ))}
    </TableWrapper>
);

const TableWrapper: React.FC<{headers: string[], children: React.ReactNode}> = ({ headers, children }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
                <tr>
                    {headers.map(h => <th key={h} className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">{h}</th>)}
                </tr>
            </thead>
            <tbody className="text-gray-700">{children}</tbody>
        </table>
    </div>
);

const ApproveButton: React.FC<{id: string, onApprove: () => void, approvingId: string | null}> = ({ id, onApprove, approvingId }) => (
    <button onClick={onApprove} disabled={approvingId === id} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 flex items-center justify-center w-28">
        {approvingId === id ? <Spinner /> : 'Approve'}
    </button>
);

const ViewButton: React.FC<{onView: () => void}> = ({ onView }) => (
     <button onClick={onView} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm font-semibold">
        View & Approve
    </button>
);

const StatusBadge: React.FC<{text: string}> = ({ text }) => {
    const getBadgeClasses = (status: string) => {
        switch (status) {
            case 'ADMIN': return 'bg-purple-200 text-purple-800';
            case 'NURSE': return 'bg-green-200 text-green-800';
            case 'PENDING': return 'bg-yellow-200 text-yellow-800';
            case 'APPROVED': return 'bg-green-200 text-green-800';
            case 'REJECTED': return 'bg-red-200 text-red-800';
            case 'INACTIVE': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };
    
    return (
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getBadgeClasses(text)}`}>
            {text}
        </span>
    );
};

const RoleSelectButton: React.FC<{
    user: User,
    onShowConfirmModal: (modal: {show: boolean, type: 'delete' | 'role', user: User | null, newRole?: string}) => void,
    disabled: boolean
}> = ({ user, onShowConfirmModal, disabled }) => {
    const handleRoleChange = (newRole: string) => {
        if (newRole !== user.role) {
            onShowConfirmModal({show: true, type: 'role', user, newRole});
        }
    };

    return (
        <select 
            value={user.role} 
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={disabled}
            className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
            <option value="NURSE">Nurse</option>
            <option value="ADMIN">Admin</option>
            <option value="INACTIVE">Inactive</option>
        </select>
    );
};

const ViewProfileButton: React.FC<{
    user: User,
    onViewProfile: (user: User) => void
}> = ({ user, onViewProfile }) => (
    <button 
        onClick={() => onViewProfile(user)}
        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs font-semibold"
    >
        View Profile
    </button>
);

const DeleteButton: React.FC<{
    user: User,
    onShowConfirmModal: (modal: {show: boolean, type: 'delete' | 'role', user: User | null, newRole?: string}) => void,
    disabled: boolean
}> = ({ user, onShowConfirmModal, disabled }) => (
    <button 
        onClick={() => onShowConfirmModal({show: true, type: 'delete', user})}
        disabled={disabled}
        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors disabled:bg-red-300 text-xs font-semibold"
    >
        Delete
    </button>
);

const PostsTable: React.FC<{ posts: Post[], onDelete: (postId: string) => void, approvingId: string | null }> = ({ posts, onDelete, approvingId }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {posts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <img 
                                        src={post.author.avatarUrl || '/avatar.jpg'} 
                                        alt={post.author.name} 
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {post.displayName || post.author.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {post.author.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {post.text}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                    {post.tags?.slice(0, 2).map(tag => (
                                        <span key={tag} className="inline-flex px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                    {post.tags && post.tags.length > 2 && (
                                        <span className="text-xs text-gray-500">+{post.tags.length - 2} more</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(post.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                    onClick={() => onDelete(post.id)}
                                    disabled={approvingId === post.id}
                                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    {approvingId === post.id ? 'Deleting...' : 'Delete'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FeedbackTable: React.FC<{ feedbacks: Feedback[], onStatusUpdate: (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void, isUpdating: boolean }> = ({ feedbacks, onStatusUpdate, isUpdating }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRatingStars = (rating: number) => {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    };

    if (feedbacks.length === 0) {
        return <p className="text-gray-500 text-center py-8">No feedback submitted yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {feedbacks.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <img 
                                        src={feedback.author?.avatarUrl || '/avatar.jpg'} 
                                        alt={feedback.author?.name || 'User'} 
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {feedback.author?.name || 'Unknown User'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {feedback.author?.title || 'Healthcare Professional'}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-yellow-400 text-lg">
                                    {getRatingStars(feedback.rating)}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {feedback.content}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(feedback.status)}`}>
                                    {feedback.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(feedback.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                {feedback.status !== 'APPROVED' && (
                                    <button
                                        onClick={() => onStatusUpdate(feedback.id, 'APPROVED')}
                                        disabled={isUpdating}
                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                )}
                                {feedback.status !== 'REJECTED' && (
                                    <button
                                        onClick={() => onStatusUpdate(feedback.id, 'REJECTED')}
                                        disabled={isUpdating}
                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                )}
                                {feedback.status !== 'PENDING' && (
                                    <button
                                        onClick={() => onStatusUpdate(feedback.id, 'PENDING')}
                                        disabled={isUpdating}
                                        className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                                    >
                                        Pending
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Broadcast Messages Table Component
const BroadcastMessagesTable: React.FC<{
    messages: BroadcastMessage[];
    onCreateNew: () => void;
    onEdit: (message: BroadcastMessage) => void;
    onDelete: (messageId: string) => void;
    onToggleActive: (messageId: string, isActive: boolean) => void;
    onToggleVisibility?: (messageId: string) => void;
}> = ({ messages, onCreateNew, onEdit, onDelete, onToggleActive, onToggleVisibility }) => {
    return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Broadcast Messages</h3>
            <button
                onClick={onCreateNew}
                    className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
            >
                Create New Message
            </button>
        </div>
        
        {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No broadcast messages found.</p>
        ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((message) => (
                                <tr key={message.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {message.imageUrl ? (
                                            <img 
                                                src={message.imageUrl.startsWith('http') ? message.imageUrl : getAbsoluteUrl(message.imageUrl) || message.imageUrl} 
                                                alt="Broadcast message" 
                                                className="h-16 w-16 object-cover rounded-md"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                                                <span className="text-gray-400 text-xs">No Image</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                            {message.title}
                                    </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 max-w-xs truncate">
                                            {message.message}
                                </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            message.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {message.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            message.isVisible 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {message.isVisible ? 'Visible' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(message.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => onEdit(message)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            Edit
                                        </button>
                                    <button
                                        onClick={() => onToggleActive(message.id, !message.isActive)}
                                            className={`${
                                            message.isActive
                                                    ? 'text-yellow-600 hover:text-yellow-900' 
                                                    : 'text-green-600 hover:text-green-900'
                                        }`}
                                    >
                                        {message.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                        {onToggleVisibility && (
                                    <button
                                                onClick={() => onToggleVisibility(message.id)}
                                                className={`${
                                                    message.isVisible 
                                                        ? 'text-red-600 hover:text-red-900' 
                                                        : 'text-blue-600 hover:text-blue-900'
                                                }`}
                                            >
                                                {message.isVisible ? 'Hide' : 'Show'}
                                    </button>
                                        )}
                                    <button
                                        onClick={() => onDelete(message.id)}
                                            className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                    </td>
                                </tr>
                    ))}
                        </tbody>
                    </table>
            </div>
        )}
    </div>
);
};

const PromotionsTable: React.FC<{
    promotions: Promotion[];
    onChangeStatus: (id: string, status: 'APPROVED' | 'REJECTED', options?: { durationDays?: number; isActive?: boolean }) => void;
    approvingId: string | null;
}> = ({ promotions, onChangeStatus, approvingId }) => {
    const [durationById, setDurationById] = React.useState<Record<string, number>>({});
    if (promotions.length === 0) {
        return <p className="text-gray-500 text-center py-8">No pending promotions.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Link</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Window</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {promotions.map((promo) => (
                        <tr key={promo.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex flex-col">
                                    <span className="font-semibold">
                                        {promo.business?.businessName || promo.business?.name || 'Unknown Business'}
                                    </span>
                                    {promo.business?.email && (
                                        <span className="text-xs text-gray-500">{promo.business.email}</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                                {promo.title}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                                {promo.description || <span className="text-gray-400 italic">No description</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600 underline max-w-xs truncate">
                                {promo.targetUrl ? (
                                    <a href={promo.targetUrl} target="_blank" rel="noopener noreferrer">
                                        {promo.targetUrl}
                                    </a>
                                ) : (
                                    <span className="text-gray-400 italic">No link</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                                <span
                                    className={
                                        promo.status === 'APPROVED'
                                            ? 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
                                            : promo.status === 'PENDING'
                                            ? 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800'
                                            : 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800'
                                    }
                                >
                                    {promo.status.toLowerCase()}
                                </span>
                                {promo.status === 'APPROVED' && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        {promo.isActive === false ? '(inactive)' : '(active)'}
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">
                                {promo.startAt || promo.endAt ? (
                                    <div className="space-y-0.5">
                                        {promo.startAt && <div>From: {new Date(promo.startAt).toLocaleDateString()}</div>}
                                        {promo.endAt && <div>To: {new Date(promo.endAt).toLocaleDateString()}</div>}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic">Not set</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 space-x-2">
                                {promo.status === 'PENDING' && (
                                    <>
                                        <input
                                            type="number"
                                            min={1}
                                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md mr-2"
                                            value={durationById[promo.id] ?? 30}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value, 10);
                                                setDurationById(prev => ({
                                                    ...prev,
                                                    [promo.id]: isNaN(value) ? 30 : value,
                                                }));
                                            }}
                                            title="Promotion duration in days"
                                        />
                                        <button
                                            onClick={() =>
                                                onChangeStatus(promo.id, 'APPROVED', {
                                                    durationDays: durationById[promo.id] ?? 30,
                                                    isActive: true,
                                                })
                                            }
                                            disabled={approvingId === promo.id}
                                            className="px-3 py-1 rounded-md text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 disabled:bg-teal-300"
                                        >
                                            {approvingId === promo.id ? 'Saving...' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => onChangeStatus(promo.id, 'REJECTED')}
                                            disabled={approvingId === promo.id}
                                            className="px-3 py-1 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300"
                                        >
                                            {approvingId === promo.id ? 'Saving...' : 'Reject'}
                                        </button>
                                    </>
                                )}
                                {promo.status === 'APPROVED' && (
                                    <button
                                        onClick={() => onChangeStatus(promo.id, 'APPROVED', { isActive: promo.isActive === false })}
                                        disabled={approvingId === promo.id}
                                        className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100"
                                    >
                                        {approvingId === promo.id
                                            ? 'Saving...'
                                            : promo.isActive === false
                                            ? 'Activate'
                                            : 'Inactivate'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const NewsletterPanel: React.FC<{
    draft: NewsletterDraft | null;
    loading: boolean;
    sending: boolean;
    message: string | null;
    error: string | null;
    onGenerate: () => void;
    onChange: (draft: NewsletterDraft) => void;
    onSend: () => void;
}> = ({ draft, loading, sending, message, error, onGenerate, onChange, onSend }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Weekly Health Newsletter</h3>
                    <p className="text-sm text-gray-600">
                        Use AI to draft a professional health update email, review it, and send to all users.
                    </p>
                </div>
                <button
                    onClick={onGenerate}
                    disabled={loading || sending}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-teal-300 font-semibold text-sm"
                >
                    {loading ? 'Generating...' : 'Generate Draft with AI'}
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                    {error}
                </div>
            )}
            {message && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                    {message}
                </div>
            )}

            {draft && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Subject
                            </label>
                            <input
                                type="text"
                                value={draft.subject}
                                onChange={(e) => onChange({ ...draft, subject: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Plain Text Fallback
                            </label>
                            <textarea
                                value={draft.textBody}
                                onChange={(e) => onChange({ ...draft, textBody: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <button
                            onClick={onSend}
                            disabled={sending}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 font-semibold text-sm"
                        >
                            {sending ? 'Sending...' : 'Send to All Users'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            HTML Preview
                        </label>
                        <div className="border border-gray-300 rounded-md overflow-hidden bg-gray-50 h-[480px]">
                            <iframe
                                title="Newsletter HTML Preview"
                                srcDoc={draft.htmlBody}
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;