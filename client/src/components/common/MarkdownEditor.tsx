import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  ImagePlus,
  Loader2,
  Table,
  Minus,
  ChevronDown,
  ChevronUp,
  Columns2,
  PanelLeft,
  GripVertical,
} from 'lucide-react';
import { uploadApi } from '@/api';
import MarkdownRenderer from './MarkdownRenderer';
import { toast } from './Toast';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className = '',
  collapsible = true,
  defaultCollapsed = false,
}: MarkdownEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [splitMode, setSplitMode] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      let imageItem: DataTransferItem | null = null;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          imageItem = items[i];
          break;
        }
      }

      if (!imageItem) return;

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;

      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        const result = await uploadApi.uploadImage(base64);
        const imageMarkdown = `![image](${result.url})`;
        insertText(imageMarkdown);
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('图片上传失败，请重试');
      } finally {
        setUploading(false);
      }
    },
    [insertText]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          const base64 = await fileToBase64(file);
          const result = await uploadApi.uploadImage(base64);
          const imageMarkdown = `![image](${result.url})`;
          insertText(imageMarkdown);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('图片上传失败，请重试');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [insertText]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.max(20, Math.min(80, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toolbarItems = [
    { icon: Bold, label: '加粗', before: '**', after: '**' },
    { icon: Italic, label: '斜体', before: '*', after: '*' },
    { icon: Heading1, label: '一级标题', before: '# ', after: '' },
    { icon: Heading2, label: '二级标题', before: '## ', after: '' },
    { icon: Heading3, label: '三级标题', before: '### ', after: '' },
    { icon: List, label: '无序列表', before: '- ', after: '' },
    { icon: ListOrdered, label: '有序列表', before: '1. ', after: '' },
    { icon: Quote, label: '引用', before: '> ', after: '' },
    { icon: Code, label: '行内代码', before: '`', after: '`' },
    { icon: Link2, label: '链接', before: '[', after: '](url)' },
    { icon: Table, label: '表格', before: '| 列1 | 列2 |\n|-----|-----|\n| 内容 | 内容 |', after: '' },
    { icon: Minus, label: '分割线', before: '\n---\n', after: '' },
  ];

  return (
    <div className={`flex flex-col border border-border rounded-lg overflow-hidden bg-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-0.5 flex-wrap">
          {toolbarItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => insertText(item.before, item.after)}
              className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </button>
          ))}

          <div className="w-px h-5 bg-border mx-1" />

          <label className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors cursor-pointer">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            type="button"
            onClick={() => setSplitMode(!splitMode)}
            className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
              splitMode ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
            title={splitMode ? '仅编辑模式' : '分屏预览模式'}
          >
            {splitMode ? <Columns2 className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            title={collapsed ? '展开编辑器' : '收起编辑器'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div
            ref={containerRef}
            className="flex flex-1 min-h-[300px] max-h-[600px] relative"
          >
            {splitMode ? (
              <>
                {/* 编辑区 */}
                <div
                  className="flex flex-col overflow-hidden"
                  style={{ width: `${editorWidth}%` }}
                >
                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    className="flex-1 w-full resize-none bg-background px-4 py-3 text-sm leading-7 outline-none ring-0 focus:ring-0 border-0 font-mono"
                    spellCheck={false}
                  />
                </div>

                {/* 拖动条 */}
                <div
                  className={`flex items-center justify-center w-1.5 cursor-col-resize transition-colors ${
                    isDragging ? 'bg-primary' : 'bg-border hover:bg-primary/50'
                  }`}
                  onMouseDown={handleMouseDown}
                  title="拖动调整宽度"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                </div>

                {/* 预览区 */}
                <div
                  className="flex-1 overflow-y-auto bg-background border-l border-border"
                  style={{ width: `${100 - editorWidth}%` }}
                >
                  <div className="px-4 py-3">
                    {value ? (
                      <MarkdownRenderer content={value} />
                    ) : (
                      <span className="text-muted-foreground text-sm italic">
                        {placeholder || '预览区域...'}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onPaste={handlePaste}
                placeholder={placeholder}
                className="flex-1 w-full resize-none bg-background px-4 py-3 text-sm leading-7 outline-none ring-0 focus:ring-0 border-0 font-mono"
                spellCheck={false}
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-1.5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>支持 Markdown 语法</span>
              <span>•</span>
              <span>粘贴图片自动上传</span>
              <span>•</span>
              <span>支持数学公式 $...$</span>
              {splitMode && (
                <>
                  <span>•</span>
                  <span>拖动中间分隔线调整宽度</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {value.length} 字符
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
