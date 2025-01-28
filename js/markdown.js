// Markdown渲染工具
const marked = await import('https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js');
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/highlight.min.js';

console.log('markdown.js 已加载');

// 配置 marked 使用 highlight.js
const renderer = new marked.Renderer();

// 自定义标题渲染
renderer.heading = function(text, level) {
    console.log('=== 标题处理开始 ===');
    console.log('原始标题文本:', text);
    console.log('标题级别:', level);
    
    // 检查标题中是否已经包含ID
    const hasId = text.includes('{#');
    console.log('标题是否已包含ID:', hasId);
    
    // 移除已有的 ID 标记
    let cleanText = text.replace(/\s*\{#[^}]+\}/g, '');
    console.log('移除ID后的文本:', cleanText);
    
    // 生成纯文本标题
    const plainText = cleanText
        .replace(/\s*\([^)]*\)/g, '')  // 移除英文括号及其内容
        .replace(/\s*\{[^}]*\}/g, '')  // 移除大括号及其内容
        .trim();
    console.log('清理后的纯文本:', plainText);
    
    // 生成ID：只使用中文部分
    const id = plainText.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
    console.log('生成的ID:', id);
    
    const result = `<h${level} id="${id}">${plainText}</h${level}>`;
    console.log('最终生成的HTML:', result);
    console.log('=== 标题处理结束 ===\n');
    
    return result;
};

marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    headerIds: true,
    headerPrefix: '',
    mangle: false, // 禁用自动生成ID
    pedantic: false,
    gfm: true
});

// Markdown渲染工具
export async function renderMarkdown(url) {
    try {
        console.log('=== 开始渲染Markdown ===');
        console.log('请求的URL:', url);
        
        const response = await fetch(url);
        const markdown = await response.text();
        console.log('原始Markdown长度:', markdown.length);
        
        // 提取文章内容
        const parts = markdown.split('---');
        console.log('分割后的部分数量:', parts.length);
        
        const content = parts[2] || markdown;
        console.log('提取的文章内容长度:', content.length);
        
        // 转换Markdown为HTML
        console.log('开始转换为HTML...');
        const html = marked.parse(content);
        console.log('生成的HTML长度:', html.length);
        
        // 代码高亮
        console.log('开始处理代码高亮...');
        document.querySelectorAll('pre code').forEach((block, index) => {
            console.log(`处理第 ${index + 1} 个代码块`);
            hljs.highlightBlock(block);
        });
        
        console.log('=== Markdown渲染完成 ===\n');
        return html;
    } catch (error) {
        console.error('渲染失败:', error);
        return '<p>加载文章失败</p>';
    }
} 