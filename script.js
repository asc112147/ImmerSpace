let scene, camera, renderer, starfield;
let planets = [];
let meteors = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let collectedPlanets = new Set();
let currentPlanetIndex = -1;
let loadingManager;
let gltfLoader;

let trackingTarget = null;
let isDragging = false;

let timeScale = 1;

let targetRotationX = 0.4, targetRotationY = 0;
let currentRotationX = 0.4, currentRotationY = 0;
let lastMouseX, lastMouseY;

let defaultDist = 320;
let cameraDistance = defaultDist;
let targetDistance = defaultDist;

let currentLookAt = new THREE.Vector3(0, 0, 0);
let targetLookAt = new THREE.Vector3(0, 0, 0);

const planetKeys = ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const planetData = {
    'Sun': { name: '太陽', tag: '恆星', desc: '太陽系的母星，佔據全系 99.8% 的質量。其核心溫度高達 1500 萬度。', mass: '333,000 地球質量', dist: '0.00 AU', color: 0xffcc33, size: 10, orbit: 0, speed: 0 },
    'Mercury': { name: '水星', tag: '行星', desc: '距離太陽最近，晝夜溫差極大。由於大氣稀薄，其表面佈滿數十億年的撞擊坑。', mass: '0.055 地球質量', dist: '0.39 AU', color: 0xaaaaaa, size: 1.2, orbit: 25, speed: 0.035 },
    'Venus': { name: '金星', tag: '行星', desc: '太陽系最熱的行星，厚重的硫酸雲層引發極端溫室效應，壓力是地球的 90 倍。', mass: '0.815 地球質量', dist: '0.72 AU', color: 0xffd39b, size: 2.2, orbit: 38, speed: 0.025 },
    'Earth': { name: '地球', tag: '行星', desc: '人類唯一的家園。擁有完美的磁場防護、液態水與富含氧氣的大氣層。', mass: '1.000 基準單位', dist: '1.00 AU', color: 0x1e90ff, size: 2.4, orbit: 52, speed: 0.018 },
    'Moon': { name: '月球', tag: '衛星', desc: '地球唯一的天然衛星，自轉與公轉同步，是人類曾踏上的唯一地外星體。', mass: '0.012 地球質量', dist: '384,000 km', color: 0xdddddd, size: 0.6, orbit: 5, speed: 0.06, parent: 'Earth' },
    'Mars': { name: '火星', tag: '行星', desc: '紅色星球，擁有太陽系最高的山脈「奧林帕斯山」與長達 4000 公里的峽谷。', mass: '0.107 地球質量', dist: '1.52 AU', color: 0xff4500, size: 1.8, orbit: 70, speed: 0.014 },
    'Jupiter': { name: '木星', tag: '行星', desc: '巨大的氣態行星，保護了內太陽系免受小行星撞擊。擁有著名的大紅斑風暴。', mass: '317.8 地球質量', dist: '5.20 AU', color: 0xffa54f, size: 5.5, orbit: 95, speed: 0.009 },
    'Saturn': { name: '土星', tag: '行星', desc: '擁有壯麗的環系統，密度比水還低。如果有一個足夠大的泳池，土星能浮在上面。', mass: '95.2 地球質量', dist: '9.54 AU', color: 0xdfccaa, size: 4.8, orbit: 120, speed: 0.007, hasRing: true },
    'Uranus': { name: '天王星', tag: '行星', desc: '躺著旋轉的冰巨星，其傾角高達 98 度。大氣中含有大量的冰。', mass: '14.5 地球質量', dist: '19.2 AU', color: 0x00f5ff, size: 3.2, orbit: 145, speed: 0.005 },
    'Neptune': { name: '海王星', tag: '行星', desc: '最遙遠的行星，大氣呈現深藍色，風速可達超音速，是極端寒冷的冰巨星。', mass: '17.1 地球質量', dist: '30.1 AU', color: 0x4169e1, size: 3.2, orbit: 170, speed: 0.004 }
};

