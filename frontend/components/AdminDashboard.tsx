import React, { useState, useEffect, useCallback } from 'react';
import { getPendingUsers, approveUser, getAllUsers, updateUserRole, deleteUser, getPendingResources, approveResource, getPendingBlogs, approveBlog, getAllBroadcastMessages, createBroadcastMessage, updateBroadcastMessage, deleteBroadcastMessage } from '../services/mockApi';
import { User, Resource, Blog, BroadcastMessage } from '../types';
import Spinner from './Spinner';
import ApprovalDetailView from './ApprovalDetailView';

type Tab = 'PENDING_USERS' | 'ALL_USERS' | 'RESOURCES' | 'BLOGS' | 'BROADCAST_MESSAGES';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('PENDING_USERS');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [pendingResources, setPendingResources] = useState<Resource[]>([]);
    const [pendingBlogs, setPendingBlogs] = useState<Blog[]>([]);
    const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [viewingItem, setViewingItem] = useState<Resource | Blog | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<{show: boolean, type: 'delete' | 'role', user: User | null, newRole?: string}>({show: false, type: 'delete', user: null});
    const [showBroadcastModal, setShowBroadcastModal] = useState<{show: boolean, editing?: BroadcastMessage}>({show: false});
    const [broadcastForm, setBroadcastForm] = useState<{title: string, message: string}>({title: '', message: ''});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingUsersData, allUsersData, resources, blogs, broadcastData] = await Promise.all([
                getPendingUsers(),
                getAllUsers(),
                getPendingResources(),
                getPendingBlogs(),
                getAllBroadcastMessages()
            ]);
            setPendingUsers(pendingUsersData);
            setAllUsers(allUsersData);
            setPendingResources(resources);
            setPendingBlogs(blogs);
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
            setBroadcastForm({title: '', message: ''});
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
            setBroadcastForm({title: '', message: ''});
            setShowBroadcastModal({show: false});
            fetchData();
        } catch (err) {
            setError('Failed to update broadcast message');
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
            case 'RESOURCES':
                 return pendingResources.length > 0 ? (
                    <ResourceTable resources={pendingResources} onView={setViewingItem} />
                ) : <p className="text-gray-500 text-center py-8">No pending resource approvals.</p>;
            case 'BLOGS':
                return pendingBlogs.length > 0 ? (
                    <BlogTable blogs={pendingBlogs} onView={setViewingItem} />
                ) : <p className="text-gray-500 text-center py-8">No pending blog approvals.</p>;
            case 'BROADCAST_MESSAGES':
                return <BroadcastMessagesTable 
                    messages={broadcastMessages} 
                    onCreateNew={() => setShowBroadcastModal({show: true})}
                    onEdit={(message) => setShowBroadcastModal({show: true, editing: message})}
                    onDelete={handleDeleteBroadcastMessage}
                    onToggleActive={handleToggleBroadcastMessage}
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
                <TabButton title="Resources" count={pendingResources.length} activeTab={activeTab} onClick={() => setActiveTab('RESOURCES')} />
                <TabButton title="Blogs" count={pendingBlogs.length} activeTab={activeTab} onClick={() => setActiveTab('BLOGS')} />
                <TabButton title="Broadcast Messages" count={broadcastMessages.length} activeTab={activeTab} onClick={() => setActiveTab('BROADCAST_MESSAGES')} />
            </div>
            {renderContent()}
            
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                                    placeholder="Enter your message to all users..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button 
                                onClick={() => {
                                    setShowBroadcastModal({show: false});
                                    setBroadcastForm({title: '', message: ''});
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

const ResourceTable: React.FC<{resources: Resource[], onView: (resource: Resource) => void}> = ({ resources, onView }) => (
    <TableWrapper headers={["Author", "Title", "Type", "Status", "Action"]}>
        {resources.map(res => (
            <tr key={res.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">{res.author.name}</td>
                <td className="py-3 px-4">{res.title}</td>
                <td className="py-3 px-4">{res.type}</td>
                <td className="py-3 px-4"><StatusBadge text={res.status} /></td>
                <td className="py-3 px-4"><ViewButton onView={() => onView(res)} /></td>
            </tr>
        ))}
    </TableWrapper>
);

const BlogTable: React.FC<{blogs: Blog[], onView: (blog: Blog) => void}> = ({ blogs, onView }) => (
     <TableWrapper headers={["Author", "Title", "Status", "Action"]}>
        {blogs.map(blog => (
            <tr key={blog.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">{blog.author.name}</td>
                <td className="py-3 px-4">{blog.title}</td>
                <td className="py-3 px-4"><StatusBadge text={blog.status} /></td>
                <td className="py-3 px-4"><ViewButton onView={() => onView(blog)} /></td>
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
    const getBadgeClasses = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-200 text-purple-800';
            case 'NURSE': return 'bg-green-200 text-green-800';
            case 'PENDING': return 'bg-yellow-200 text-yellow-800';
            case 'INACTIVE': return 'bg-red-200 text-red-800';
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

const BroadcastMessagesTable: React.FC<{
    messages: BroadcastMessage[];
    onCreateNew: () => void;
    onEdit: (message: BroadcastMessage) => void;
    onDelete: (messageId: string) => void;
    onToggleActive: (messageId: string, isActive: boolean) => void;
}> = ({ messages, onCreateNew, onEdit, onDelete, onToggleActive }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Broadcast Messages</h3>
            <button
                onClick={onCreateNew}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-semibold"
            >
                Create New Message
            </button>
        </div>
        
        {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No broadcast messages found.</p>
        ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {messages.map((message) => (
                        <li key={message.id} className={`px-6 py-4 ${message.isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h4 className="text-sm font-medium text-gray-900">{message.title}</h4>
                                        {message.isActive && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{message.message}</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Created: {new Date(message.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onToggleActive(message.id, !message.isActive)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                                            message.isActive
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                        {message.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => onEdit(message)}
                                        className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(message.id)}
                                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

export default AdminDashboard;