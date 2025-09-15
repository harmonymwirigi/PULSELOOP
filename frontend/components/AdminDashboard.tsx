import React, { useState, useEffect, useCallback } from 'react';
import { getPendingUsers, approveUser, getAllUsers, updateUserRole, deleteUser, getPendingResources, approveResource, rejectResource, inactivateResource, reactivateResource, getPendingBlogs, approveBlog, rejectBlog, inactivateBlog, reactivateBlog, getAllBroadcastMessages, createBroadcastMessage, updateBroadcastMessage, deleteBroadcastMessage, toggleBroadcastMessageVisibility, getAllFeedbacks, updateFeedbackStatus, uploadImage, getAllPosts, adminDeletePost, getAllResources, getAllBlogs } from '../services/mockApi';
import { User, Resource, Blog, BroadcastMessage, Feedback, Post } from '../types';
import Spinner from './Spinner';
import ApprovalDetailView from './ApprovalDetailView';

type Tab = 'PENDING_USERS' | 'ALL_USERS' | 'POSTS' | 'RESOURCES' | 'BLOGS' | 'BROADCAST_MESSAGES' | 'FEEDBACKS';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('PENDING_USERS');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [pendingResources, setPendingResources] = useState<Resource[]>([]);
    const [pendingBlogs, setPendingBlogs] = useState<Blog[]>([]);
    const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingUsersData, allUsersData, postsData, resources, blogs, broadcastData, feedbacksData] = await Promise.all([
                getPendingUsers(),
                getAllUsers(),
                getAllPosts(),
                getAllResources(),
                getAllBlogs(),
                getAllBroadcastMessages(),
                getAllFeedbacks()
            ]);
            setPendingUsers(pendingUsersData);
            setAllUsers(allUsersData);
            setPosts(postsData);
            setPendingResources(resources);
            setPendingBlogs(blogs);
            setBroadcastMessages(broadcastData);
            setFeedbacks(feedbacksData);
        } catch (err) {
            setError(`Failed to fetch data.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            } else if (type === 'BLOG') {
                await approveBlog(id);
                setPendingBlogs(prev => prev.filter(item => item.id !== id));
            }
            setViewingItem(null); // Return to list view after approval
        } catch (err) {
            setError(`Failed to approve item.`);
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

    const populateBroadcastForm = (message: BroadcastMessage) => {
        setBroadcastForm({
            title: message.title,
            message: message.message,
            imageUrl: message.imageUrl || ''
        });
        setImagePreview(message.imageUrl || null);
        setImageFile(null);
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
                                        src={imagePreview || (broadcastForm.imageUrl.startsWith('http') ? broadcastForm.imageUrl : `http://localhost:5000${broadcastForm.imageUrl}`)} 
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
    approvingId: string | null
}> = ({ users, onUpdateRole, onDeleteUser, onShowConfirmModal, approvingId }) => (
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
                                                src={message.imageUrl.startsWith('http') ? message.imageUrl : `http://localhost:5000${message.imageUrl}`} 
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

export default AdminDashboard;