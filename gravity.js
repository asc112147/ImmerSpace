let scene, camera, renderer, clock, controls;
let projectile, trajectoryLine, launcher;
let isFlying = false;

// Physics State
let pos = new THREE.Vector3(0, 0, 0);
let vel = new THREE.Vector3(0, 0, 0);
let pathPoints = [];
let maxH = 0;
let prevPosX = 0;

// Configs
const ENV = {
    sun: { g: 274, color: 0xffcc00 },
    mercury: { g: 3.7, color: 0x888888 },
    venus: { g: 8.87, color: 0xe3bb76 },
    earth: { g: 9.8, color: 0x1e3a8a },
    moon: { g: 1.62, color: 0xcccccc },
    mars: { g: 3.72, color: 0xc1440e },
    jupiter: { g: 24.79, color: 0x92400e },
    saturn: { g: 10.44, color: 0xead6b8 },
    uranus: { g: 8.69, color: 0xd1e7e7 },
    neptune: { g: 11.15, color: 0x274687 },
    pluto: { g: 0.62, color: 0xaaaaaa }
};
let currentG = 9.8;
let params = { angle: 45, force: 20, mass: 1.0 };

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 150, 800);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(30, 15, 60);
    camera.lookAt(15, 5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(15, 5, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 100, 50);
    scene.add(sun);

    // Ground
    const grid = new THREE.GridHelper(1000, 200, 0x3b82f6, 0x111111);
    grid.position.x = 400;
    scene.add(grid);

    // Launcher
    launcher = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 16), new THREE.MeshPhongMaterial({ color: 0x666666 }));
    tube.rotation.z = Math.PI / 2;
    tube.position.x = 1.5;
    launcher.add(base);
    launcher.add(tube);
    scene.add(launcher);

    // Projectile
    const projGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const projMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x3b82f6, emissiveIntensity: 0.5 });
    projectile = new THREE.Mesh(projGeo, projMat);
    projectile.visible = false;
    scene.add(projectile);

    // Trajectory
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 });
    const lineGeo = new THREE.BufferGeometry();
    trajectoryLine = new THREE.Line(lineGeo, lineMat);
    scene.add(trajectoryLine);

    updateParams();
    window.addEventListener('resize', onResize);
    animate();
}

function syncInput(param, source) {
    const rangeEl = document.getElementById(`input-${param}`);
    const numEl = document.getElementById(`num-${param}`);
    
    if (source === 'range') {
        numEl.value = rangeEl.value;
    } else {
        rangeEl.value = numEl.value;
    }
    updateParams();
}

function resetCamera() {
    if (prevPosX !== 0) {
        camera.position.x -= prevPosX;
        controls.target.x -= prevPosX;
        controls.update();
        prevPosX = 0;
    }
}

function updateParams() {
    params.angle = parseFloat(document.getElementById('num-angle').value) || 0;
    params.force = parseFloat(document.getElementById('num-force').value) || 0;
    params.mass = parseFloat(document.getElementById('num-mass').value) || 0.1;

    // 更新砲台角度
    launcher.children[1].rotation.z = (params.angle * Math.PI) / 180;

    if (!isFlying) {
        resetCamera();
        predictPath();
    }
}

function setEnv(key) {
    currentG = ENV[key].g;
    document.querySelectorAll('.planet-selector').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${key}`).classList.add('active');
    document.getElementById('stat-g').innerText = (currentG / 9.8).toFixed(2);
    if (!isFlying) {
        resetCamera();
        predictPath();
    }
}

function predictPath() {
    const points = [];
    const rad = (params.angle * Math.PI) / 180;
    const v0x = params.force * Math.cos(rad);
    const v0y = params.force * Math.sin(rad);

    for (let t = 0; t < 20; t += 0.1) {
        const x = v0x * t;
        const y = v0y * t - 0.5 * currentG * t * t;
        if (y < 0) break;
        points.push(new THREE.Vector3(x, y, 0));
    }
    trajectoryLine.geometry.setFromPoints(points);
}

function launchProjectile() {
    if (isFlying) return;

    // 將相機與目標物退回前一次自動跟隨所累積的 X 向位移
    // 這樣可以保留使用者手動縮放與旋轉的角度，同時將中心拉回發射台
    resetCamera();

    isFlying = true;
    projectile.visible = true;
    pos.set(0, 0, 0);
    pathPoints = [pos.clone()];

    const rad = (params.angle * Math.PI) / 180;
    vel.x = params.force * Math.cos(rad);
    vel.y = params.force * Math.sin(rad);

    document.getElementById('status-text').innerText = "物體飛行中...";
    document.getElementById('status-text').className = "text-emerald-400 ml-2 animate-pulse";

    maxH = 0;
}

function animate() {
    requestAnimationFrame(animate);

    if (isFlying) {
        const dt = 0.016;

        // 物理運動
        vel.y -= currentG * dt;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        projectile.position.copy(pos);
        pathPoints.push(pos.clone());

        trajectoryLine.geometry.setFromPoints(pathPoints);

        if (pos.y > maxH) maxH = pos.y;

        // 更新數據顯示 (增加安全檢查)
        const rangeEl = document.getElementById('stat-range');
        const heightEl = document.getElementById('stat-height');
        if (rangeEl) rangeEl.innerText = pos.x.toFixed(1) + "m";
        if (heightEl) heightEl.innerText = maxH.toFixed(1) + "m";

        if (pos.y <= 0) {
            isFlying = false;
            pos.y = 0;
            projectile.position.copy(pos);

            // 落地衝擊力
            const impact = Math.abs(vel.y) * params.mass * 10;
            const impactEl = document.getElementById('impact-value');
            const statusEl = document.getElementById('status-text');

            if (impactEl) impactEl.innerText = impact.toFixed(2) + " kN";
            if (statusEl) {
                statusEl.innerText = "任務完成 - 物體已著陸";
                statusEl.className = "text-blue-500 ml-2";
            }
        }

        // 相機自動跟隨，兼顧客戶端操作工具
        const dx = pos.x - prevPosX;
        camera.position.x += dx;
        controls.target.x += dx;
        prevPosX = pos.x;
    }

    controls.update();
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
