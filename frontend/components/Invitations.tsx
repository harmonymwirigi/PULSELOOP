import React, { useState, useEffect, useCallback } from 'react';
import { getSentInvitations } from '../services/mockApi';
import { Invitation, InvitationStatus } from '../types';
import Spinner from './Spinner';

interface InvitationsProps {
    openInviteModal: () => void;
}

const Invitations: React.FC<InvitationsProps> = ({ openInviteModal }) => {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvitations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedInvitations = await getSentInvitations();
            setInvitations(fetchedInvitations);
        } catch (err) {
            setError('Failed to fetch your invitations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const StatusBadge: React.FC<{ status: InvitationStatus }> = ({ status }) => {
        const baseClasses = "text-xs font-medium px-2.5 py-0.5 rounded-full";
        const statusClasses = {
            PENDING: "bg-yellow-200 text-yellow-800",
            ACCEPTED: "bg-green-200 text-green-800",
        };
        return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
    };

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center py-16"><Spinner size="lg" color="teal" /></div>;
        }
        if (error) {
            return <p className="text-center text-red-500 py-16">{error}</p>;
        }
        if (invitations.length === 0) {
            return (
                <div className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations sent</h3>
                    <p className="mt-1 text-sm text-gray-500">You haven't invited anyone yet.</p>
                    <div className="mt-6">
                        <button type="button" onClick={openInviteModal} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                           <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                            Invite a Colleague
                        </button>
                    </div>
                </div>
            );
        }
        return (
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Invited</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sent</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invitations.map((invite) => (
                            <tr key={invite.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invite.invitee_email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invite.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <StatusBadge status={invite.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">My Invitations</h1>
                    <p className="text-gray-500 mt-1">Track the status of colleagues you've invited.</p>
                </div>
                <button 
                    onClick={openInviteModal}
                    className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    <span>Invite</span>
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default Invitations;
