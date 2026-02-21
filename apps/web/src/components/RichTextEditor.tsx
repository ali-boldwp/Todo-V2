import React, { useEffect, useRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
import './RichTextEditor.css';

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

    return <div id={holder} className="min-h-[200px] prose max-w-none w-full h-full p-[50px] focus:outline-none" />;
};

export default RichTextEditor;
