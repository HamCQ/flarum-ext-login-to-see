import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import CommentPost from 'flarum/forum/components/CommentPost';
import LoginModal from 'flarum/forum/components/LoginModal';

app.initializers.add('hamcq/login-to-see', () => {
  // 占位图片 SVG - 简洁毛玻璃效果（带圆角，更小尺寸提示）
  const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Cdefs%3E%3CclipPath id='round'%3E%3Crect width='600' height='400' rx='4' ry='4'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg clip-path='url(%23round)'%3E%3Crect width='600' height='400' fill='%23f0f0f0'/%3E%3C/g%3E%3Crect x='175' y='165' width='250' height='70' rx='12' fill='%23ffffff' fill-opacity='0.6' stroke='%23e0e0e0' stroke-width='1'/%3E%3Ctext x='300' y='193' font-family='system-ui,-apple-system,sans-serif' font-size='16' fill='%23666' text-anchor='middle' font-weight='500'%3E🔒 请登录后查看图片%3C/text%3E%3Ctext x='300' y='215' font-family='system-ui,-apple-system,sans-serif' font-size='12' fill='%23999' text-anchor='middle'%3ELogin to view image%3C/text%3E%3C/svg%3E";
  
  // 替换图片的函数
  function replaceImagesInHtml(html) {
    if (!html) return html;
    
    // 使用正则替换所有 img 标签的 src
    return html.replace(
      /<img([^>]*)\ssrc="([^"]+)"([^>]*)>/gi,
      (match, before, src, after) => {
        // 跳过已经是 placeholder 的图片
        if (src.startsWith('data:image/svg+xml')) return match;
        
        return `<img${before} src="${placeholderSvg}" data-original-src="${src}" class="login-required-image" style="cursor:pointer;border-radius:4px;max-width:400px;max-height:267px;width:auto;height:auto;display:block;margin:0 auto;" title="🔒 请登录后查看图片"${after}>`;
      }
    );
  }
  
  // 扩展 CommentPost 的 bodyItems 方法
  override(CommentPost.prototype, 'bodyItems', function(original) {
    const items = original();
    
    // 如果用户已登录，不做任何修改
    if (app.session.user) {
      return items;
    }
    
    // 获取 content 项
    const contentItem = items.get('content');
    
    if (contentItem && !this.isEditing()) {
      // 获取原始 HTML
      const originalHtml = this.attrs.post.contentHtml();
      
      // 替换图片
      const modifiedHtml = replaceImagesInHtml(originalHtml);
      
      // 替换 content 项
      items.replace('content', m.trust(modifiedHtml));
    }
    
    return items;
  });
  
  // 添加点击事件（在 oncreate 中处理）
  extend(CommentPost.prototype, 'oncreate', function(vnode) {
    if (app.session.user) return;
    if (!vnode || !vnode.dom) return;
    
    const postBody = vnode.dom.querySelector('.Post-body');
    if (!postBody) return;
    
    postBody.querySelectorAll('.login-required-image').forEach(img => {
      if (img.dataset.listenerAdded) return;
      img.dataset.listenerAdded = 'true';
      
      img.addEventListener('click', (e) => {
        e.preventDefault();
        app.modal.show(LoginModal);
      });
    });
  });
});
