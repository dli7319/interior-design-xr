import * as xb from "xrblocks";
import * as THREE from "three";

function setupPrintingEffect(customUniforms, material) {
  // Important: Render both sides so the object doesn't look invisible from the inside
  material.side = THREE.DoubleSide;

  // Hook into the compilation process
  material.onBeforeCompile = (shader) => {
    // Link our custom uniforms to the shader's uniforms
    shader.uniforms.uPrintHeight = customUniforms.uPrintHeight;
    shader.uniforms.uPrintColor = customUniforms.uPrintColor;
    shader.uniforms.uBorderWidth = customUniforms.uBorderWidth;

    // --- VERTEX SHADER MODIFICATION ---

    // 1. Declare the varying variable to pass position to fragment shader
    shader.vertexShader = `
      varying vec3 vWorldPosition;
      ${shader.vertexShader}
    `;

    // 2. Calculate the world position
    // We replace the standard '#include <worldpos_vertex>' chunk
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `
      vec4 worldPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        worldPosition = instanceMatrix * worldPosition;
      #endif
      worldPosition = modelMatrix * worldPosition;
      
      // Store it in our varying
      vWorldPosition = worldPosition.xyz;
      `
    );

    // --- FRAGMENT SHADER MODIFICATION ---

    // 1. Declare uniforms and varying
    shader.fragmentShader = `
      uniform float uPrintHeight;
      uniform vec3 uPrintColor;
      uniform float uBorderWidth;
      varying vec3 vWorldPosition;
      ${shader.fragmentShader}
    `;

    // 2. Inject the discard and glow logic
    // We inject this BEFORE lighting calculations (e.g., before <clipping_planes_fragment>)
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      `
      // If the pixel is above the print height, throw it away
      if (vWorldPosition.y > uPrintHeight) discard;

      // Calculate distance to the cut
      float printDiff = uPrintHeight - vWorldPosition.y;

      // Add a glowing rim if we are within the border width
      vec3 printEmission = vec3(0.0);
      if (printDiff < uBorderWidth) {
         // Smooth gradient for the glow
         float intensity = smoothstep(uBorderWidth, 0.0, printDiff);
         printEmission = uPrintColor * intensity * 2.0; // * 2.0 for bloom intensity
      }
      
      #include <clipping_planes_fragment>
      `
    );

    // 3. Apply the emission to the final output color
    // We add our emission at the very end of the shader
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
      #include <dithering_fragment>
      gl_FragColor.rgb += printEmission;
      `
    );
  };
}

export class SpawnInEffect extends xb.Script {
  constructor(model) {
    super();
    // 1. Define the customization data
    const customUniforms = {
      uPrintHeight: { value: 0.0 }, // Current height of the printer
      uPrintColor: { value: new THREE.Color(0xffaa00) }, // "Hot" filament color
      uBorderWidth: { value: 0.1 }, // Thickness of the glowing edge
    };
    model.traverse((child) => {
      if (child.isMesh) {
        setupPrintingEffect(customUniforms, child.material);
      }
    });
    this.customUniforms = customUniforms;

    const box = new THREE.Box3().setFromObject(model);
    this.minY = box.min.y;
    this.maxY = box.max.y;
    this.startTime = Date.now();
  }

  update() {
    // Animate the height from bottom to top
    const elapsedTime = Date.now() - this.startTime;
    // Oscillate or just loop
    const progress = 0.0001 * elapsedTime;
    this.customUniforms.uPrintHeight.value = THREE.MathUtils.lerp(
      this.minY,
      this.maxY,
      progress
    );
  }
}
