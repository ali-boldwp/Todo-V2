import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
import { useAuth } from '../context/MockAuthContext';
import './RichTextEditor.css';

interface RichTextEditorProps {
    data?: OutputData;
    onChange: (data: OutputData) => void;
    readOnly?: boolean;
    holder?: string;
    placeholder?: string;
}

export interface RichTextEditorRef {
    save: () => Promise<OutputData>;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
    data,
    onChange,
    readOnly = false,
    holder = 'editorjs',
    placeholder = 'Add description...'
}, ref) => {
    const { isAuthenticated } = useAuth();
    const isEditorReadOnly = readOnly || !isAuthenticated;
    const editorRef = useRef<EditorJS | null>(null);
    const isReady = useRef(false);

    useImperativeHandle(ref, () => ({
        save: async () => {
            if (editorRef.current && isReady.current) {
                return await editorRef.current.save();
            }
            return { blocks: [] };
        }
    }));

    useEffect(() => {
        if (!editorRef.current) {
            const editor = new EditorJS({
                holder: holder,
                readOnly: isEditorReadOnly,
                data: data,
                placeholder: placeholder,
                defaultBlock: 'paragraph',
                inlineToolbar: true,
                tools: {
                    paragraph: {
                        inlineToolbar: true,
                    },
                    header: {
                        class: Header as any,
                        inlineToolbar: true,
                        config: {
                            levels: [1, 2, 3, 4, 5, 6],
                            defaultLevel: 2,
                        },
                    },
                    list: {
                        class: List as any,
                        inlineToolbar: true,
                    },
                },
                onReady: () => {
                    isReady.current = true;
                },
                onChange: async () => {
                    if (!isReady.current || isEditorReadOnly) return;
                    const content = await editor.save();
                    // Avoid triggering onChange with empty data if it was already empty
                    if (content.blocks.length === 0 && (!data || data.blocks?.length === 0)) {
                        return;
                    }
                    onChange(content);
                },
            });
            editorRef.current = editor;
        }

        return () => {
            if (editorRef.current && editorRef.current.destroy) {
                editorRef.current.destroy();
                editorRef.current = null;
                isReady.current = false;
            }
        };
    }, [holder, isEditorReadOnly]);

    // Handle readOnly property updates
    useEffect(() => {
        if (editorRef.current && isReady.current) {
            editorRef.current.readOnly.toggle(isEditorReadOnly);
        }
    }, [isEditorReadOnly]);

    // Handle external data updates
    useEffect(() => {
        if (editorRef.current && isReady.current && data) {
            // Only render if data is different from current editor content to avoid loop
            // Simple stringify check for basic comparison
            editorRef.current.save().then((currentData) => {
                if (JSON.stringify(currentData.blocks) !== JSON.stringify(data.blocks)) {
                    editorRef.current?.render(data);
                }
            });
        }
    }, [data]);

    return <div id={holder} className="min-h-[24px] prose max-w-none w-full h-full p-0 focus:outline-none" />;
});

export default RichTextEditor;
