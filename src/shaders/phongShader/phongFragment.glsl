#ifdef GL_ES
precision mediump float;
#endif

// Phong related variables
uniform sampler2D uSampler;
uniform sampler2D uSat;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightIntensity;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;

// Shadow map related variables
#define NUM_SAMPLES 50
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES
#define NUM_RINGS 10

//
#define SHADOW_MAP_SIZE 2048.
#define RESOLUTION SHADOW_MAP_SIZE
#define FILTER_RADIUS 10.
#define FRUSTUM_SIZE 400.
#define NEAR_PLANE 0.01
#define LIGHT_WORLD_SIZE 5.
#define LIGHT_SIZE_UV LIGHT_WORLD_SIZE / FRUSTUM_SIZE


#define EPS 1e-3
#define PI 3.141592653589793
#define PI2 6.283185307179586

uniform sampler2D uShadowMap;

varying vec4 vPositionFromLight;

highp float rand_1to1(highp float x ) { 
  // -1 -1
  return fract(sin(x)*10000.0);
}

highp float rand_2to1(vec2 uv ) { 
  // 0 - 1
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

float unpack(vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    return dot(rgbaDepth, bitShift);
}

float unpack2(vec4 rgbaDepth){
    return rgbaDepth.r;
}

vec2 poissonDisk[NUM_SAMPLES];

void poissonDiskSamples( const in vec2 randomSeed ) {

  float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
  float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

  float angle = rand_2to1( randomSeed ) * PI2;
  float radius = INV_NUM_SAMPLES;
  float radiusStep = radius;

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( radius, 0.75 );
    radius += radiusStep;
    angle += ANGLE_STEP;
  }
}

void uniformDiskSamples( const in vec2 randomSeed ) {

  float randNum = rand_2to1(randomSeed);
  float sampleX = rand_1to1( randNum ) ;
  float sampleY = rand_1to1( sampleX ) ;

  float angle = sampleX * PI2;
  float radius = sqrt(sampleY);

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( radius * cos(angle) , radius * sin(angle)  );

    sampleX = rand_1to1( sampleY ) ;
    sampleY = rand_1to1( sampleX ) ;

    angle = sampleX * PI2;
    radius = sqrt(sampleY);
  }
}

//
//自适应Shadow Bias算法 https://zhuanlan.zhihu.com/p/370951892
float getShadowBias(float c, float filterRadiusUV){
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPos - vFragPos);
  float fragSize = (1. + ceil(filterRadiusUV)) * (FRUSTUM_SIZE / SHADOW_MAP_SIZE / 2.);
  return max(fragSize, fragSize * (1.0 - dot(normal, lightDir))) * c;
}





vec4 showShadowMap(sampler2D shadowMap, vec4 shadowCoord){
  // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
  vec4 closestDepthVec = texture2D(shadowMap, shadowCoord.xy);

  return closestDepthVec;
}

//
float useShadowMap(sampler2D shadowMap, vec4 shadowCoord, float biasC, float filterRadiusUV){
  float depth = unpack2(texture2D(shadowMap, shadowCoord.xy));
  float cur_depth = shadowCoord.z;
  float bias = getShadowBias(biasC, filterRadiusUV);
  //float bias=0;
  if(cur_depth - bias >= depth + EPS){
    return 0.;
  }
  else{
    return 1.0;
  }
}


//
float PCF(sampler2D shadowMap, vec4 coords, float biasC, float filterRadiusUV) {
  //uniformDiskSamples(coords.xy);
  poissonDiskSamples(coords.xy); //使用xy坐标作为随机种子生成
  float visibility = 0.0;
  for(int i = 0; i < NUM_SAMPLES; i++){
    vec2 offset = poissonDisk[i] * filterRadiusUV;
    float shadowDepth = useShadowMap(shadowMap, coords + vec4(offset, 0., 0.), biasC, filterRadiusUV);
    if(coords.z > shadowDepth + EPS){
      visibility++;
    }
  }
  return 1.0 - visibility / float(NUM_SAMPLES);
}


//
float findBlocker(sampler2D shadowMap, vec2 uv, float zReceiver) {
  int blockerNum = 0;
  float blockDepth = 0.;

  float posZFromLight = vPositionFromLight.z;

  float searchRadius = LIGHT_SIZE_UV * (posZFromLight - NEAR_PLANE) / posZFromLight;

  poissonDiskSamples(uv);
  for(int i = 0; i < NUM_SAMPLES; i++){
    float shadowDepth = unpack(texture2D(shadowMap, uv + poissonDisk[i] * searchRadius));
    if(zReceiver > shadowDepth){
      blockerNum++;
      blockDepth += shadowDepth;
    }
  }

  if(blockerNum == 0)
    return -1.;
  else
    return blockDepth / float(blockerNum);
}


