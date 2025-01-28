const fs = require('fs').promises
const path = require('path')
const matter = require('gray-matter')
const marked = require('marked')
const hljs = require('highlight.js')

// 清理标题文本
function cleanTitle(text) {
    // 移除所有括号及其内容
    text = text.replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\{[^}]*\}/g, '')
        .replace(/\s*\[[^\]]*\]/g, '');
    // 移除 #{数字}- 这样的模式
    text = text.replace(/\s*#\d+-/g, '');
    // 清理多余的空格
    text = text.trim().replace(/\s+/g, ' ');
    return text;
}

// 只获取中文部分
function getChineseText(text) {
    const matches = text.match(/[\u4e00-\u9fa5]+/g);
    return matches ? matches.join('') : '';
}

// 配置 marked 使用 highlight.js
const renderer = new marked.Renderer();

// 自定义标题渲染
renderer.heading = function(text, level) {
    console.log('渲染标题:', {
        文本: text,
        级别: level
    });
    
    // 如果text是对象，获取其text属性
    if (typeof text === 'object') {
        level = text.depth;  // 从对象中获取正确的级别
        text = text.text;    // 获取实际的文本内容
    }
    
    // 移除已有的 ID 标记
    text = text.replace(/\s*\{#[^}]+\}/g, '');
    
    // 生成纯文本标题
    const plainText = text
        .replace(/\s*\([^)]*\)/g, '')  // 移除英文括号及其内容
        .replace(/\s*\{[^}]*\}/g, '')  // 移除大括号及其内容
        .trim();
    
    // 生成ID：只使用中文部分
    const id = plainText.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
    
    console.log('生成的HTML标题:', {
        原始文本: text,
        处理后文本: plainText,
        ID: id,
        级别: level
    });
    
    return `<h${level} id="${id}">${plainText}</h${level}>`;
};

marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(lang, code).value;
        }
        return hljs.highlightAuto(code).value;
    },
    headerIds: true,
    headerPrefix: '',
    mangle: false, // 禁用自动生成ID
    pedantic: false,
    gfm: true
});

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 生成目录
function generateTOC(markdown) {
    console.log('开始生成目录...');
    console.log('原始Markdown内容前100个字符:', markdown.substring(0, 100));
    
    const headings = [];
    const tokens = marked.lexer(markdown);
    
    console.log('解析出的标记数量:', tokens.length);
    
    tokens.forEach((token, index) => {
        if (token.type === 'heading') {
            console.log(`\n发现标题 #${index}:`, {
                原始文本: token.text,
                标题级别: token.depth
            });
            
            // 移除已有的 ID 标记
            let text = token.text.replace(/\s*\{#[^}]+\}/g, '');
            console.log('移除ID标记后:', text);
            
            // 清理标题文本
            text = text
                .replace(/\s*\([^)]*\)/g, '')  // 移除英文括号及其内容
                .replace(/\s*\{[^}]*\}/g, '')  // 移除大括号及其内容
                .trim();
            console.log('清理后的标题:', text);
            
            // 生成ID：只使用中文部分
            const id = text.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
            console.log('生成的ID:', id);
            
            headings.push({
                level: token.depth,
                text: text,
                id: id
            });
        }
    });

    console.log('\n所有处理后的标题:', headings);

    let toc = '<div class="article-toc">\n';
    toc += '<div class="toc-title">目录</div>\n';
    toc += '<ul class="toc-list">\n';

    let currentLevel = 1;
    let listStack = [];

    headings.forEach(heading => {
        // 处理层级关系
        if (heading.level > currentLevel) {
            for (let i = 0; i < heading.level - currentLevel; i++) {
                toc += '<ul>\n';
                listStack.push('</ul>\n');
            }
        } else if (heading.level < currentLevel) {
            for (let i = 0; i < currentLevel - heading.level; i++) {
                toc += listStack.pop();
            }
        }

        currentLevel = heading.level;
        
        // 根据标题级别添加不同的类名
        const className = `h${heading.level}`;
        toc += `  <li><a href="#${heading.id}" class="${className}">${heading.text}</a></li>\n`;
    });

    // 关闭所有未关闭的列表
    while (listStack.length > 0) {
        toc += listStack.pop();
    }

    toc += '</ul>\n';
    toc += '</div>';

    return { toc, headings };
}

