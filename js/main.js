// 滚动时改变导航栏样式
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        header.style.backgroundColor = '#fff';
    }
});

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 加载并显示文章列表
async function loadPosts() {
    try {
        console.log('开始加载文章...');
        const response = await fetch('/blogs/posts.json');
        const posts = await response.json();
        console.log('所有文章:', posts);
        
        // 获取当前页面的类别
        const currentPage = decodeURIComponent(window.location.pathname.split('/').pop().replace('.html', ''));
        console.log('当前页面类别:', currentPage);
        
        // 根据当前页面过滤文章
        const filteredPosts = currentPage === '' || currentPage === 'index' 
            ? posts 
            : posts.filter(post => post.category === currentPage);
        console.log('过滤后的文章:', filteredPosts);
        
        const blogPosts = document.querySelector('.blog-posts');
        if (!blogPosts) {
            console.error('找不到.blog-posts元素');
            return;
        }
        
        console.log('开始渲染文章列表...');
        blogPosts.innerHTML = filteredPosts.map(post => `
            <article class="post">
                <h2>${post.title}</h2>
                <div class="post-meta">
                    <span class="date">${formatDate(post.date)}</span>
                    <span class="category">
                        <a href="/${post.category.toLowerCase()}.html">${post.category}</a>
                    </span>
                    <span class="tags">
                        ${post.tags.map(tag => `
                            <a href="#${tag}">${tag}</a>
                        `).join('')}
                    </span>
                </div>
                <p class="post-excerpt">${post.excerpt}</p>
                <a href="/${post.path}" class="read-more" data-type="${post.path.endsWith('.md') ? 'markdown' : 'html'}">阅读更多</a>
            </article>
        `).join('');
        console.log('文章列表渲染完成');

        // 为所有文章链接添加点击事件
        document.querySelectorAll('.read-more').forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const url = this.href;
                const type = this.dataset.type;

                // 获取文章内容
                if (type === 'markdown') {
                    const content = await renderMarkdown(url);
                    document.querySelector('.blog-posts').innerHTML = content;
                } else {
                    window.location.href = url;
                }
            });
        });
    } catch (error) {
        console.error('加载文章列表失败:', error);
        const blogPosts = document.querySelector('.blog-posts');
        if (blogPosts) {
            blogPosts.innerHTML = '<p class="error-message">加载文章失败，请刷新页面重试</p>';
        }
    }
}

// 在需要显示文章的页面执行加载
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    console.log('检查是否需要加载文章, 当前页面:', currentPage);
    // 只在首页、技术、读书页面加载文章
    if (currentPage === '' || currentPage === 'index' || 
        currentPage === '技术' || currentPage === '%E6%8A%80%E6%9C%AF' || 
        currentPage === '读书' || currentPage === '%E8%AF%BB%E4%B9%A6') {
        console.log('需要加载文章');
        loadPosts();
    } else {
        console.log('不需要加载文章');
    }
}); 