//
float PCSS(sampler2D shadowMap, vec4 coords, float biasC){
  float zReceiver = coords.z;

  // STEP 1: avgblocker depth 
  float zBlocker = findBlocker(shadowMap, coords.xy, zReceiver);

  //if(avgBlockerDepth < -EPS)
    //return 1.0;
  if(zBlocker < EPS) return 1.0;
  if(zBlocker > 1.0) return 0.0;

  // STEP 2: penumbra size
  float penumbra = (zReceiver - zBlocker) * LIGHT_SIZE_UV / zBlocker;
  float filterRadiusUV = penumbra;

  // STEP 3: filtering
  return PCF(shadowMap, coords, biasC, filterRadiusUV);
}



//根据sat获得深度期望和方差
vec4 getSAT(float wPenumbra, vec3 projCoords){
    // wPnumbra：半影在shadowmap上的面积
    
    float stride =1.0 ;
    float xmax = projCoords.x + wPenumbra * stride;
    float xmin = projCoords.x - wPenumbra * stride;
    float ymax = projCoords.y + wPenumbra * stride;
    float ymin = projCoords.y - wPenumbra * stride;
    vec4 A = texture2D(uSat, vec2(xmin, ymin));
    vec4 B = texture2D(uSat, vec2(xmax, ymin));
    vec4 C = texture2D(uSat, vec2(xmin, ymax));
    vec4 D = texture2D(uSat, vec2(xmax, ymax));
    float sPenumbra = 2.0 * wPenumbra*RESOLUTION;
    vec4 areaAvg = (D + A - B - C) / float(sPenumbra * sPenumbra);
    return areaAvg;
}

vec4 test(){
  return vec4(0,0,0,0);
}

float chebyshev(vec2 moments, float currentDepth){
  
  if (currentDepth <= moments.x+0.018) {
		return 1.0;
	}
  
	// calculate variance from mean.
	float variance = moments.y - (moments.x * moments.x);
  //return variance;  
	variance = max(variance, 0.0001);
	float d = currentDepth - moments.x;
	float p_max = variance / (variance + d * d);
	return p_max;
}

float VSSM(sampler2D shadowMap, vec4 coords, float biasC){

  
  
  //计算平均遮挡深度
  float posZFromLight = vPositionFromLight.z;
    float zReceiver = coords.z;
    //float searchRadius =0.003;
    float searchRadius = LIGHT_SIZE_UV * (posZFromLight - NEAR_PLANE) / posZFromLight;
    float currentDepth = coords.z ;
    vec4 moments = getSAT(float(searchRadius), coords.xyz);
    float averageDepth = moments.x;
	  float t = chebyshev(moments.xy, currentDepth); 
    //t=max(t,0.001);
    float zBlocker = (averageDepth - t * (currentDepth )) / (1.0 - t);
    
    //if(avgBlockerDepth < -EPS)
      //return 1.0;
      //if(zBlocker<0.0)return 1.0;
    //if(zBlocker < 1.0) return 1.0;
    //if(zBlocker > 1.0) return 0.0;

    // STEP 2: penumbra size
    float penumbra = (currentDepth - zBlocker) * LIGHT_SIZE_UV / zBlocker;
    float filterRadiusUV = penumbra;

    // STEP 3: filtering
    vec4 areaAvg = getSAT(penumbra, coords.xyz);
    return chebyshev(areaAvg.xy, zReceiver);
    
    
    
}
float fma(float x, float y, float z)
{
  return x*y+z;
}

float calculateMSMHamburger(vec4 moments, float frag_depth, float depth_bias, float moment_bias)
{
    // Bias input data to avoid artifacts
    vec4 b = mix(moments, vec4(0.5, 0.5, 0.5, 0.5), moment_bias);
    vec3 z;
    z[0] = frag_depth - depth_bias;

    // Compute a Cholesky factorization of the Hankel matrix B storing only non-
    // trivial entries or related products
    float L32D22 = fma(-b[0], b[1], b[2]);
    float D22 = fma(-b[0], b[0], b[1]);
    float squaredDepthVariance = fma(-b[1], b[1], b[3]);
    float D33D22 = dot(vec2(squaredDepthVariance, -L32D22), vec2(D22, L32D22));
    float InvD22 = 1.0 / D22;
    float L32 = L32D22 * InvD22;

    // Obtain a scaled inverse image of bz = (1,z[0],z[0]*z[0])^T
    vec3 c = vec3(1.0, z[0], z[0] * z[0]);

    // Forward substitution to solve L*c1=bz
    c[1] = c[1] - b.x;
    c[2] = c[2] - b.y + L32 * c[1];

    // Scaling to solve D*c2=c1
    c[1] = c[1] * InvD22;
    c[2] = c[2] * D22 / D33D22;

    // Backward substitution to solve L^T*c3=c2
    c[1] = c[1] - L32 * c[2];
    c[0] = c[0] - dot(c.yz, b.xy);

    // Solve the quadratic equation c[0]+c[1]*z+c[2]*z^2 to obtain solutions
    // z[1] and z[2]
    float p = c[1] / c[2];
    float q = c[0] / c[2];
    float D = (p * p * 0.25) - q;
    float r = sqrt(D);
    z[1] = - p * 0.5 - r;
    z[2] = - p * 0.5 + r;

    // Compute the shadow intensity by summing the appropriate weights
    vec4 switchVal = (z[2] < z[0]) ? vec4(z[1], z[0], 1.0, 1.0) :
                      ((z[1] < z[0]) ? vec4(z[0], z[1], 0.0, 1.0) :
                      vec4(0.0,0.0,0.0,0.0));
    float quotient = (switchVal[0] * z[2] - b[0] * (switchVal[0] + z[2]) + b[1])/((z[2] - switchVal[1]) * (z[0] - z[1]));
    float shadowIntensity = switchVal[2] + switchVal[3] * quotient;
    return 1.0 - clamp(shadowIntensity, 0.0, 1.0);
}


