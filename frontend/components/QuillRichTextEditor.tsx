import React, { useEffect, useRef, useState, useCallback } from 'react';
import { uploadMedia } from '../services/mockApi';

interface QuillRichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: string;
    readOnly?: boolean;
}

declare global {
    interface Window {
        Quill: any;
    }
}

// Global registry to track initialized editors
const editorRegistry = new Set<string>();

const QuillRichTextEditor: React.FC<QuillRichTextEditorProps> = ({
    content,
    onChange,
    placeholder = "Start writing your content...",
    height = "400px",
    readOnly = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const editorIdRef = useRef<string>('');

    const handleImageUpload = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                await uploadMediaFile(file, 'image');
            }
        };
    }, []);

    const handleVideoUpload = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                await uploadMediaFile(file, 'video');
            }
        };
    }, []);

    const uploadMediaFile = useCallback(async (file: File, type: 'image' | 'video') => {
        setIsUploading(true);
        try {
            const response = await uploadMedia(file);
            const mediaUrl = response.imageUrl;
            
            // Ensure we have the full URL
            const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:5000${mediaUrl}`;
            
            // Get current cursor position or default to end
            let range = quillRef.current?.getSelection();
            if (!range) {
                // If no selection, place at the end of the content
                range = { index: quillRef.current?.getLength() || 0, length: 0 };
            }
            
            if (type === 'image') {
                quillRef.current?.insertEmbed(range.index, 'image', fullUrl);
                quillRef.current?.setSelection(range.index + 1);
            } else {
                // For video, we'll insert as HTML since Quill doesn't have native video embed
                const videoHtml = `<video controls style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><source src="${fullUrl}" type="video/${file.type.split('/')[1]}">Your browser does not support the video tag.</video>`;
                quillRef.current?.clipboard.dangerouslyPasteHTML(range.index, videoHtml);
                quillRef.current?.setSelection(range.index + 1);
            }
        } catch (error) {
            console.error('Failed to upload media:', error);
            alert('Failed to upload media. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, []);

    useEffect(() => {
        if (!window.Quill) {
            console.error('Quill.js is not loaded');
            return;
        }

        if (!editorRef.current || quillRef.current || isReady) {
            return;
        }

        // Create a unique ID for this editor instance
        const editorId = `quill-editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        editorIdRef.current = editorId;

        // Check if this editor is already in the registry
        if (editorRegistry.has(editorId)) {
            console.warn('Editor already exists in registry:', editorId);
            return;
        }

        // Add to registry immediately to prevent duplicates
        editorRegistry.add(editorId);
        
        // Clear the container completely and remove any existing Quill elements
        const container = editorRef.current;
        container.innerHTML = '';
        container.id = editorId;

        // Remove any existing Quill toolbars from the parent
        const parent = container.parentElement;
        if (parent) {
            const existingToolbars = parent.querySelectorAll('.ql-toolbar');
            existingToolbars.forEach(toolbar => {
                if (toolbar.parentElement === parent) {
                    toolbar.remove();
                }
            });
        }

        // Configure Quill with comprehensive toolbar
        const toolbarOptions = [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
        ];

        try {
            // Initialize Quill
            quillRef.current = new window.Quill(container, {
                theme: 'snow',
                placeholder: placeholder,
                readOnly: readOnly,
                modules: {
                    toolbar: {
                        container: toolbarOptions,
                        handlers: {
                            image: handleImageUpload,
                            video: handleVideoUpload
                        }
                    },
                    keyboard: {
                        bindings: {
                            tab: {
                                key: 9,
                                handler: function() {
                                    const range = quillRef.current?.getSelection();
                                    if (range) {
                                        quillRef.current.insertText(range.index, '\t');
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Set initial content
            if (content && content.trim()) {
                quillRef.current.root.innerHTML = content;
            }

            // Listen for text changes
            quillRef.current.on('text-change', () => {
                if (quillRef.current) {
                    const html = quillRef.current.root.innerHTML;
                    onChange(html);
                }
            });

            setIsReady(true);
            console.log('Quill editor initialized successfully:', editorId);
        } catch (error) {
            console.error('Failed to initialize Quill:', error);
            editorRegistry.delete(editorId);
        }

        return () => {
            if (quillRef.current) {
                try {
                    const id = editorIdRef.current;
                    if (id) {
                        editorRegistry.delete(id);
                    }
                    quillRef.current = null;
                } catch (e) {
                    console.warn('Error cleaning up Quill:', e);
                }
                setIsReady(false);
            }
        };
    }, []); // Empty dependency array to run only once

    // Update content when prop changes
    useEffect(() => {
        if (quillRef.current && isReady && content !== quillRef.current.root.innerHTML) {
            quillRef.current.root.innerHTML = content;
        }
    }, [content, isReady]);


    // Custom styles for the editor
    const editorStyles = `
        .ql-editor {
            min-height: ${height};
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
        }
        .ql-toolbar {
            border-top: 1px solid #ccc;
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            border-radius: 8px 8px 0 0;
        }
        .ql-container {
            border-bottom: 1px solid #ccc;
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            border-radius: 0 0 8px 8px;
            font-size: 14px;
        }
        .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
        }
        .ql-snow .ql-picker {
            color: #374151;
        }
        .ql-snow .ql-stroke {
            stroke: #374151;
        }
        .ql-snow .ql-fill {
            fill: #374151;
        }
        .ql-snow .ql-picker-options {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .ql-snow .ql-picker-item:hover {
            background-color: #f3f4f6;
        }
        .ql-snow .ql-tooltip {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .ql-snow .ql-tooltip input[type=text] {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 4px 8px;
        }
        .ql-snow .ql-tooltip a.ql-preview {
            color: #14b8a6;
        }
        .ql-snow .ql-tooltip a.ql-action::after {
            color: #14b8a6;
        }
        .ql-snow .ql-tooltip a.ql-remove::after {
            color: #ef4444;
        }
        .ql-editor img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin: 10px 0;
        }
        .ql-editor video {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin: 10px 0;
        }
        .ql-editor blockquote {
            border-left: 4px solid #14b8a6;
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            font-style: italic;
            color: #6b7280;
            background-color: #f9fafb;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
        }
        .ql-editor pre.ql-syntax {
            background-color: #1f2937;
            color: #f9fafb;
            border-radius: 8px;
            padding: 1rem;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
        }
        .ql-editor h1 {
            font-size: 2.25rem;
            font-weight: 700;
            color: #1f2937;
            margin: 1.5rem 0 1rem 0;
        }
        .ql-editor h2 {
            font-size: 1.875rem;
            font-weight: 700;
            color: #1f2937;
            margin: 1.25rem 0 0.75rem 0;
        }
        .ql-editor h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 1rem 0 0.5rem 0;
        }
        .ql-editor h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0.75rem 0 0.5rem 0;
        }
        .ql-editor h5 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0.5rem 0;
        }
        .ql-editor h6 {
            font-size: 1rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0.5rem 0;
        }
        .ql-editor ul, .ql-editor ol {
            padding-left: 1.5rem;
        }
        .ql-editor li {
            margin: 0.25rem 0;
        }
        .ql-editor a {
            color: #14b8a6;
            text-decoration: underline;
        }
        .ql-editor a:hover {
            color: #0d9488;
        }
        .ql-editor table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .ql-editor table td, .ql-editor table th {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        .ql-editor table th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        .ql-editor table tr:nth-child(even) {
            background-color: #f9fafb;
        }
    `;

    // Additional cleanup effect to remove any orphaned toolbars
    useEffect(() => {
        const cleanupOrphanedToolbars = () => {
            if (editorRef.current) {
                const container = editorRef.current;
                const parent = container.parentElement;
                
                if (parent) {
                    // Find all toolbars that don't belong to this editor
                    const allToolbars = parent.querySelectorAll('.ql-toolbar');
                    const allContainers = parent.querySelectorAll('.ql-container');
                    
                    // Remove toolbars that don't have a corresponding container
                    allToolbars.forEach(toolbar => {
                        const nextElement = toolbar.nextElementSibling;
                        if (!nextElement || !nextElement.classList.contains('ql-container')) {
                            toolbar.remove();
                        }
                    });
                }
            }
        };

        // Clean up immediately
        cleanupOrphanedToolbars();

        // Clean up after a short delay to catch any late-rendered duplicates
        const timeoutId = setTimeout(cleanupOrphanedToolbars, 100);

        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="w-full">
            <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
            {isUploading && (
                <div className="mb-2 flex items-center text-blue-600 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Uploading media...
                </div>
            )}
            <div ref={editorRef} style={{ height: height }} />
        </div>
    );
};

export default QuillRichTextEditor;
