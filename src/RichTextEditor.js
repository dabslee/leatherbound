import React, { useRef, useEffect } from 'react';

const RichTextEditor = ({ id, defaultValue, className, style }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && defaultValue) {
            editorRef.current.innerHTML = defaultValue;
        }
    }, []); // Only on mount

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
             switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline');
                    break;
                default:
                    break;
             }
        }

        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
             // Use e.code to be layout-independent (Digit7 is the '7' key on the number row)
             switch(e.code) {
                case 'Digit7':
                    e.preventDefault();
                    document.execCommand('insertOrderedList');
                    break;
                case 'Digit8':
                    e.preventDefault();
                    document.execCommand('insertUnorderedList');
                    break;
                 default:
                     break;
             }
        }
    };

    return (
        <div
            id={id}
            ref={editorRef}
            className={className}
            style={{ ...style, overflowY: 'auto', whiteSpace: 'pre-wrap', outline: 'none' }}
            contentEditable
            onKeyDown={handleKeyDown}
        />
    );
};

export default RichTextEditor;
