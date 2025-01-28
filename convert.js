const fs = require('fs');
const marked = require('marked');
const path = require('path');

// 配置 marked
marked.setOptions({
    highlight: function(code, lang) {
        const hljs = require('highlight.js');
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(lang, code).value;
        }
        return code;
    }
});

// 读取模板
const template = fs.readFileSync('template.html', 'utf-8');

// 监听 blogs 目录
fs.watch('blogs', { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
        console.log(`检测到文件变化: ${filename}`);
        convertMarkdownToHtml(`blogs/${filename}`);
    }
});

function convertMarkdownToHtml(mdFile) {
    try {
        // 读取 markdown 文件
        const markdown = fs.readFileSync(mdFile, 'utf-8');
        
        // 解析 frontmatter
        const frontmatter = markdown.match(/---\n([\s\S]*?)\n---/)[1];
        const content = markdown.replace(/---\n[\s\S]*?\n---/, '');
        
        // 转换 markdown 到 HTML
        const htmlContent = marked.parse(content);
        
        // 解析 frontmatter 数据
        const meta = {};
        frontmatter.split('\n').forEach(line => {
            const [key, ...values] = line.split(':');
            if (key && values.length) {
                meta[key.trim()] = values.join(':').trim();
            }
        });
        
        // 将内容插入模板
        let html = template
            .replace('{{title}}', meta.title)
            .replace('{{content}}', htmlContent);
        
        // 写入 HTML 文件
        const htmlFile = mdFile.replace('.md', '.html');
        fs.writeFileSync(htmlFile, html);
        console.log(`已生成: ${htmlFile}`);
        
        // 更新 posts.json
        updatePostsJson(mdFile, meta);
    } catch (error) {
        console.error(`转换失败: ${mdFile}`, error);
    }
}

function updatePostsJson(mdFile, meta) {
    const postsFile = 'blogs/posts.json';
    let posts = [];
    
    if (fs.existsSync(postsFile)) {
        posts = JSON.parse(fs.readFileSync(postsFile, 'utf-8'));
    }
    
    // 更新或添加文章信息
    const index = posts.findIndex(p => p.path === mdFile);
    const post = {
        title: meta.title,
        date: meta.date,
        category: meta.category,
        tags: eval(meta.tags), // 注意：这里假设 tags 是数组格式
        excerpt: meta.excerpt,
        path: mdFile
    };
    
    if (index >= 0) {
        posts[index] = post;
    } else {
        posts.push(post);
    }
    
    // 按日期排序
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 保存更新后的 posts.json
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
}

// 初始转换所有 markdown 文件
function convertAllMarkdowns() {
    const walkSync = (dir, filelist = []) => {
        fs.readdirSync(dir).forEach(file => {
            const dirFile = path.join(dir, file);
            if (fs.statSync(dirFile).isDirectory()) {
                filelist = walkSync(dirFile, filelist);
            } else if (file.endsWith('.md')) {
                filelist.push(dirFile);
            }
        });
        return filelist;
    };
    
    const mdFiles = walkSync('blogs');
    mdFiles.forEach(file => convertMarkdownToHtml(file));
}

convertAllMarkdowns(); 