async function generateHtml(markdown, frontMatter) {
    console.log('\n开始生成HTML...');
    console.log('Front Matter:', frontMatter);
    
    const { toc, headings } = generateTOC(markdown);
    console.log('目录生成完成，标题数量:', headings.length);
    
    // 在转换为HTML前记录markdown
    console.log('\n准备转换为HTML的Markdown内容前100个字符:', markdown.substring(0, 100));
    
    // 直接使用原始markdown，让renderer处理标题ID
    const html = marked.parse(markdown);
    console.log('HTML生成完成，内容长度:', html.length);
    console.log('HTML内容前200个字符:', html.substring(0, 200));

    const template = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${frontMatter.title} - 我的个人博客</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="logo">我的博客</div>
            <ul class="nav-links">
                <li><a href="/">首页</a></li>
                <li><a href="/技术.html">技术</a></li>
                <li><a href="/读书.html">读书</a></li>
                <li><a href="/关于我.html">关于我</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <div class="article-container">
            <article class="article-main post">
                <h1>${frontMatter.title}</h1>
                <div class="post-meta">
                    <span class="date">${formatDate(frontMatter.date)}</span>
                    <span class="category">
                        <a href="/${frontMatter.category.toLowerCase()}.html">${frontMatter.category}</a>
                    </span>
                    <span class="tags">
                        ${frontMatter.tags.map(tag => `<a href="#${tag}">${tag}</a>`).join('')}
                    </span>
                </div>
                <div class="post-content size-medium">
                    ${html}
                </div>
            </article>
            ${toc}
        </div>
        <!-- 添加字体大小控制面板 -->
        <div class="font-size-control">
            <div class="font-size-slider">
                <span class="text-icon">A</span>
                <input type="range" min="10" max="30" step="1" value="18" id="fontSizeSlider">
                <span class="text-icon large">A</span>
                <span class="current-size">18px</span>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p>&copy; 2025 我的博客. All rights reserved.</p>
    </footer>

    <script>
    // 字体大小控制
    function updateFontSize(size) {
        const content = document.querySelector('.post-content');
        content.style.fontSize = size + 'px';
        document.querySelector('.current-size').textContent = size + 'px';
        // 保存用户选择到 localStorage
        localStorage.setItem('preferred-font-size', size);
    }

    // 页面加载时恢复用户的字体大小选择
    document.addEventListener('DOMContentLoaded', function() {
        const slider = document.getElementById('fontSizeSlider');
        const preferredSize = localStorage.getItem('preferred-font-size') || '18';
        
        if (preferredSize) {
            slider.value = preferredSize;
            updateFontSize(preferredSize);
        }

        // 监听滑动条变化
        slider.addEventListener('input', function() {
            updateFontSize(this.value);
        });
        
        // 其他现有的 DOMContentLoaded 代码...
        const headings = document.querySelectorAll('.post-content h1, .post-content h2, .post-content h3');
        const tocLinks = document.querySelectorAll('.toc-list a');
        
        // 目录滚动高亮和点击处理
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').slice(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    // 获取header的高度
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    // 计算目标位置，考虑header的高度
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    // 平滑滚动
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // 监听滚动，高亮当前位置的目录项
        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px -70% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 移除所有激活状态
                    tocLinks.forEach(link => link.classList.remove('active'));
                    // 找到对应的目录项并添加激活状态
                    const activeLink = document.querySelector(\`.toc-list a[href="#\${entry.target.id}"]\`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }, observerOptions);

        // 观察所有标题元素
        headings.forEach(heading => observer.observe(heading));
    });
    </script>
</body>
</html>`;

    return template;
}

async function generatePostsIndex() {
    const posts = new Map(); // 使用 Map 来存储文章，以路径为键
    const contentDir = path.join(__dirname, '../content');
    const blogsDir = path.join(__dirname, '../blogs');
    
    // 扫描 Markdown 文章目录
    async function scanMarkdownDirectory(dir) {
        try {
            const files = await fs.readdir(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.stat(filePath);
            
            if (stat.isDirectory()) {
                    await scanMarkdownDirectory(filePath);
                } else if (file.endsWith('.md')) {
                    // 读取并解析 markdown 文件
                    const content = await fs.readFile(filePath, 'utf-8');
                    const { data: frontMatter, content: markdown } = matter(content);
                    
                    // 生成 HTML 文件路径
                    const htmlPath = path.join(
                        blogsDir,
                        new Date(frontMatter.date).getFullYear().toString(),
                        (new Date(frontMatter.date).getMonth() + 1).toString().padStart(2, '0'),
                        file.replace('.md', '.html')
                    );
                    
                    // 确保目录存在
                    await fs.mkdir(path.dirname(htmlPath), { recursive: true });
                    
                    // 生成并保存 HTML 文件
                    const html = await generateHtml(markdown, frontMatter);
                    await fs.writeFile(htmlPath, html);
                    
                    // 使用相对路径作为键，确保不会重复添加相同路径的文章
                    const relativePath = path.relative(process.cwd(), htmlPath);
                    posts.set(relativePath, {
                        ...frontMatter,
                        path: relativePath
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }

    // 扫描并转换 Markdown 文章
    await scanMarkdownDirectory(contentDir);
    
    // 将 Map 转换为数组并按日期排序
    const sortedPosts = Array.from(posts.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 生成新的 posts.json
    await fs.writeFile(
        path.join(blogsDir, 'posts.json'),
        JSON.stringify(sortedPosts, null, 2)
    );

    console.log(`Generated posts.json with ${sortedPosts.length} articles`);
}

// 执行生成
generatePostsIndex().catch(console.error); 