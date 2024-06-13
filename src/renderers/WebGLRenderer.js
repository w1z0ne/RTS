class WebGLRenderer {
    meshes = [];
    shadowMeshes = [];
    lights = [];
    names=[];
    ballUp=1;
    satRenderX=null;
    satRenderY=null;
    useSat=true;
    constructor(gl, camera) {
        this.gl = gl;
        this.camera = camera;

    }

    async addSat(){
        this.satRenderX=await buildSatRenderX(this.gl,'./src/shaders/satShaderX/vert.glsl','./src/shaders/satShaderX/frag.glsl',{
            uniforms:['uInputTexture'],
            attribs:["a_position","a_texCoord"]
        })
        this.satRenderY=await buildSatRenderY(this.gl,'./src/shaders/satShaderY/vert.glsl','./src/shaders/satShaderY/frag.glsl',{
            uniforms:['uInputTexture'],
            attribs:["a_position","a_texCoord"]
        })
    }
    addLight(light) {
        this.lights.push({
            entity: light,
            meshRender: new MeshRender(this.gl, light.mesh, light.mat)
        });
    }
    addMeshRender(mesh,name) { 
        this.meshes.push(mesh);    
        this.names.push(name) ;        
                
    }
    addShadowMeshRender(mesh) { this.shadowMeshes.push(mesh); }


    // 添加time, deltaime参数
    render(time, deltaime) {
    
        const gl = this.gl;

        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things

        console.assert(this.lights.length != 0, "No light");
        //console.assert(this.lights.length == 1, "Multiple lights"); 

        for (let i = 0; i < this.meshes.length; i++) {
            if(this.meshes[i].mesh.count > 10)
            {
                //this.meshes[i].mesh.transform.rotate[1] = this.meshes[i].mesh.transform.rotate[1] + degrees2Radians(10) * deltaime;
                //this.meshes[i].mesh.transform.translate[2]=this.meshes[i].mesh.transform.translate[2] + 0.5 * deltaime
                //this.meshes[i].mesh.transform.translate[0]=this.meshes[i].mesh.transform.translate[0] + 1 * deltaime

                //console.log(deltaime)
            }
            if(this.names[i]=="mario"){
                this.meshes[i].mesh.transform.rotate[1] = this.meshes[i].mesh.transform.rotate[1] + degrees2Radians(10) * deltaime;
            }
            else if(this.names[i]=="container"){
                // 绕原点旋转
                let speed = 0.001
                let radius=40
                this.meshes[i].mesh.transform.translate[0]=radius*Math.cos(time*speed)
                this.meshes[i].mesh.transform.translate[2]=radius*Math.sin(time*speed)
                
            }
            else if(this.names[i]=="ball"){
                let speed=20
                if(this.ballUp==1 && this.meshes[i].mesh.transform.translate[1]>=65){
                    this.ballUp=0
                }
                if(this.meshes[i].mesh.transform.translate[1]<=30 && this.ballUp==0){
                    this.ballUp=1
                }
                if(this.ballUp==1){
                    this.meshes[i].mesh.transform.translate[1]+=speed*deltaime
                }
                else{
                    this.meshes[i].mesh.transform.translate[1]-=speed*deltaime
                }
            }
        }
        

        for (let l = 0; l < this.lights.length; l++) {

            
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.lights[l].entity.fbo); 
            gl.clearColor(1, 1, 1, 1); 
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
            

            
            let lightRotateSpped = [0,0,0,0]
            let lightPos = this.lights[l].entity.lightPos;
            lightPos = vec3.rotateY(lightPos, lightPos, this.lights[l].entity.focalPoint, degrees2Radians(lightRotateSpped[l]) * deltaime);
            this.lights[l].entity.lightPos = lightPos; 
            this.lights[l].meshRender.mesh.transform.translate = lightPos;
            


            this.lights[l].meshRender.draw(this.camera);
            

            // Shadow pass
            if (this.lights[l].entity.hasShadowMap == true) {
                for (let i = 0; i < this.shadowMeshes.length; i++) {
                    if(this.shadowMeshes[i].material.lightIndex != l)
                        continue;// 是当前光源的材质才绘制，否则跳过
                    //  每帧更新shader中uniforms的LightMVP
                    this.gl.useProgram(this.shadowMeshes[i].shader.program.glShaderProgram);
                    let translation = this.shadowMeshes[i].mesh.transform.translate;
                    let rotation = this.shadowMeshes[i].mesh.transform.rotate;
                    let scale = this.shadowMeshes[i].mesh.transform.scale;
                    let lightMVP = this.lights[l].entity.CalcLightMVP(translation, rotation, scale);
                    this.shadowMeshes[i].material.uniforms.uLightMVP = { type: 'matrix4fv', value: lightMVP };
                    this.shadowMeshes[i].draw(this.camera);
                
                }
            }

            //SAT pass
            if(this.useSat==true){
                this.satRenderX.draw(this.lights[l].entity)
                this.satRenderY.draw(this.lights[l].entity)
            }
            

            /*
            gl.bindFramebuffer(gl.FRAMEBUFFER,this.lights[l].entity.satBuffer)
            gl.useProgram(this.satShader.program.glShaderProgram);
            gl.viewport(0.0, 0.0, resolution, resolution);
            gl.enableVertexAttribArray(this.satShader.program.attribs['aVertexPosition'])
            var positionBuffer=gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                0.0,  0.0,
                resolution,  0.0,
                0.0,  resolution,
                0.0,  resolution,
                resolution,  0.0,
                resolution,  resolution,
            ]), gl.STATIC_DRAW);
            // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            var size = 2;          // 2 components per iteration
            var type = gl.FLOAT;   // the data is 32bit floats
            var normalize = false; // don't normalize the data
            var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
            var offset = 0;        // start at the beginning of the buffer
            gl.vertexAttribPointer(
                this.satShader.program.attribs['aVertexPosition'], size, type, normalize, stride, offset);
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D,this.lights[l].entity.fbo.texture);
            gl.uniform1i(this.satShader.program.uniforms['uInputTexture'],0)

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            var pixels = new Float32Array(resolution * resolution * 4); // 每个像素RGBA，所以乘以4
            gl.readPixels(0, 0, resolution, resolution, gl.RGBA, gl.FLOAT, pixels);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.lights[l].entity.fbo);
            //var attachedTexture0 = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);

            var pixels0 = new Float32Array(resolution * resolution * 4); // 每个像素RGBA，所以乘以4
            gl.readPixels(0, 0, resolution, resolution, gl.RGBA, gl.FLOAT, pixels0);
             */
            //  非第一个光源Pass时进行一些设置（Base Pass和Additional Pass区分）
            //var attachedTexture = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);


            if(l != 0)
            {
                // 开启混合，把Additional Pass混合到Base Pass结果上，否则会覆盖Base Pass的渲染结果
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
            }


            // Camera pass
            for (let i = 0; i < this.meshes.length; i++) {
                if(this.meshes[i].material.lightIndex != l)
                    continue;// 是当前光源的材质才绘制，否则跳过
                this.gl.useProgram(this.meshes[i].shader.program.glShaderProgram);
                //  每帧更新shader中uniforms参数
                // this.gl.uniform3fv(this.meshes[i].shader.program.uniforms.uLightPos, this.lights[l].entity.lightPos); //这里改用下面写法
                let translation = this.meshes[i].mesh.transform.translate;
                let rotation = this.meshes[i].mesh.transform.rotate;
                let scale = this.meshes[i].mesh.transform.scale;
                let lightMVP = this.lights[l].entity.CalcLightMVP(translation, rotation, scale);
                this.meshes[i].material.uniforms.uLightMVP = { type: 'matrix4fv', value: lightMVP };
                this.meshes[i].material.uniforms.uLightPos = { type: '3fv', value: this.lights[l].entity.lightPos }; // 光源方向计算、光源强度衰减
                this.meshes[i].draw(this.camera);
            }

            //  还原Additional Pass的设置
            gl.disable(gl.BLEND);
        }
    }
}