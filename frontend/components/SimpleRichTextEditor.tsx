import React, { useState, useRef, useEffect } from 'react';
import { uploadMedia } from '../services/mockApi';

interface SimpleRichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: string;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
    content,
    onChange,
    placeholder = "Start writing your content...",
    height = "400px"
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'youtube'>('image');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && !isInitialized) {
            editorRef.current.innerHTML = content || '';
            setIsInitialized(true);
        }
    }, [content, isInitialized]);

    // Handle external content changes (like from toolbar)
    useEffect(() => {
        if (editorRef.current && isInitialized && content !== editorRef.current.innerHTML) {
            // Only update if the content is significantly different (e.g., from external changes)
            const currentContent = editorRef.current.innerHTML;
            const isSignificantChange = Math.abs(content.length - currentContent.length) > 10 || 
                                     content.includes('<img') !== currentContent.includes('<img') ||
                                     content.includes('<video') !== currentContent.includes('<video');
            
            if (isSignificantChange) {
                const selection = window.getSelection();
                const range = selection?.getRangeAt(0);
                const cursorPosition = range?.startOffset || 0;
                
                editorRef.current.innerHTML = content;
                
                // Restore cursor position
                if (selection && range) {
                    try {
                        const newRange = document.createRange();
                        const textNode = editorRef.current.firstChild;
                        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                            newRange.setStart(textNode, Math.min(cursorPosition, textNode.textContent?.length || 0));
                            newRange.setEnd(textNode, Math.min(cursorPosition, textNode.textContent?.length || 0));
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    } catch (e) {
                        // Fallback: place cursor at end
                        const range = document.createRange();
                        range.selectNodeContents(editorRef.current);
                        range.collapse(false);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                    }
                }
            }
        }
    }, [content, isInitialized]);

    const execCommand = (command: string, value?: string) => {
        if (!editorRef.current) {
            console.log('No editor ref');
            return false;
        }
        
        console.log(`Executing command: ${command} with value: ${value}`);
        
        // Focus the editor first
        editorRef.current.focus();
        
        // Ensure the editor is focused and has selection
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            console.log('No selection, creating one');
            // If no selection, place cursor at the end
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        
        // Special handling for formatBlock
        if (command === 'formatBlock') {
            // For formatBlock, we need to ensure we have a proper selection
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                // If cursor is collapsed, select the current paragraph or create one
                const container = range.commonAncestorContainer;
                let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                
                // Find the block element (p, div, h1, etc.)
                while (element && element !== editorRef.current) {
                    if (element instanceof HTMLElement && 
                        (element.tagName === 'P' || element.tagName === 'DIV' || 
                         element.tagName.match(/^H[1-6]$/) || element.tagName === 'LI')) {
                        break;
                    }
                    element = element.parentElement;
                }
                
                if (element && element !== editorRef.current) {
                    range.selectNodeContents(element);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
            }
        }
        
        // Execute the command
        const success = document.execCommand(command, false, value);
        console.log(`Command ${command} success: ${success}`);
        
        // Force focus back to editor
        editorRef.current.focus();
        
        // Update content after a small delay to ensure command is processed
        setTimeout(() => {
            if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
            }
        }, 10);
        
        return success;
    };

    const toggleFormat = (command: string) => {
        // For basic formatting commands, just execute them
        // execCommand handles toggling automatically for bold, italic, underline, etc.
        execCommand(command);
    };

    const insertImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                await uploadMediaFile(file, 'image');
            }
        };
        input.click();
    };

    const insertVideo = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                await uploadMediaFile(file, 'video');
            }
        };
        input.click();
    };

    const insertYouTube = () => {
        setMediaType('youtube');
        setShowMediaModal(true);
    };

    const uploadMediaFile = async (file: File, type: 'image' | 'video') => {
        setIsUploading(true);
        try {
            const response = await uploadMedia(file);
            const mediaUrl = response.imageUrl;
            
            // Ensure we have the full URL
            const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:5000${mediaUrl}`;
            
            if (type === 'image') {
                const imageHtml = `<div style="margin: 10px 0; text-align: center;"><img src="${fullUrl}" alt="Uploaded image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: block; margin: 0 auto;" /></div>`;
                execCommand('insertHTML', imageHtml);
            } else {
                const videoHtml = `<video controls style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><source src="${fullUrl}" type="video/${file.type.split('/')[1]}">Your browser does not support the video tag.</video>`;
                execCommand('insertHTML', videoHtml);
            }
        } catch (error) {
            console.error('Failed to upload media:', error);
            alert('Failed to upload media. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const insertYouTubeVideo = () => {
        if (youtubeUrl) {
            const videoId = extractYouTubeId(youtubeUrl);
            if (videoId) {
                const embedHtml = `<div style="margin: 10px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                execCommand('insertHTML', embedHtml);
                setShowMediaModal(false);
                setYoutubeUrl('');
            } else {
                alert('Invalid YouTube URL');
            }
        }
    };

    const extractYouTubeId = (url: string): string | null => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const insertTable = () => {
        const tableHtml = `
            <table style="border-collapse: collapse; width: 100%; margin: 10px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <tr style="background-color: #f9fafb;">
                    <td style="border: 1px solid #e5e7eb; padding: 12px; font-weight: 600;">Header 1</td>
                    <td style="border: 1px solid #e5e7eb; padding: 12px; font-weight: 600;">Header 2</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #e5e7eb; padding: 12px;">Data 1</td>
                    <td style="border: 1px solid #e5e7eb; padding: 12px;">Data 2</td>
                </tr>
            </table>
        `;
        execCommand('insertHTML', tableHtml);
    };

    const insertCodeBlock = () => {
        const codeHtml = `
            <div style="background-color: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; margin: 10px 0; font-family: 'Courier New', monospace; overflow-x: auto;">
                <code>Your code here</code>
            </div>
        `;
        execCommand('insertHTML', codeHtml);
    };

    const toggleHeading = (level: number) => {
        // Simple approach: just apply the heading
        const success = execCommand('formatBlock', `h${level}`);
        if (!success) {
            // Fallback: insert HTML
            const headingHtml = `<h${level} style="font-size: ${level === 1 ? '2.25rem' : level === 2 ? '1.875rem' : '1.5rem'}; font-weight: 700; margin: 1.5rem 0 1rem 0; color: #1f2937;">Heading ${level}</h${level}>`;
            execCommand('insertHTML', headingHtml);
        }
    };

    const insertQuote = () => {
        const quoteHtml = `<blockquote style="border-left: 4px solid #14b8a6; padding-left: 1.5rem; margin: 2rem 0; font-style: italic; color: #6b7280; background-color: #f9fafb; padding: 1rem 1.5rem; border-radius: 0.5rem;">Your quote here</blockquote>`;
        execCommand('insertHTML', quoteHtml);
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            if (newContent !== content) {
                onChange(newContent);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Prevent cursor jumping on certain keys
        if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
            // Let the default behavior happen, then update content
            setTimeout(() => {
                if (editorRef.current) {
                    onChange(editorRef.current.innerHTML);
                }
            }, 0);
        }
    };

    return (
        <div className="w-full">
            {/* Toolbar */}
            <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-3 flex flex-wrap gap-2">
                {/* Text Formatting */}
                <div className="flex gap-1 border-r pr-3 mr-3">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        onClick={() => {
                            console.log('Bold clicked');
                            toggleFormat('bold');
                        }}
                        title="Toggle Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        onClick={() => {
                            console.log('Italic clicked');
                            toggleFormat('italic');
                        }}
                        title="Toggle Italic"
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        onClick={() => {
                            console.log('Underline clicked');
                            toggleFormat('underline');
                        }}
                        title="Toggle Underline"
                    >
                        <u>U</u>
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        onClick={() => {
                            console.log('Strikethrough clicked');
                            toggleFormat('strikeThrough');
                        }}
                        title="Toggle Strikethrough"
                    >
                        <s>S</s>
                    </button>
                </div>

                {/* Headings */}
                <div className="flex gap-1 border-r pr-3 mr-3">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                        onClick={() => {
                            console.log('H1 clicked');
                            toggleHeading(1);
                        }}
                        title="Toggle Heading 1"
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                        onClick={() => {
                            console.log('H2 clicked');
                            toggleHeading(2);
                        }}
                        title="Toggle Heading 2"
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                        onClick={() => {
                            console.log('H3 clicked');
                            toggleHeading(3);
                        }}
                        title="Toggle Heading 3"
                    >
                        H3
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => {
                            console.log('Normal text clicked');
                            execCommand('formatBlock', 'p');
                        }}
                        title="Normal Text"
                    >
                        Normal
                    </button>
                </div>

                {/* Lists */}
                <div className="flex gap-1 border-r pr-3 mr-3">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => {
                            console.log('Bullet list clicked');
                            execCommand('insertUnorderedList');
                        }}
                        title="Bullet List"
                    >
                        • List
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => {
                            console.log('Numbered list clicked');
                            execCommand('insertOrderedList');
                        }}
                        title="Numbered List"
                    >
                        1. List
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => {
                            console.log('Remove list clicked');
                            execCommand('removeFormat');
                        }}
                        title="Remove List Formatting"
                    >
                        Remove List
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex gap-1 border-r pr-3 mr-3">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => execCommand('justifyLeft')}
                        title="Align Left"
                    >
                        ⬅️
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => execCommand('justifyCenter')}
                        title="Align Center"
                    >
                        ↔️
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => execCommand('justifyRight')}
                        title="Align Right"
                    >
                        ➡️
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => execCommand('justifyFull')}
                        title="Justify"
                    >
                        ⬌
                    </button>
                </div>

                {/* Media */}
                <div className="flex gap-1 border-r pr-3 mr-3">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={insertImage}
                        disabled={isUploading}
                        title="Insert Image"
                    >
                        🖼️ Image
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={insertVideo}
                        disabled={isUploading}
                        title="Insert Video"
                    >
                        🎥 Video
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={insertYouTube}
                        title="Insert YouTube Video"
                    >
                        📺 YouTube
                    </button>
                </div>

                {/* Advanced */}
                <div className="flex gap-1">
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={insertTable}
                        title="Insert Table"
                    >
                        📊 Table
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={insertCodeBlock}
                        title="Insert Code Block"
                    >
                        💻 Code
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                        onClick={() => {
                            console.log('Quote clicked');
                            insertQuote();
                        }}
                        title="Quote"
                    >
                        💬 Quote
                    </button>
                </div>

                {isUploading && (
                    <div className="flex items-center text-blue-600 text-sm ml-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Uploading...
                    </div>
                )}
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                style={{ 
                    height,
                    overflow: 'auto',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                }}
                className="border border-t-0 border-gray-300 rounded-b-lg p-4 focus:outline-none"
                suppressContentEditableWarning={true}
            />
            
            <style jsx>{`
                div[contenteditable] img {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    margin: 10px auto !important;
                }
                div[contenteditable] video {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    margin: 10px auto !important;
                }
                div[contenteditable] iframe {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    margin: 10px auto !important;
                }
                div[contenteditable] table {
                    max-width: 100% !important;
                    table-layout: fixed !important;
                }
            `}</style>

            {/* YouTube Modal */}
            {showMediaModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Insert YouTube Video</h3>
                        <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="Enter YouTube video URL..."
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
                        />
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowMediaModal(false);
                                    setYoutubeUrl('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={insertYouTubeVideo}
                                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 font-semibold"
                            >
                                Insert Video
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleRichTextEditor;
