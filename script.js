// 初始化粒子背景
particlesJS("particles-js", {
    "particles": {
        "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
        "color": { "value": "#ffffff" },
        "shape": { "type": "circle" },
        "opacity": { "value": 0.2, "random": true },
        "size": { "value": 2, "random": true },
        "line_linked": { "enable": true, "distance": 150, "color": "#3b82f6", "opacity": 0.1, "width": 1 },
        "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out" }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" } },
        "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.4 } } }
    }
});

// 頁面滾動顯示動畫
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // 如果有計數器動畫
            if (entry.target.querySelector('.counter')) {
                startCounters(entry.target);
            }
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// 數字增長動畫
function startCounters(container) {
    container.querySelectorAll('.counter').forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const updateCount = () => {
            const count = +counter.innerText;
            const speed = target / 50;
            if (count < target) {
                counter.innerText = Math.ceil(count + speed);
                setTimeout(updateCount, 20);
            } else {
                counter.innerText = target + (target > 1000 ? '+' : '');
            }
        };
        updateCount();
    });
}

// 進入 3D 場景邏輯
function enter3D() {
    document.body.style.transition = 'opacity 1s ease';
    document.body.style.opacity = '0';
    setTimeout(() => {
        // 在演示中我們創建一個加載層
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black flex items-center justify-center z-[10000] text-white';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-8 mx-auto"></div>
                <h2 class="text-2xl font-black italic tracking-widest uppercase mb-2">傳輸中...</h2>
                <p class="text-gray-500 text-xs tracking-widest uppercase">正在構建天文教育場景伺服器</p>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.opacity = '1';

        // 3秒後過渡到傳送中心選單
        setTimeout(() => {
            window.location.href = 'menu.html';
        }, 3000);
    }, 1000);
}

// 捲動至展覽區
function scrollToExhibits() {
    document.getElementById('exhibits').scrollIntoView({ behavior: 'smooth' });
}

// 移除加載層與綁定 UI 事件
window.addEventListener('load', () => {
    // 綁定按鈕
    document.getElementById('btn-start').addEventListener('click', scrollToExhibits);
    document.getElementById('card-demo').addEventListener('click', enter3D);

    // 處理加載層
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 1000);
    }, 800);

    // Slider horizontal drag
    const slider = document.getElementById('exhibits-grid');
    if (slider) {
        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        slider.addEventListener('mousemove', (e) => {
            if(!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });

        // Carousel Buttons
        const leftBtn = document.querySelector('.carousel-controls .control-btn:first-child');
        const rightBtn = document.querySelector('.carousel-controls .control-btn:last-child');
        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                slider.scrollBy({ left: -340, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                slider.scrollBy({ left: 340, behavior: 'smooth' });
            });
        }
    }
});