float MSM(sampler2D shadowMap, vec4 coords){
  
  //float bias = getShadowBias(0.005, FILTER_RADIUS / SHADOW_MAP_SIZE);
  float bias=0.02;
  float posZFromLight = vPositionFromLight.z;
  float zReceiver = coords.z;
    
  float searchRadius = LIGHT_SIZE_UV * (posZFromLight - NEAR_PLANE) / posZFromLight;
  float currentDepth = coords.z;
  vec4 moments = getSAT(float(searchRadius), coords.xyz);

  return calculateMSMHamburger(moments, currentDepth,bias,0.0003);
}

    
    


vec3 blinnPhong() {
  vec3 color = texture2D(uSampler, vTextureCoord).rgb;
  color = pow(color, vec3(2.2));

  vec3 ambient = 0.05 * color;

  vec3 lightDir = normalize(uLightPos);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 light_atten_coff =
      uLightIntensity / pow(length(uLightPos - vFragPos), 2.0);
  vec3 diffuse = diff * light_atten_coff * color;

  vec3 viewDir = normalize(uCameraPos - vFragPos);
  vec3 halfDir = normalize((lightDir + viewDir));
  float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
  vec3 specular = uKs * light_atten_coff * spec;

  vec3 radiance = (ambient + diffuse + specular);
  vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
  return phongColor;
}




void main(void) {
  //
  //vPositionFromLight为光源空间下投影的裁剪坐标，除以w结果为NDC坐标
  vec3 shadowCoord = vPositionFromLight.xyz / vPositionFromLight.w;
  //把[-1,1]的NDC坐标转换为[0,1]的坐标
  shadowCoord.xyz = (shadowCoord.xyz + 1.0) / 2.0;

  float visibility = 1.;

  // 无PCF时的Shadow Bias
  float nonePCFBiasC = .1;
  // 有PCF时的Shadow Bias
  float pcfBiasC = .08;
  // PCF的采样范围，因为是在Shadow Map上采样，需要除以Shadow Map大小，得到uv坐标上的范围
  float filterRadiusUV = FILTER_RADIUS / SHADOW_MAP_SIZE;

  // 硬阴影无PCF，最后参数传0
  //visibility = useShadowMap(uShadowMap, vec4(shadowCoord, 1.0), nonePCFBiasC, 0.);
  //visibility = PCF(uShadowMap, vec4(shadowCoord, 1.0), pcfBiasC, filterRadiusUV);
  //visibility = PCSS(uShadowMap, vec4(shadowCoord, 1.0), pcfBiasC);
  //visibility=useOriginShadowMap(uShadowMap, vec4(shadowCoord, 1.0));
  vec3 phongColor = blinnPhong();
  
  //visibility=1.0-getShadow_VSSM(shadowCoord);
  //vec4 shadowDepth=showShadowMap(uShadowMap, vec4(shadowCoord, 1.0));
  
  //gl_FragColor=vec4(shadowCoord,1.0);
  
  //使用VSSM时需同时将webglrender的useSat设置为true（第9行），如果卡，可以在engine.js中降低帧率限制（调整103行的interval）
  
  visibility=VSSM(uShadowMap, vec4(shadowCoord, 1.0), pcfBiasC);
  //visibility=test_VSSM(uShadowMap, vec4(shadowCoord, 1.0), pcfBiasC).x;
  //visibility = MSM(uShadowMap, vec4(shadowCoord, 1.0));
 //visibility=MSM(uShadowMap, vec4(shadowCoord, 1.0));
  gl_FragColor=vec4(phongColor*visibility,1.0);
  
  
  
}