// 緩存常用的 DOM 節點與視窗尺寸，減少即時運算負擔
const gridPlane = document.querySelector('.grid-plane');
let winWidth = window.innerWidth;
let winHeight = window.innerHeight;

// 監聽視窗調整大小，更新尺寸變數
window.addEventListener('resize', () => {
    winWidth = window.innerWidth;
    winHeight = window.innerHeight;
});

// 滑鼠移動時背景網格輕微偏移
document.addEventListener('mousemove', (e) => {
    if (!gridPlane) return;
    // 簡化變數運算
    const moveX = (e.clientX / winWidth - 0.5) * 20;
    const moveY = (e.clientY / winHeight - 0.5) * 20;
    gridPlane.style.transform = `perspective(500px) rotateX(60deg) translate(${moveX}px, ${moveY}px)`;
});

// 啟動模組並執行載入與白閃轉場動畫
function launchModule(url, progressId = 'progress-1') {
    const progressBar = document.getElementById(progressId);
    const overlay = document.getElementById('transition-overlay');
    
    if (!progressBar || !overlay) return;

    let width = 0;
    
    // 模擬資源載入動畫
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            
            // 執行白閃轉場
            overlay.style.pointerEvents = 'auto';
            overlay.style.opacity = '1';
            
            setTimeout(() => {
                window.location.href = url;
            }, 800);
        } else {
            width += Math.random() * 15;
            if (width > 100) width = 100;
            progressBar.style.width = `${width}%`;
        }
    }, 100);
}
