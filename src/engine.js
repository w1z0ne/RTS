var cameraPosition = [33, 137, 44]

//生成的纹理的分辨率，纹理必须是标准的尺寸 256*256 1024*1024  2048*2048
var resolution = 2048;
var fbo;

GAMES202Main();

async function GAMES202Main() {
	// Init canvas and gl
	const canvas = document.querySelector('#glcanvas');
	canvas.width = window.screen.width;
	canvas.height = window.screen.height;
	const gl = canvas.getContext('webgl2');
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}
	/*
	var ext = gl.getExtension("OES_texture_float");
	if (!ext) {
		console.error("OES_texture_float extension not supported");
	}
	*/
	var ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) {
            console.log('需要扩展 EXT_color_buffer_float');
            return error();
        }
	// Add camera
	const camera = new THREE.PerspectiveCamera(75, gl.canvas.clientWidth / gl.canvas.clientHeight, 1e-2, 1000);
	camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

	// Add resize listener
	function setSize(width, height) {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
	setSize(canvas.clientWidth, canvas.clientHeight);
	window.addEventListener('resize', () => setSize(canvas.clientWidth, canvas.clientHeight));

	// Add camera control
	const cameraControls = new THREE.OrbitControls(camera, canvas);
	cameraControls.enableZoom = true;
	cameraControls.enableRotate = true;
	cameraControls.enablePan = true;
	cameraControls.rotateSpeed = 0.3;
	cameraControls.zoomSpeed = 1.0;
	cameraControls.panSpeed = 0.8;
	cameraControls.target.set(0, 0, 0);

	// Add renderer
	const renderer = new WebGLRenderer(gl, camera);

	
	// Add lights
	// light - is open shadow map == true
	let lightPos1 = [120, 100, 0];
	let focalPoint = [0, 0, 0];
	let lightUp = [0, 1, 0]
	// 改一下第一个光源的亮度
	const directionLight = new DirectionalLight(2500, [1, 1, 1], lightPos1, focalPoint, lightUp, true, renderer.gl);

	await renderer.addSat();
	renderer.addLight(directionLight);

	// 添加第二个光源
	let lightPos2 = [0, 140, 120];
	const directionLight2 = new DirectionalLight(2500, [1, 1, 1], lightPos2, focalPoint, lightUp, true, renderer.gl);
	renderer.addLight(directionLight2);
	

	// Add shapes
	let floorTransform = setTransform(0, 0, -30, 0, 0, 0, 6, 6, 6);
	let obj1Transform = setTransform(0, 0, 0, 0, 0, 0, 20, 20, 20);
	let obj2Transform = setTransform(-30, 0, -40, 0, 0, 0, 0.6, 0.6, 0.6);
	let rubbishTransform = setTransform(-80, 0, 0, 0, 0, 0,16, 16, 16);
	let containerTransform = setTransform(80, 0, 0, 0, 0, 0,6, 6, 6);
	let ballTransform = setTransform(20, 20, 20, 0, 0, 0, 30, 30, 30);
	

	loadOBJ(renderer, 'assets/mary/', 'Marry', 'PhongMaterial', obj1Transform);
	loadOBJ(renderer, 'assets/mario/', 'mario', 'PhongMaterial', obj2Transform);
	//loadOBJ(renderer, 'assets/rubbish/', 'rubbish', 'PhongMaterial', rubbishTransform);
	loadOBJ(renderer, 'assets/floor/', 'floor', 'PhongMaterial', floorTransform);
	loadOBJ(renderer, 'assets/ball/', 'ball', 'PhongMaterial', ballTransform);
	//loadOBJ(renderer, 'assets/container/', 'container', 'PhongMaterial', containerTransform);
	//renderer.satShader=await buildSatShader(gl,"./src/shaders/satShader/vert.glsl","./src/shaders/satShader/frag.glsl",{'attribs':['aVertexPosition'],'uniforms':['uInputTexture']})

	function createGUI() {
		const gui = new dat.gui.GUI();
		// const panelModel = gui.addFolder('Model properties');
		// panelModelTrans.add(GUIParams, 'x').name('X');
		// panelModel.open();
	}
	createGUI();

	// deltaTime实现
	let prevTime = 0;

	const interval =1000/60;
	function mainLoop(now) {
		cameraControls.update();
		if(now-prevTime>interval){
			let deltaime = (now - prevTime) / 1000;
			renderer.render(now, deltaime);
			prevTime = now;
		}

		requestAnimationFrame(mainLoop);

	}
	
	requestAnimationFrame(mainLoop);
	//renderer.render()
}

// 添加rotate参数
function setTransform(t_x, t_y, t_z, r_x, r_y, r_z, s_x, s_y, s_z) {

	return {
		modelTransX: t_x,
		modelTransY: t_y,
		modelTransZ: t_z,
		modelRotateX: r_x,
		modelRotateY: r_y,
		modelRotateZ: r_z,
		modelScaleX: s_x,
		modelScaleY: s_y,
		modelScaleZ: s_z,
	};
}


function degrees2Radians(degrees){
	return 3.1415927 / 180 * degrees;
}

