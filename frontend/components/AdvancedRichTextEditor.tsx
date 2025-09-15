import React, { useEffect, useRef, useState } from 'react';
import { uploadMedia } from '../services/mockApi';

interface AdvancedRichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: string;
}

const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({
    content,
    onChange,
    placeholder = "Start writing your content...",
    height = "400px"
}) => {
    const quillRef = useRef<any>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [quill, setQuill] = useState<any>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        // Wait for Quill to be available globally
        const initQuill = () => {
            if (typeof window !== 'undefined' && (window as any).Quill && editorRef.current) {
                const Quill = (window as any).Quill;
                
                // Initialize Quill
                const quillInstance = new Quill(editorRef.current, {
                    theme: 'snow',
                    placeholder: placeholder,
                    modules: {
                        toolbar: [
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'align': [] }],
                            ['image', 'video'],
                            ['blockquote', 'code-block'],
                            ['clean']
                        ]
                    }
                });

                setQuill(quillInstance);
                quillRef.current = quillInstance;
                setIsInitializing(false);

                // Set initial content
                if (content) {
                    quillInstance.root.innerHTML = content;
                }

                // Handle content changes
                quillInstance.on('text-change', () => {
                    const html = quillInstance.root.innerHTML;
                    onChange(html);
                });

                // Add custom handlers
                const toolbar = quillInstance.getModule('toolbar');
                toolbar.addHandler('image', selectLocalImage);
                toolbar.addHandler('video', selectLocalVideo);
            }
        };

        // Multiple attempts to initialize Quill
        const attemptInit = () => {
            if (typeof window !== 'undefined' && (window as any).Quill && editorRef.current) {
                initQuill();
                return true;
            }
            return false;
        };

        // Try immediately
        if (!attemptInit()) {
            // Try with small delays
            const timeouts = [10, 50, 100, 200, 500, 1000];
            timeouts.forEach(delay => {
                setTimeout(() => {
                    if (!quill) {
                        attemptInit();
                    }
                }, delay);
            });
            
            // Set timeout to stop initializing after 2 seconds
            setTimeout(() => {
                setIsInitializing(false);
            }, 2000);
        }

        return () => {
            if (quillRef.current) {
                quillRef.current = null;
            }
        };
    }, []);

    const selectLocalImage = () => {
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
    };

    const selectLocalVideo = () => {
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
    };

    const uploadMediaFile = async (file: File, type: 'image' | 'video') => {
        setIsUploading(true);
        try {
            const response = await uploadMedia(file);
            const mediaUrl = response.imageUrl;
            
            if (quill) {
                const range = quill.getSelection();
                
                if (type === 'image') {
                    quill.insertEmbed(range.index, 'image', mediaUrl);
                } else {
                    quill.insertEmbed(range.index, 'video', mediaUrl);
                }
                
                quill.setSelection(range.index + 1);
            }
        } catch (error) {
            console.error('Failed to upload media:', error);
            alert('Failed to upload media. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const insertYouTubeVideo = () => {
        const url = prompt('Enter YouTube video URL:');
        if (url) {
            const videoId = extractYouTubeId(url);
            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                if (quill) {
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'video', embedUrl);
                    quill.setSelection(range.index + 1);
                }
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
        if (quill) {
            const range = quill.getSelection();
            const tableHtml = `
                <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">Header 1</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Header 2</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">Data 1</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Data 2</td>
                    </tr>
                </table>
            `;
            quill.clipboard.dangerouslyPasteHTML(range.index, tableHtml);
        }
    };

    const insertCodeBlock = () => {
        if (quill) {
            const range = quill.getSelection();
            quill.insertText(range.index, '\n```\nYour code here\n```\n');
            quill.setSelection(range.index + 1);
        }
    };

    // Fallback if Quill doesn't load
    if (!quill) {
        return (
            <div className="w-full">
                <div className="border border-gray-300 rounded-lg relative">
                    <textarea
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        style={{ height }}
                        className="w-full p-4 border-0 rounded-lg resize-none focus:outline-none"
                    />
                    {isInitializing && (
                        <div className="absolute top-2 right-2 flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                            <span className="text-xs text-teal-600 font-medium">Loading rich editor...</span>
                        </div>
                    )}
                </div>
                {isInitializing ? (
                    <p className="text-sm text-gray-500 mt-2">
                        💡 You can start typing above while the rich text editor loads. Your content will be preserved.
                    </p>
                ) : (
                    <p className="text-sm text-amber-600 mt-2">
                        ⚠️ Rich text editor failed to load. You can still create content using the text area above.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Custom Toolbar */}
            <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1">
                {/* Text Formatting */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('bold', true)}
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('italic', true)}
                        title="Italic"
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('underline', true)}
                        title="Underline"
                    >
                        <u>U</u>
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('strike', true)}
                        title="Strikethrough"
                    >
                        <s>S</s>
                    </button>
                </div>

                {/* Headings */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
                        onClick={() => quill?.format('header', 1)}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
                        onClick={() => quill?.format('header', 2)}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
                        onClick={() => quill?.format('header', 3)}
                        title="Heading 3"
                    >
                        H3
                    </button>
                </div>

                {/* Lists */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('list', 'bullet')}
                        title="Bullet List"
                    >
                        • List
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('list', 'ordered')}
                        title="Numbered List"
                    >
                        1. List
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('align', 'left')}
                        title="Align Left"
                    >
                        ⬅️
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('align', 'center')}
                        title="Align Center"
                    >
                        ↔️
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('align', 'right')}
                        title="Align Right"
                    >
                        ➡️
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('align', 'justify')}
                        title="Justify"
                    >
                        ⬌
                    </button>
                </div>

                {/* Media */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={selectLocalImage}
                        disabled={isUploading}
                        title="Insert Image"
                    >
                        🖼️ Image
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={selectLocalVideo}
                        disabled={isUploading}
                        title="Insert Video"
                    >
                        🎥 Video
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={insertYouTubeVideo}
                        title="Insert YouTube Video"
                    >
                        📺 YouTube
                    </button>
                </div>

                {/* Advanced */}
                <div className="flex gap-1">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={insertTable}
                        title="Insert Table"
                    >
                        📊 Table
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={insertCodeBlock}
                        title="Insert Code Block"
                    >
                        💻 Code
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={() => quill?.format('blockquote', true)}
                        title="Quote"
                    >
                        💬 Quote
                    </button>
                </div>

                {isUploading && (
                    <div className="flex items-center text-blue-600 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Uploading...
                    </div>
                )}
            </div>

            {/* Quill Editor */}
            <div
                ref={editorRef}
                style={{ height }}
                className="border border-t-0 border-gray-300 rounded-b-lg"
            />
        </div>
    );
};

export default AdvancedRichTextEditor;
