import React from 'react';
import { Resource, ResourceType } from '../types';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Date not available';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString();
    } catch (error) {
        return 'Date not available';
    }
};

interface SingleResourceViewProps {
    resource: Resource;
    navigateTo: (view: 'RESOURCES') => void;
}

const ResourceIcon: React.FC<{ type: ResourceType }> = ({ type }) => {
    const iconWrapperClasses = "w-20 h-20 rounded-xl flex items-center justify-center mb-6 shadow-lg";
    const iconClasses = "w-10 h-10 text-white";

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


const SingleResourceView: React.FC<SingleResourceViewProps> = ({ resource, navigateTo }) => {
    return (
        <div className="max-w-3xl mx-auto">
             <button 
                onClick={() => navigateTo('RESOURCES')} 
                className="mb-6 flex items-center text-teal-600 hover:text-teal-800 font-medium"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Library
            </button>
            <div className="bg-white rounded-lg shadow-xl p-8 sm:p-12">
                <div className="flex justify-center">
                    <ResourceIcon type={resource.type} />
                </div>
                
                <h1 className="text-4xl text-center font-bold text-gray-800 mb-2">{resource.title}</h1>
                
                <div className="text-sm text-center text-gray-500 mb-8 border-b pb-6">
                    <span>Shared by <span className="font-semibold">{resource.author.name}</span></span>
                    <span className="mx-2">&middot;</span>
                    <span>{formatDate(resource.created_at)}</span>
                </div>
                
                {resource.description && (
                     <div 
                        className="text-gray-800 mb-8 max-w-2xl mx-auto resource-content"
                        dangerouslySetInnerHTML={{ __html: resource.description }}
                    />
                )}
                
                <div className="text-center">
                    {resource.type === ResourceType.LINK && resource.content && (
                        <a href={resource.content} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg text-lg font-semibold">
                            Open Link
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    )}
                    {resource.type === ResourceType.FILE && resource.file_url && (
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md hover:shadow-lg text-lg font-semibold">
                            Download File
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </a>
                    )}
                </div>
            </div>
             <style>{`
                .resource-content p,
                .resource-content li {
                    line-height: 1.75;
                }
                .resource-content ul, .resource-content ol {
                    padding-left: 1.5rem;
                    margin-bottom: 1.25rem;
                }
                .resource-content ul {
                    list-style-type: disc;
                }
                .resource-content ol {
                    list-style-type: decimal;
                }
                .resource-content a {
                    color: #0d9488; /* tailwind teal-600 */
                    text-decoration: underline;
                }
                .resource-content a:hover {
                    color: #0f766e; /* tailwind teal-700 */
                }
                .resource-content h1, .resource-content h2, .resource-content h3 {
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    margin-top: 1.5rem;
                    line-height: 1.2;
                }
                .resource-content h1 { font-size: 1.875rem; }
                .resource-content h2 { font-size: 1.5rem; }
                .resource-content h3 { font-size: 1.25rem; }
                 .resource-content strong { font-weight: 700; }
                .resource-content em { font-style: italic; }
            `}</style>
        </div>
    );
};

export default SingleResourceView;