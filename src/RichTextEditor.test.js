import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import RichTextEditor from './RichTextEditor';

describe('RichTextEditor', () => {
    let execCommandSpy;

    beforeEach(() => {
        // execCommand is not implemented in jsdom, so we need to define it first
        document.execCommand = jest.fn();
        execCommandSpy = jest.spyOn(document, 'execCommand').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        // Clean up
        delete document.execCommand;
    });

    test('renders with default value', () => {
        const { container } = render(<RichTextEditor id="test-editor" defaultValue="Hello World" />);
        const editor = container.querySelector('#test-editor');
        expect(editor).toBeInTheDocument();
        expect(editor).toHaveTextContent('Hello World');
    });

    test('handles Ctrl+B for bold', () => {
        const { container } = render(<RichTextEditor id="test-editor" />);
        const editor = container.querySelector('#test-editor');

        fireEvent.keyDown(editor, { key: 'b', ctrlKey: true });
        expect(execCommandSpy).toHaveBeenCalledWith('bold');
    });

    test('handles Ctrl+I for italic', () => {
        const { container } = render(<RichTextEditor id="test-editor" />);
        const editor = container.querySelector('#test-editor');

        fireEvent.keyDown(editor, { key: 'i', ctrlKey: true });
        expect(execCommandSpy).toHaveBeenCalledWith('italic');
    });

    test('handles Ctrl+U for underline', () => {
        const { container } = render(<RichTextEditor id="test-editor" />);
        const editor = container.querySelector('#test-editor');

        fireEvent.keyDown(editor, { key: 'u', ctrlKey: true });
        expect(execCommandSpy).toHaveBeenCalledWith('underline');
    });

    test('handles Ctrl+Shift+7 for ordered list', () => {
        const { container } = render(<RichTextEditor id="test-editor" />);
        const editor = container.querySelector('#test-editor');

        // Provide both key (legacy/fallback) and code (primary target)
        fireEvent.keyDown(editor, { key: '&', code: 'Digit7', ctrlKey: true, shiftKey: true });
        expect(execCommandSpy).toHaveBeenCalledWith('insertOrderedList');
    });

    test('handles Ctrl+Shift+8 for unordered list', () => {
        const { container } = render(<RichTextEditor id="test-editor" />);
        const editor = container.querySelector('#test-editor');

        fireEvent.keyDown(editor, { key: '*', code: 'Digit8', ctrlKey: true, shiftKey: true });
        expect(execCommandSpy).toHaveBeenCalledWith('insertUnorderedList');
    });
});