function init() {
    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.innerText = `正在載入星圖資源 ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
    };
    loadingManager.onLoad = () => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }
    };
    gltfLoader = new THREE.GLTFLoader(loadingManager);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x555555));
    const sunLight = new THREE.PointLight(0xffffff, 2.8, 2500);
    scene.add(sunLight);

    createStarfield();
    createPlanets();

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    renderer.domElement.addEventListener('touchstart', (e) => onStart(e.touches[0]), { passive: false });
    window.addEventListener('touchmove', (e) => onMove(e.touches[0]), { passive: false });
    window.addEventListener('touchend', onEnd);

    window.addEventListener('wheel', (e) => {
        if (e.target.closest('.interactable')) return;
        targetDistance = Math.max(5, Math.min(1500, targetDistance + e.deltaY * 0.4));
    }, { passive: true });

    // 綁定 UI 事件
    document.getElementById('btn-restart').addEventListener('click', () => location.reload());
    document.getElementById('btn-close').addEventListener('click', () => window.history.back());
    document.getElementById('btn-exit').addEventListener('click', handleExit);
    document.getElementById('btn-stop-track').addEventListener('click', (e) => { closeInfo(); e.stopPropagation(); });
    document.getElementById('btn-prev').addEventListener('click', prevPlanet);
    document.getElementById('btn-next').addEventListener('click', nextPlanet);
    document.getElementById('info-panel').addEventListener('click', (e) => e.stopPropagation());

    const timeSlider = document.getElementById('time-slider');
    if (timeSlider) {
        timeSlider.addEventListener('input', (e) => {
            timeScale = parseFloat(e.target.value);
            document.getElementById('time-display').innerText = timeScale.toFixed(1) + 'x';
        });
        timeSlider.addEventListener('mousedown', (e) => e.stopPropagation());
        timeSlider.addEventListener('touchstart', (e) => e.stopPropagation());
        // For stopping interactions underneath
        const timePanel = timeSlider.closest('.time-panel');
        if (timePanel) {
            timePanel.addEventListener('wheel', (e) => e.stopPropagation(), {passive: true});
        }

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(btn.getAttribute('data-speed'));
                timeScale = speed;
                timeSlider.value = speed;
                document.getElementById('time-display').innerText = speed.toFixed(1) + 'x';
            });
            btn.addEventListener('mousedown', (e) => e.stopPropagation());
            btn.addEventListener('touchstart', (e) => e.stopPropagation());
        });
    }

    document.getElementById('collect-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentPlanetIndex >= 0) {
            const currentId = planetKeys[currentPlanetIndex];
            if (!collectedPlanets.has(currentId)) {
                collect(currentId);
            }
        }
    });

    animate();
}

function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const cols = [];
    for (let i = 0; i < 18000; i++) {
        const r = 2500;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        const b = 0.5 + Math.random() * 0.5;
        cols.push(b, b, 1);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    starfield = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.7 }));
    scene.add(starfield);
}

function createMeteor() {
    const geom = new THREE.BufferGeometry();
    const head = new THREE.Vector3(
        (Math.random() - 0.5) * 4000,
        (Math.random() - 0.5) * 4000,
        (Math.random() - 0.5) * 4000
    );
    
    // Avoid spawning too close to the center
    if (head.length() < 1000) {
        head.setLength(1000 + Math.random() * 1500);
    }
    
    const dir = new THREE.Vector3(
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
        -1 + Math.random() * 2
    ).normalize();
    
    const streakLength = 300 + Math.random() * 500;
    const tail = head.clone().sub(dir.clone().multiplyScalar(streakLength));
    
    const positions = new Float32Array([
        head.x, head.y, head.z,
        tail.x, tail.y, tail.z
    ]);
    
    const colors = new Float32Array([
        0.8, 0.9, 1.0, // head (white-ish blue)
        0.0, 0.0, 0.0  // tail (fades to transparent)
    ]);
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    
    meteors.push({
        mesh: line,
        velocity: dir.multiplyScalar(60 + Math.random() * 60),
        life: 0,
        decay: 0.02 + Math.random() * 0.02,
        state: 'fadeIn'
    });
}

function createPlanets() {
    planetKeys.forEach(key => {
        const data = planetData[key];
        const group = new THREE.Group();
        group.name = key;
        group.userData = { angle: Math.random() * Math.PI * 2, distance: data.orbit, speed: data.speed, parent: data.parent, size: data.size };

        let modelFile = key + '.glb';
        if (key === 'Sun') modelFile = 'SUN.glb';
        if (key === 'Earth') modelFile = 'EarthClouds.glb';

        gltfLoader.load(`Planet/${modelFile}`, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const sizeVector = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(sizeVector.x, sizeVector.y, sizeVector.z);

            let scaleFactor = (data.size * 2) / maxDim;
            // Saturn has rings which makes its bounding box huge, manually boost size if target is Saturn
            if (key === 'Saturn') scaleFactor *= 2.2;
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);

            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center.multiplyScalar(scaleFactor));

            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (key === 'Sun') {
                        // 降低曝光強度並套用星體資料本身的色系，避免出現純白色過曝
                        child.material.emissive = new THREE.Color(data.color);
                        child.material.emissiveIntensity = 1.0;
                        if (child.material.map) child.material.emissiveMap = child.material.map;
                    }
                }
            });
            group.add(model);
        });

        if (data.orbit > 0 && !data.parent) {
            const orbitGeo = new THREE.RingGeometry(data.orbit - 0.12, data.orbit + 0.12, 128);
            const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.06 });
            const orbit = new THREE.Mesh(orbitGeo, orbitMat);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        }
        planets.push(group);
        scene.add(group);
    });
}

function onStart(e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planets, true);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj.parent && !planetKeys.includes(obj.name)) obj = obj.parent;
        if (obj.name) showPlanetInfo(obj.name);
    }
}

function onMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    targetRotationY += dx * 0.004;
    targetRotationX += dy * 0.004;
    targetRotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotationX));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function onEnd() { isDragging = false; }

function showPlanetInfo(id) {
    currentPlanetIndex = planetKeys.indexOf(id);
    const data = planetData[id];
    let imgFile = id === 'Sun' ? 'SUN.jpg' : `${id}.jpg`;
    document.getElementById('planet-image').src = `Planet/${imgFile}`;
    document.getElementById('current-focus').innerText = `追蹤目標: ${data.name}`;
    document.getElementById('planet-name').innerText = data.name;
    document.getElementById('planet-tag').innerText = data.tag;
    document.getElementById('planet-desc').innerText = data.desc;
    document.getElementById('planet-mass').innerText = data.mass;
    document.getElementById('planet-dist').innerText = data.dist;

    const btn = document.getElementById('collect-btn');
    if (collectedPlanets.has(id)) {
        btn.innerHTML = '<i class="fas fa-check-double"></i> 檔案已連結';
        btn.classList.add('collected');
    } else {
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> 掃描地表數據';
        btn.classList.remove('collected');
    }
    document.getElementById('info-panel').classList.add('active');
    trackingTarget = planets.find(p => p.name === id);
    targetDistance = data.size * 6.8;
}

function nextPlanet(e) { if (e) e.stopPropagation(); showPlanetInfo(planetKeys[(currentPlanetIndex + 1) % planetKeys.length]); }
function prevPlanet(e) { if (e) e.stopPropagation(); showPlanetInfo(planetKeys[(currentPlanetIndex - 1 + planetKeys.length) % planetKeys.length]); }
function closeInfo() { document.getElementById('info-panel').classList.remove('active'); document.getElementById('current-focus').innerText = '系統閒置中'; trackingTarget = null; targetDistance = defaultDist; }

function collect(id) {
    if (collectedPlanets.has(id)) return;
    collectedPlanets.add(id);
    const totalCollected = collectedPlanets.size;
    const totalCount = planetKeys.length;
    document.getElementById('progress-bar').style.width = `${(totalCollected / totalCount) * 100}%`;
    document.getElementById('progress-text').innerText = `${totalCollected} / ${totalCount}`;
    const toast = document.getElementById('achievement-toast');
    document.getElementById('achievement-name').innerText = planetData[id].name;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3500);
    showPlanetInfo(id);
}

function handleExit() {
    const screen = document.getElementById('summary-screen');
    const totalCollected = collectedPlanets.size;
    const totalCount = planetKeys.length;
    document.getElementById('final-count').innerText = totalCollected;
    document.getElementById('final-rate').innerText = `${Math.round((totalCollected / totalCount) * 100)}%`;
    let rank = "探險<br>實習生";
    if (totalCollected >= totalCount) rank = "太陽系<br>大師"; else if (totalCollected >= totalCount * 0.6) rank = "資深<br>偵察員"; else if (totalCollected >= 1) rank = "初級<br>探險家";
    document.getElementById('final-rank').innerHTML = rank;
    screen.classList.add('active');
}

function animate() {
    requestAnimationFrame(animate);
    planets.forEach(p => {
        const data = p.userData;

        // 預設自轉
        if (p.name !== 'Moon') {
            if (p.children.length > 0) p.children[0].rotation.y += 0.006 * timeScale;
        }

        if (data.speed > 0) {
            data.angle += data.speed * 0.08 * timeScale;
            if (data.parent) {
                const parent = planets.find(pl => pl.name === data.parent);
                p.position.set(parent.position.x + Math.cos(data.angle) * data.distance, 0, parent.position.z + Math.sin(data.angle) * data.distance);

                // 加入月球潮汐鎖定：永遠看向母星（地球）
                if (p.name === 'Moon' && p.children.length > 0) {
                    p.children[0].lookAt(parent.position);
                }
            } else {
                p.position.set(Math.cos(data.angle) * data.distance, 0, Math.sin(data.angle) * data.distance);
            }
        }
    });

    // 處理流星生成與更新
    let activeTimeScale = Math.abs(timeScale);
    let speedMult = timeScale;
    
    // 隨機生成機率：依時間流速線性變化，但設有上限
    if (activeTimeScale > 0 && Math.random() < Math.min(0.04 * activeTimeScale, 0.2)) {
        createMeteor();
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
        let m = meteors[i];
        
        const positions = m.mesh.geometry.attributes.position.array;
        positions[0] += m.velocity.x * speedMult;
        positions[1] += m.velocity.y * speedMult;
        positions[2] += m.velocity.z * speedMult;
        positions[3] += m.velocity.x * speedMult;
        positions[4] += m.velocity.y * speedMult;
        positions[5] += m.velocity.z * speedMult;
        m.mesh.geometry.attributes.position.needsUpdate = true;
        
        if (m.state === 'fadeIn') {
            m.life += m.decay * activeTimeScale;
            if (m.life >= 1) {
                m.life = 1;
                m.state = 'fadeOut';
            }
        } else {
            m.life -= m.decay * activeTimeScale;
        }
        
        m.mesh.material.opacity = m.life;
        
        if (m.life <= 0 && m.state === 'fadeOut') {
            scene.remove(m.mesh);
            m.mesh.geometry.dispose();
            m.mesh.material.dispose();
            meteors.splice(i, 1);
        }
    }

    currentRotationX += (targetRotationX - currentRotationX) * 0.08;
    currentRotationY += (targetRotationY - currentRotationY) * 0.08;
    cameraDistance += (targetDistance - cameraDistance) * 0.05;

    let baseCenter = new THREE.Vector3(0, 0, 0);
    if (trackingTarget) baseCenter.copy(trackingTarget.position);

    camera.position.x = baseCenter.x + cameraDistance * Math.sin(currentRotationY) * Math.cos(currentRotationX);
    camera.position.y = baseCenter.y + cameraDistance * Math.sin(currentRotationX);
    camera.position.z = baseCenter.z + cameraDistance * Math.cos(currentRotationY) * Math.cos(currentRotationX);

    if (trackingTarget) {
        const right = new THREE.Vector3();
        camera.matrixWorld.extractBasis(right, new THREE.Vector3(), new THREE.Vector3());

        const isDesktop = window.innerWidth > 1024;
        const offsetFactor = isDesktop ? -0.28 : 0;
        const finalOffset = right.multiplyScalar(cameraDistance * offsetFactor);
        targetLookAt.copy(baseCenter).add(finalOffset);
    } else {
        targetLookAt.set(0, 0, 0);
    }

    currentLookAt.lerp(targetLookAt, 0.1);
    camera.lookAt(currentLookAt);
    starfield.rotation.y += 0.0001;
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
