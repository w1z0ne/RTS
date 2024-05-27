class SatRenderX{

    constructor(gl,shader) {

        this.gl = gl;
        this.texcoordBuffer=gl.createBuffer();
        this.positionBuffer=gl.createBuffer();
        this.shader=shader
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            0.0,  1.0,
            1.0,  0.0,
            1.0,  1.0,
        ]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            0.0,  1.0,
            1.0,  0.0,
            1.0,  1.0,
        ]), gl.STATIC_DRAW);
    }

    draw(light){
        let fb=light.satBuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,fb)
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        this.gl.useProgram(this.shader.program.glShaderProgram);
        var positionLocation = this.gl.getAttribLocation(this.shader.program.glShaderProgram, "a_position");
        var texcoordLocation = this.gl.getAttribLocation(this.shader.program.glShaderProgram, "a_texCoord");
        // Turn on the position attribute
        this.gl.enableVertexAttribArray(positionLocation);

        // Bind the position buffer.
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

        this.gl.vertexAttribPointer(
            positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Turn on the texcoord attribute
        this.gl.enableVertexAttribArray(texcoordLocation);

        // bind the texcoord buffer.
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);
        this.gl.vertexAttribPointer(
            texcoordLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0)
        this.gl.bindTexture(this.gl.TEXTURE_2D, light.fbo.texture);
        const textureLocation = this.gl.getUniformLocation(this.shader.program.glShaderProgram, 'uInputTexture');
        this.gl.uniform1i(textureLocation, 0);
        this.gl.drawArrays(this.gl.TRIANGLES,0,6)

        //var pixels = new Float32Array(resolution * resolution * 4); // 每个像素RGBA，所以乘以4
        //this.gl.readPixels(0, 0, resolution, resolution, this.gl.RGBA, this.gl.FLOAT, pixels);
    }

}

async function buildSatRenderX(gl,vertexPath, fragmentPath,shaderLocations) {


    let vertexShader = await getShaderString(vertexPath);
    let fragmentShader = await getShaderString(fragmentPath);
    // 添加rotate、lightIndex参数
    let shader= new Shader(gl,vertexShader,fragmentShader,shaderLocations);
    return new SatRenderX(gl,shader)

}