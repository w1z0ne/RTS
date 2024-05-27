precision mediump float;
uniform sampler2D uInputTexture;

varying vec2 v_texCoord;
#define RESOLUTION 2048
void main() {

    vec2 texCoord = gl_FragCoord.xy /vec2(RESOLUTION);
    vec2 sum = vec2(0.0);

        for (int y = 0; y <= RESOLUTION; y++) {

                if(y <= int(gl_FragCoord.y) ){
                    sum += (texture2D(uInputTexture, vec2(gl_FragCoord.x,y ) / vec2(RESOLUTION))).xy;
                }


        }

      //gl_FragColor = vec4(texture2D(uInputTexture, vec2(gl_FragCoord.x, gl_FragCoord.y) / vec2(RESOLUTION)));
    gl_FragColor = vec4(sum,0,1);
    //gl_FragColor = vec4(sum/vec2(RESOLUTION),0,1);
    //gl_FragColor=vec4(gl_FragCoord.xy/vec2(RESOLUTION),0,1);
    //gl_FragColor=vec4(10,0,10,1);
    //gl_FragColor=texture2D(uInputTexture,v_texCoord);
    //gl_FragColor=texture2D(uInputTexture,vec2(0.5,0.5));
    //gl_FragColor=vec4(v_texCoord,0,1);
}