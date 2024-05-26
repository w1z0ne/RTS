precision mediump float;
uniform sampler2D uInputTexture;

#define RESOLUTION 2048
void main() {
    vec2 texCoord = gl_FragCoord.xy /vec2(RESOLUTION);
    vec2 sum = vec2(0.0);

        for (int x = 0; x <= int(gl_FragCoord.x); x++) {
            for(int y=0;y<=int(gl_FragCoord.y);y++){
                sum += (texture2D(uInputTexture, vec2(x, y) / vec2(RESOLUTION))).xy;
            }

        }

    gl_FragColor = vec4(sum,0,1);
}