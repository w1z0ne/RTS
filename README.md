# 实时阴影大作业

本次作业中，本小组在webgl框架下实现了shadow map,PCF,PCSS.并在此基础上增加了多光源，动态物体的支持。此外，还实现了VSSM的效果

## shadow map

## PCF

## PCSS

## 多光源

## 动态物体

## VSSM

为解决PCSS第一步和第三步慢的问题，VSSM使用切比雪夫不等式，通过提前存储每个像素的深度的期望和二阶矩，构建MIPMAP或SAT（Summed Area Table）。可以做到在O(1)的时间内估计目标区域内的平均遮挡物深度和目标点的visibility。具体细节见GAMES202对应章节。
![alt text](image.png)

本小组实现了基于二维SAT的VSSM算法（SAT存储了左上角到当前像素的矩形区域内所有shadow map值的和，使用下图的方法可以进行快速区域查询）。但目前由于对计算着色器等高效实现方法了解不深，选择在着色器中引入循环，累加来实现SAT。这种方式并不高效，因此反而速度会较低（在4070可以60帧流畅，集显上大概10帧）。
![alt text](image-1.png)

具体实现：实现了两组新的着色器，在shadow pass生成的shadow map中第一个通道存储深度，第二个通道存储深度的平方。首先对shadow map沿x轴方向累加（见shaders/satShaderX）生成新的frame buffer，再根据此结果沿y轴方向累加（shaders/satShaderY）。最后将新的结果绑定到光源上，作为`phongFragment.glsl`的uniform变量`uSat`，在这个着色器中按照VSSM公式计算visibility。

为开启VSSM功能，需要再`webglrender`类中将`useSat`置为true（不用时置为false以加快速度），同时在`phongFragment.glsl`里留下调用`VSSM`函数的代码。

