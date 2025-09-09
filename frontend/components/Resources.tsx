import React, { useState, useEffect, useCallback } from 'react';
import { getResources, createResource } from '../services/mockApi';
import { Resource, ResourceType, CreateResourceData } from '../types';
import Spinner from './Spinner';
import RichTextEditor from './RichTextEditor';

interface ResourcesProps {
    navigateToResource: (resource: Resource) => void;
}

const Resources: React.FC<ResourcesProps> = ({ navigateToResource }) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const fetchResources = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedResources = await getResources();
            setResources(fetchedResources);
        } catch (err) {
            setError('Failed to fetch resources.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleCreateResource = async (data: CreateResourceData) => {
        try {
            await createResource(data);
            setShowForm(false);
            fetchResources(); // Refresh list
        } catch (err: any)
{
            setError(err.message || 'Failed to create resource.');
        }
    };
    
    if (loading) {
        return <div className="flex justify-center mt-16"><Spinner size="lg" color="teal"/></div>;
    }

    if (error) {
        return <p className="text-center text-red-500 mt-8">{error}</p>;
    }

    return (
        <div className="max-w-6xl mx-auto">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800">Knowledge Library</h1>
                    <p className="text-gray-500 mt-1">Your professional hub for shared files and links.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    <span>{showForm ? 'Cancel' : 'Share Resource'}</span>
                </button>
            </div>

            {showForm && <CreateResourceForm onCreate={handleCreateResource} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} onNavigate={navigateToResource} />
                ))}
            </div>
        </div>
    );
};

const ResourceIcon: React.FC<{ type: ResourceType }> = ({ type }) => {
    const iconWrapperClasses = "w-12 h-12 rounded-lg flex items-center justify-center mb-4";
    const iconClasses = "w-6 h-6 text-white";

    if (type === ResourceType.LINK) {
        return (
            <div className={`${iconWrapperClasses} bg-blue-500`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
        );
    }
    
    return (
        <div className={`${iconWrapperClasses} bg-green-500`}>
             <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
    );
};

interface ResourceCardProps {
    resource: Resource;
    onNavigate: (resource: Resource) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onNavigate }) => {
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };
    const plainTextDescription = resource.description ? stripHtml(resource.description) : '';
    const previewDescription = plainTextDescription.substring(0, 100);

    return (
        <div 
            onClick={() => onNavigate(resource)} 
            className="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
        >
            <ResourceIcon type={resource.type} />
            <div className="flex-grow">
                <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-teal-600 transition-colors">{resource.title}</h3>
                {resource.description && <p className="text-sm text-gray-600 leading-relaxed h-12 overflow-hidden">{previewDescription}{plainTextDescription.length > 100 ? '...' : ''}</p>}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-4 text-xs text-gray-400">
                <p>Shared by <span className="font-medium text-gray-500">{resource.author.name}</span></p>
            </div>
        </div>
    );
};

const CreateResourceForm: React.FC<{ onCreate: (data: CreateResourceData) => Promise<void> }> = ({ onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ResourceType>(ResourceType.LINK);
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const data: CreateResourceData = { title, description, type };
        if (type === ResourceType.LINK) data.content = content;
        if (type === ResourceType.FILE) data.file = file || undefined;
        await onCreate(data);
        setLoading(false);
    };
    
    return (
         <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Share a New Resource</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="res-title" className="block text-sm font-medium text-gray-700 mb-1">Resource Title</label>
                    <input type="text" id="res-title" placeholder="e.g., New Cardiology Study" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="Provide some context for this resource..."
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Resource Type</label>
                    <div className="flex space-x-4">
                        <label className={`flex items-center p-3 border rounded-md cursor-pointer w-full ${type === ResourceType.LINK ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-300'}`}>
                            <input type="radio" name="type" value={ResourceType.LINK} checked={type === ResourceType.LINK} onChange={() => setType(ResourceType.LINK)} className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300" />
                            <span className="ml-3 text-sm font-medium text-gray-900">Link</span>
                        </label>
                         <label className={`flex items-center p-3 border rounded-md cursor-pointer w-full ${type === ResourceType.FILE ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-300'}`}>
                            <input type="radio" name="type" value={ResourceType.FILE} checked={type === ResourceType.FILE} onChange={() => setType(ResourceType.FILE)} className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300" />
                            <span className="ml-3 text-sm font-medium text-gray-900">File</span>
                        </label>
                    </div>
                </div>

                {type === ResourceType.LINK && <input type="url" placeholder="https://example.com" value={content} onChange={e => setContent(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />}
                {type === ResourceType.FILE && <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" required />}
                
                <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 font-semibold">
                        {loading ? <Spinner /> : 'Submit for Approval'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Resources;