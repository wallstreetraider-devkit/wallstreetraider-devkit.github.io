document.addEventListener('DOMContentLoaded', function () {
    const gh = document.getElementById('github-link-item');
    if (gh) {
        const rightNav = document.querySelector('.navbar-right-items');
        if (rightNav) {
            const wrapper = document.createElement('div');
            wrapper.className = 'navbar-right-item';
            
            const link = gh.cloneNode(true);
            link.style.display = 'flex';
            link.style.alignItems = 'center';
            link.style.justifyContent = 'center';
            link.style.padding = '8px';
            link.style.color = 'var(--navbar-item-color)';
            link.style.textDecoration = 'none';
            link.innerHTML = '<i class="fab fa-github" style="font-size: 20px;"></i>';
            
            wrapper.appendChild(link);
            // Insert before the search button
            rightNav.insertBefore(wrapper, rightNav.firstChild);
            
            // Hide the original one in left nav
            const originalParent = gh.closest('.navbar-item');
            if (originalParent) originalParent.style.display = 'none';
        }
    }
});
