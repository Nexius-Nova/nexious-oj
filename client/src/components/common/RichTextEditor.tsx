import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  ImagePlus,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
} from 'lucide-react';
import { uploadApi } from '@/api';
import { toast } from './Toast';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function getMarkdown(editor: any): string {
  return editor.storage?.markdown?.getMarkdown?.() ?? '';
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = '',
  collapsible = true,
  defaultCollapsed = false,
}: RichTextEditorProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [uploading, setUploading] = useState(false);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const isInternalUpdate = useRef(false);
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: placeholder || '' }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(files[i]);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (isExternalUpdate.current) return;
      isInternalUpdate.current = true;
      const md = getMarkdown(e);
      onChange(md);
      setTimeout(() => { isInternalUpdate.current = false; }, 0);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) return;
    isExternalUpdate.current = true;
    const currentMd = getMarkdown(editor);
    if (currentMd !== value) {
      editor.commands.setContent(value);
    }
    setTimeout(() => { isExternalUpdate.current = false; }, 0);
  }, [value, editor]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadApi.uploadImage(base64);
      editor.chain().focus().setImage({ src: result.url }).run();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      await handleImageUpload(file);
    }
    e.target.value = '';
  }, [handleImageUpload]);

  const toggleMarkdownMode = useCallback(() => {
    if (!editor) return;
    if (!markdownMode) {
      setMarkdownText(getMarkdown(editor));
    } else {
      isExternalUpdate.current = true;
      editor.commands.setContent(markdownText);
      onChange(markdownText);
      setTimeout(() => { isExternalUpdate.current = false; }, 0);
    }
    setMarkdownMode(!markdownMode);
  }, [editor, markdownMode, markdownText, onChange]);

  if (!editor) return null;

  return (
    <div className={`tiptap-wrapper ${collapsed ? 'tiptap-wrapper--collapsed' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="tiptap-toolbar">
        <div className="tiptap-toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销">
            <Undo2 />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
            <Redo2 />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="一级标题"
          >
            <Heading1 />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="二级标题"
          >
            <Heading2 />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="三级标题"
          >
            <Heading3 />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗">
            <Bold />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
            <Italic />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线">
            <UnderlineIcon />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线">
            <Strikethrough />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">
            <Highlighter />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表">
            <List />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表">
            <ListOrdered />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">
            <Quote />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行内代码">
            <Code />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块">
            <FileCode />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <ToolBtn
            onClick={() => {
              const url = window.prompt('输入链接地址:');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive('link')}
            title="链接"
          >
            <Link2 />
          </ToolBtn>

          <label className="tiptap-toolbtn cursor-pointer" title="上传图片">
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>

          <ToolBtn
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="表格"
          >
            <TableIcon />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线">
            <Minus />
          </ToolBtn>
        </div>

        <Separator />

        <div className="tiptap-toolbar-group">
          <button
            type="button"
            onClick={toggleMarkdownMode}
            className={`tiptap-toolbtn tiptap-md-toggle ${markdownMode ? 'active' : ''}`}
            title={markdownMode ? '可视化编辑' : 'Markdown 模式'}
          >
            <FileCode />
            <span>MD</span>
          </button>
        </div>

        <div className="flex-1" />

        {collapsible && (
          <div className="tiptap-toolbar-group">
            <ToolBtn onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开编辑器' : '收起编辑器'}>
              {collapsed ? <ChevronDown /> : <ChevronUp />}
            </ToolBtn>
          </div>
        )}
      </div>

      {/* BubbleMenu */}
      {!collapsed && !markdownMode && (
        <BubbleMenu
          editor={editor}
          className="tiptap-bubble-menu"
        >
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗">
            <Bold />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
            <Italic />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线">
            <UnderlineIcon />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线">
            <Strikethrough />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="代码">
            <Code />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">
            <Highlighter />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt('输入链接地址:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            active={editor.isActive('link')}
            title="链接"
          >
            <Link2 />
          </ToolBtn>
        </BubbleMenu>
      )}

      {/* Content */}
      {!collapsed && (
        <>
          {markdownMode ? (
            <textarea
              value={markdownText}
              onChange={(e) => setMarkdownText(e.target.value)}
              className="tiptap-md-editor"
              spellCheck={false}
            />
          ) : (
            <div className="tiptap-content-scroll">
              <EditorContent editor={editor} />
            </div>
          )}

          <div className="tiptap-footer">
            <div className="tiptap-footer-info">
              <span>Markdown</span>
              <span>·</span>
              <span>粘贴图片上传</span>
              <span>·</span>
              <span>选中文字弹出格式菜单</span>
            </div>
            <div className="tiptap-footer-count">{value.length} 字符</div>
          </div>
        </>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`tiptap-toolbtn ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="tiptap-separator" />;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
