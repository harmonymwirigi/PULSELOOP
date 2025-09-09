import React, { useEffect, useRef } from 'react';

// Make sure Quill is available on the window object from the CDN script
declare const Quill: any;

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeight = '150px' }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillInstance = useRef<any>(null);

    useEffect(() => {
        if (editorRef.current && typeof Quill !== 'undefined' && !quillInstance.current) {
            const toolbarOptions = [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link'],
                ['clean']
            ];

            quillInstance.current = new Quill(editorRef.current, {
                modules: {
                    toolbar: toolbarOptions,
                },
                theme: 'snow',
                placeholder: placeholder || 'Start writing...',
            });

            // Set initial value
            if (value) {
                quillInstance.current.root.innerHTML = value;
            }

            quillInstance.current.on('text-change', () => {
                const editorContent = quillInstance.current.root.innerHTML;
                // Quill adds a <p><br></p> for an empty editor, handle this
                if (editorContent === '<p><br></p>') {
                    onChange('');
                } else {
                    onChange(editorContent);
                }
            });
        }
    }, [placeholder]);
    
    // Handle external value changes (e.g., form reset)
    useEffect(() => {
        if (quillInstance.current && quillInstance.current.root.innerHTML !== value) {
            if (value) {
                quillInstance.current.root.innerHTML = value;
            } else {
                // Clear the editor
                quillInstance.current.setText('');
            }
        }
    }, [value]);


    return (
        <div className="bg-white rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500">
            <div ref={editorRef} style={{ minHeight }}></div>
        </div>
    );
};

export default RichTextEditor;
