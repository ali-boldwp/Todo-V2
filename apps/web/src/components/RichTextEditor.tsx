import React, { useEffect, useRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';

interface RichTextEditorProps {
    data?: OutputData;
    onChange: (data: OutputData) => void;
    readOnly?: boolean;
    holder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ data, onChange, readOnly = false, holder = 'editorjs' }) => {
    const editorRef = useRef<EditorJS | null>(null);

    useEffect(() => {
        if (!editorRef.current) {
            const editor = new EditorJS({
                holder: holder,
                readOnly: readOnly,
                data: data,
                tools: {
                    header: Header,
                    list: List,
                },
                onChange: async () => {
                    const content = await editor.save();
                    onChange(content);
                },
            });
            editorRef.current = editor;
        }

        return () => {
            if (editorRef.current && editorRef.current.destroy) {
                editorRef.current.destroy();
                editorRef.current = null;
            }
        };
    }, []);

    return <div id={holder} className="border border-gray-300 rounded-lg p-4 min-h-[200px] prose max-w-none" />;
};

export default RichTextEditor;
